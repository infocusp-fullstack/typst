// supabase/functions/index_all_projects/index.ts
// This Edge Function re-indexes all projects (or just resumes) for search.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- Chunking ----
function chunkText(text: string, chunkSize = 200, overlap = 10) {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  return chunks;
}

// ---- Typst cleanup ----
function extractTextFromTypst(content: string) {
  return content
    .replace(/[#=*`]/g, " ")
    .replace(/\$.*?\$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ---- 1. Fetch all projects (or only resumes) ----
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, typ_path")
      .eq("project_type", "resume"); // 🔥 remove this line if you want ALL

    if (error) throw error;

    let totalChunks = 0;

    for (const project of projects) {
      try {
        // ---- 2. Download file ----
        const { data: file, error: downloadError } =
          await supabase.storage.from("user-projects").download(project.typ_path);

        if (downloadError || !file) {
  console.error("Download failed:", {
    projectId: project.id,
    path: project.typ_path,
    error: downloadError?.message,
  });
  continue;
}

        const rawText = await file.text();
        const cleanText = extractTextFromTypst(rawText);

        // ---- 3. Chunk ----
        const chunks = chunkText(cleanText);

        const rows = chunks.map((chunk, i) => ({
          project_id: project.id,
          chunk,
          chunk_index: i,
        }));

        // ---- 4. Delete old chunks ----
        await supabase
          .from("projects_search")
          .delete()
          .eq("project_id", project.id);

        // ---- 5. Insert (batched) ----
        const batchSize = 500;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);

          const { error } = await supabase
            .from("projects_search")
            .insert(batch);

          if (error) throw error;
        }

        totalChunks += rows.length;

        console.log(`Indexed project ${project.id} (${rows.length} chunks)`);
      } catch (err) {
        console.error(`Failed project ${project.id}:`, err.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        projectsProcessed: projects.length,
        totalChunks,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
});