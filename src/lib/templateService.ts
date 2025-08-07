import { Template } from "@/types";
import { getBrowserClient } from "./supabaseClient";

export async function loadTemplateFromStorage(
  storagePath: string,
): Promise<string> {
  try {
    const supabase = getBrowserClient();

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("user-projects")
      .createSignedUrl(storagePath, 300); // 5 minutes expiration

    if (urlError || !signedUrlData?.signedUrl) {
      throw new Error(`Failed to get template URL: ${urlError?.message}`);
    }

    const response = await fetch(signedUrlData.signedUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.text();
  } catch (error) {
    console.error(`Failed to load template: ${storagePath}`, error);
    throw new Error(`Template file not found: ${storagePath}`);
  }
}

// Fetch all active templates
export async function fetchAvailableTemplates(): Promise<Template[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as unknown as Template[];
}

export async function createTemplateInStorage(
  title: string,
  description: string,
  category: string,
  typContent: string,
  fileName?: string,
): Promise<Template> {
  const supabase = getBrowserClient();

  const safeCategory = category || "resume";
  const finalFileName =
    fileName || `${title.toLowerCase().replace(/\s+/g, "-")}.typ`;
  const storagePath = `templates/${safeCategory}/${finalFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("user-projects")
    .upload(storagePath, new Blob([typContent], { type: "text/plain" }), {
      contentType: "text/plain",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data, error: insertError } = await supabase
    .from("templates")
    .insert([
      {
        title,
        description,
        storage_path: storagePath,
        category: safeCategory,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from("user-projects").remove([storagePath]);
    throw new Error(`DB insert failed: ${insertError.message}`);
  }

  const content = await loadTemplateFromStorage(storagePath);
  return { ...data, content } as Template;
}
