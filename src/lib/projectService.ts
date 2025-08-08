import { getAdminClient } from "@/lib/supabaseClient";
import {
  Project,
  FilterType,
  PDFContent,
  ProjectWithShares,
  Template,
} from "@/types";
import { isCXOUser } from "@/lib/sharingService";
import { generateAndUploadThumbnail } from "@/lib/thumbnailService";
import { loadTemplateFromStorage } from "@/lib/templateService";

const DEFAULT_CONTENT = ``;
const PAGE_SIZE = 20;

/* ---------- Fetch user projects with pagination and filtering ---------- */
export async function fetchUserProjects(
  page: number = 0,
  pageSize: number = PAGE_SIZE,
  filter: FilterType = "owned",
  userId: string,
): Promise<{
  projects: ProjectWithShares[];
  hasMore: boolean;
  totalCount: number;
}> {
  try {
    const supabase = getAdminClient();

    let query;

    if (filter === "owned") {
      // User's own projects
      query = supabase
        .from("projects")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
    } else if (filter === "shared") {
      // Projects shared with the user - use a join query
      query = supabase
        .from("projects")
        .select(
          `
          *,
          project_shares!inner(shared_with)
        `,
          { count: "exact" },
        )
        .eq("project_shares.shared_with", userId)
        .order("updated_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
    } else if (filter === "all") {
      const isCXO = await isCXOUser(userId);
      if (!isCXO) {
        throw new Error("Access denied: CXO privileges required");
      }
      query = supabase
        .from("projects")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
    } else {
      throw new Error("Invalid filter type");
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    // Clean up the data structure for shared projects
    const projects =
      filter === "shared"
        ? ((data as ProjectWithShares[])?.map((item) => ({
            id: item.id,
            user_id: item.user_id,
            title: item.title,
            typ_path: item.typ_path,
            thumbnail_path: item.thumbnail_path,
            created_at: item.created_at,
            updated_at: item.updated_at,
            project_shares: item.project_shares,
            project_type: item.project_type,
            template_id: item.template_id,
          })) as ProjectWithShares[]) || []
        : (data as ProjectWithShares[]) || [];

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
  pageSize: number = PAGE_SIZE,
  filter: FilterType = "owned",
  userId: string,
): Promise<{
  projects: ProjectWithShares[];
  hasMore: boolean;
  totalCount: number;
}> {
  try {
    const supabase = getAdminClient();

    let query;

    if (filter === "owned") {
      // User's own projects with search
      query = supabase
        .from("projects")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .ilike("title", `%${searchQuery.trim()}%`)
        .order("updated_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
    } else if (filter === "shared") {
      // Projects shared with the user with search
      query = supabase
        .from("projects")
        .select(
          `
          *,
          project_shares!inner(shared_with)
        `,
          { count: "exact" },
        )
        .eq("project_shares.shared_with", userId)
        .ilike("title", `%${searchQuery.trim()}%`)
        .order("updated_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
    } else if (filter === "all") {
      const isCXO = await isCXOUser(userId);
      if (!isCXO) {
        throw new Error("Access denied: CXO privileges required");
      }
      // All projects with search (CXO only)
      query = supabase
        .from("projects")
        .select("*", { count: "exact" })
        .ilike("title", `%${searchQuery.trim()}%`)
        .order("updated_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
    } else {
      throw new Error("Invalid filter type");
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to search projects: ${error.message}`);
    }

    // Clean up the data structure for shared projects
    const projects =
      filter === "shared"
        ? (data as ProjectWithShares[])?.map((item) => ({
            id: item.id,
            user_id: item.user_id,
            title: item.title,
            typ_path: item.typ_path,
            thumbnail_path: item.thumbnail_path,
            created_at: item.created_at,
            updated_at: item.updated_at,
            project_shares: item.project_shares,
            project_type: item.project_type,
            template_id: item.template_id,
          })) || []
        : (data as ProjectWithShares[]) || [];

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
  projectId: string,
): Promise<Project | null> {
  try {
    const supabase = getAdminClient();
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
export async function createProjectFromTemplate(
  userId: string,
  title: string,
  template: Template,
  projectType: "resume" | "document" = "document",
): Promise<Project> {
  const projectId = crypto.randomUUID();
  const typPath = `${userId}/${projectId}/main.typ`;
  const supabase = getAdminClient();

  const templateContent = await loadTemplateFromStorage(template.storage_path);

  const { error: uploadError } = await supabase.storage
    .from("user-projects")
    .upload(typPath, new Blob([templateContent], { type: "text/plain" }), {
      upsert: true,
      contentType: "text/plain",
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data, error: insertError } = await supabase
    .from("projects")
    .insert([
      {
        id: projectId,
        user_id: userId,
        title,
        typ_path: typPath,
        template_id: template.id,
        project_type: projectType,
      },
    ])
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);

  return data as Project;
}

export async function userHasResume(userId: string): Promise<boolean> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("project_type", "resume")
    .maybeSingle();

  return !!data && !error;
}

/* ---------- Load project file ---------- */
export async function loadProjectFile(path: string): Promise<string> {
  try {
    const supabase = getAdminClient();

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
  title: string = "Untitled Document",
): Promise<Project> {
  try {
    const projectId = crypto.randomUUID();
    const typPath = `${userId}/${projectId}/main.typ`;

    const supabase = getAdminClient();

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
  code: string,
  pdfContent?: PDFContent,
): Promise<void> {
  try {
    const supabase = getAdminClient();

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

    // Generate and upload thumbnail if PDF content is provided
    if (pdfContent) {
      try {
        const thumbnailPath = `${typPath.replace(".typ", "_thumb.png")}`;
        await generateAndUploadThumbnail(pdfContent, thumbnailPath);

        // Update database with thumbnail path
        const { error: thumbnailUpdateError } = await supabase
          .from("projects")
          .update({
            thumbnail_path: thumbnailPath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);

        if (thumbnailUpdateError) {
          console.error(
            "Failed to update thumbnail path:",
            thumbnailUpdateError,
          );
        }
      } catch (thumbnailError) {
        console.error("Thumbnail generation failed:", thumbnailError);
      }
    }
  } catch (error) {
    throw error;
  }
}

/* ---------- Rename project ---------- */
export async function renameProject(
  projectId: string,
  newTitle: string,
): Promise<Project> {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("projects")
      .update({
        title: newTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to rename project: ${error.message}`);
    }

    return data as Project;
  } catch (error) {
    throw error;
  }
}

/* ---------- Delete project ---------- */
export async function deleteProject(
  projectId: string,
  typPath: string,
  thumbnail_path?: string,
): Promise<void> {
  try {
    const supabase = getAdminClient();

    const filesToDelete = [typPath];
    if (thumbnail_path && thumbnail_path.trim() !== "") {
      filesToDelete.push(thumbnail_path);
    }

    // Delete all files from storage in one call
    const { error: storageError } = await supabase.storage
      .from("user-projects")
      .remove(filesToDelete);

    if (storageError) {
      throw new Error("Storage files deletion failed");
    }

    // Delete database entry (this will cascade delete any related data)
    const { error: dbError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (dbError) {
      throw new Error("Failed to delete");
    }
  } catch (error) {
    console.error("Project deletion failed:", error);
    throw error;
  }
}

/* ---------- Check storage access ---------- */
export async function checkStorageAccess(): Promise<boolean> {
  try {
    const supabase = getAdminClient();
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
