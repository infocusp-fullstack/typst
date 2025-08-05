import { getBrowserClient } from "./supabaseClient";
import { Project } from "@/types";

const DEFAULT_CONTENT = ``;
const PAGE_SIZE = 20;

/* ---------- Fetch user projects with pagination ---------- */
export async function fetchUserProjects(
  page: number = 0,
  pageSize: number = PAGE_SIZE
): Promise<{ projects: Project[]; hasMore: boolean; totalCount: number }> {
  try {
    const supabase = getBrowserClient();

    const { data, count, error } = await supabase
      .from("projects")
      .select("*", { count: "exact" }) // 👈 count included in same query
      .order("updated_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    const projects = (data as Project[]) || [];
    const hasMore = (page + 1) * pageSize < (count || 0);

    return {
      projects,
      hasMore,
      totalCount: count || 0,
    };
  } catch (error) {
    throw error;
  }
}

export async function searchUserProjects(
  searchQuery: string,
  page: number = 0,
  pageSize: number = PAGE_SIZE
): Promise<{ projects: Project[]; hasMore: boolean; totalCount: number }> {
  try {
    const supabase = getBrowserClient();

    const { data, count, error } = await supabase
      .from("projects")
      .select("*", { count: "exact" }) // 👈 count with data
      .ilike("title", `%${searchQuery.trim()}%`)
      .order("updated_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      throw new Error(`Failed to search projects: ${error.message}`);
    }

    const projects = (data as Project[]) || [];
    const hasMore = (page + 1) * pageSize < (count || 0);

    return {
      projects,
      hasMore,
      totalCount: count || 0,
    };
  } catch (error) {
    throw error;
  }
}

export async function fetchUserProjectById(
  projectId: string
): Promise<Project | null> {
  try {
    const supabase = getBrowserClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return data as Project;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/* ---------- Load project file ---------- */
export async function loadProjectFile(path: string): Promise<string> {
  try {
    const supabase = getBrowserClient();

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("user-projects")
      .createSignedUrl(path, 60); // 60 seconds

    if (urlError || !signedUrlData?.signedUrl) {
      throw new Error(`Signed URL error: ${urlError?.message}`);
    }

    const response = await fetch(signedUrlData.signedUrl, {
      method: "GET",
      cache: "no-store", // bypass browser cache
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch {
    return DEFAULT_CONTENT;
  }
}

/* ---------- Create new project with initial file ---------- */
export async function createNewProject(
  userId: string,
  title: string = "Untitled Document"
): Promise<Project> {
  try {
    const projectId = crypto.randomUUID();
    const typPath = `${userId}/${projectId}/main.typ`;

    const supabase = getBrowserClient();

    // 1. Create database entry first
    const { data, error: dbError } = await supabase
      .from("projects")
      .insert([
        {
          id: projectId,
          user_id: userId,
          title,
          typ_path: typPath,
        },
      ])
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // 2. Create initial file with default content
    const { error: fileError } = await supabase.storage
      .from("user-projects")
      .upload(typPath, new Blob([DEFAULT_CONTENT], { type: "text/plain" }), {
        contentType: "text/plain",
      });

    if (fileError) {
      // Clean up database entry if file creation fails
      await supabase.from("projects").delete().eq("id", projectId);
      throw new Error(`File creation failed: ${fileError.message}`);
    }

    return data as Project;
  } catch (error) {
    throw error;
  }
}

/* ---------- Save project file ---------- */
export async function saveProjectFile(
  projectId: string,
  typPath: string,
  code: string
): Promise<void> {
  try {
    const supabase = getBrowserClient();

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("user-projects")
      .upload(typPath, new Blob([code], { type: "text/plain" }), {
        upsert: true,
        contentType: "text/plain",
      });

    if (uploadError) {
      throw new Error(`File upload failed: ${uploadError.message}`);
    }

    // Update database timestamp
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (updateError) {
      // Non-critical error, don't throw
    }
  } catch (error) {
    throw error;
  }
}

/* ---------- Delete project ---------- */
export async function deleteProject(
  projectId: string,
  typPath: string
): Promise<void> {
  try {
    const supabase = getBrowserClient();

    // Delete file from storage first
    const { error: storageError } = await supabase.storage
      .from("user-projects")
      .remove([typPath]);

    if (storageError) {
      throw new Error(`Storage delete failed: ${storageError.message}`);
    }

    // Delete database entry
    const { error: dbError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (dbError) {
      throw new Error(`Database delete failed: ${dbError.message}`);
    }
  } catch (error) {
    throw error;
  }
}

/* ---------- Check storage access ---------- */
export async function checkStorageAccess(): Promise<boolean> {
  try {
    const supabase = getBrowserClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      return false;
    }

    // Test if we can access files in the user-projects bucket
    const testPath = `${user.user.id}/test-${Date.now()}/connectivity-test.txt`;
    const testContent = "Storage connectivity test";

    const { error: uploadError } = await supabase.storage
      .from("user-projects")
      .upload(testPath, new Blob([testContent], { type: "text/plain" }));

    if (uploadError) {
      if (uploadError.message.includes("Bucket not found")) {
        return false;
      }

      if (
        uploadError.message.includes("permission") ||
        uploadError.message.includes("policy")
      ) {
        return true;
      }

      return false;
    }

    await supabase.storage.from("user-projects").remove([testPath]);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message && error.message.includes("Bucket not found")) {
        return false;
      }
    }
    return true;
  }
}
