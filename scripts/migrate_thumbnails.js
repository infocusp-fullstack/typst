const supabaseModule = require("@supabase/supabase-js");

const SUPABASE_URL = "";
const SERVICE_ROLE_KEY = "";

const SOURCE_BUCKET = "user-projects";
const DEST_BUCKET = "thumbnails";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY envs",
    );
    process.exit(1);
  }
  const supabase = supabaseModule.createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1) Fetch all projects with a thumbnail_path
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, thumbnail_path")
    .not("thumbnail_path", "is", null);

  if (projectsError) {
    console.error("Failed to fetch projects:", projectsError.message);
    process.exit(1);
  }

  let copied = 0;
  let updated = 0;

  for (const p of projects ?? []) {
    const thumbPath = p.thumbnail_path;

    // Skip absolute URLs (already migrated)
    if (/^https?:\/\//i.test(thumbPath)) {
      console.log(`Skipping project: ${p.id}, thumb : ${thumbPath}`);
      continue;
    }

    // Read file from source bucket (signed URL)
    const { data: signed, error: signedErr } = await supabase.storage
      .from(SOURCE_BUCKET)
      .createSignedUrl(thumbPath, 300);
    if (signedErr || !signed?.signedUrl) {
      console.warn(`Skip ${thumbPath}: cannot sign source URL`);
      continue;
    }

    const resp = await fetch(signed.signedUrl);
    if (!resp.ok) {
      console.warn(`Skip ${thumbPath}: fetch failed ${resp.status}`);
      continue;
    }
    const blob = await resp.blob();

    if (!dryRun) {
      // Upload to destination bucket with the same path
      const { error: uploadErr } = await supabase.storage
        .from(DEST_BUCKET)
        .upload(thumbPath, blob, {
          upsert: true,
          contentType: blob.type || "image/png",
        });

      if (uploadErr) {
        console.warn(`Skip ${thumbPath}: upload failed ${uploadErr.message}`);
        continue;
      }
    }

    copied++;
    updated++;
  }

  console.log(
    `Done. Copied: ${copied}, Updated: ${updated}${dryRun ? " (dry-run)" : ""}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
