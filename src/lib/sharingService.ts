import { getAdminClient } from "./supabaseClient";
import { ProjectShare, User, SharePermission } from "@/types";

// Check if user is a CXO (has access to view all resumes)
export async function isCXOUser(userId: string): Promise<boolean> {
  try {
    const supabase = getAdminClient();

    // First get the user's email
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user?.email) {
      console.error("Error getting user email:", userError);
      return false;
    }

    // Then check if the email exists in cxo_users table
    const { data, error } = await supabase
      .from("cxo_users")
      .select("id")
      .eq("email", userData.user.email)
      .maybeSingle();

    if (error) {
      console.error("Error checking CXO status:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error checking CXO status:", error);
    return false;
  }
}

export async function isCXOByEmail(email?: string | null): Promise<boolean> {
  try {
    if (!email) return false;
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("cxo_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

// Share a project with another user
export async function shareProject(
  projectId: string,
  sharedBy: string,
  toUserId: string,
  updatedPermission: SharePermission
): Promise<ProjectShare> {
  try {
    const supabase = await getAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(toUserId);

    if (userError || !user) {
      throw new Error("User not found");
    }

    // Check if already shared
    const { data } = await supabase
      .from("project_shares")
      .select("*")
      .eq("project_id", projectId)
      .eq("shared_with", user.id)
      .maybeSingle();

    const existingShare = data as ProjectShare;

    if (existingShare) {
      // Update existing share
      const { data, error } = await supabase
        .from("project_shares")
        .update({
          permission: updatedPermission,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingShare.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update share: ${error.message}`);
      return data as ProjectShare;
    } else {
      // Create new share
      const { data, error } = await supabase
        .from("project_shares")
        .insert({
          project_id: projectId,
          shared_by: sharedBy,
          shared_with: user.id,
          permission: updatedPermission,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to share project: ${error.message}`);
      return data as ProjectShare;
    }
  } catch (error) {
    throw error;
  }
}

// Unshare a project
export async function unshareProject(
  projectId: string,
  sharedWith: string
): Promise<void> {
  try {
    const supabase = getAdminClient();

    const { error } = await supabase
      .from("project_shares")
      .delete()
      .eq("project_id", projectId)
      .eq("shared_with", sharedWith);

    if (error) throw new Error(`Failed to unshare: ${error.message}`);
  } catch (error) {
    throw error;
  }
}

// Get all shares for a project with user details
export async function getProjectShares(
  projectId: string
): Promise<(ProjectShare & { user?: User })[]> {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("project_shares")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch shares: ${error.message}`);

    // Get user details for each share
    const sharesWithUsers = await Promise.all(
      (data as ProjectShare[]).map(async (share) => {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(
            share.shared_with
          );
          const user: User = {
            id: share.shared_with,
            email: userData.user?.email || "Unknown",
            name:
              userData.user?.user_metadata?.name ||
              userData.user?.email?.split("@")[0] ||
              "Unknown",
            created_at: userData.user?.created_at || "",
          };
          return { ...share, user };
        } catch (error) {
          console.error(
            `Failed to get user details for ${share.shared_with}:`,
            error
          );
          return { ...share, user: undefined };
        }
      })
    );

    return sharesWithUsers;
  } catch (error) {
    throw error;
  }
}

// Search users by name or email
export async function searchUsers(
  query: string,
  options?: { excludeUserIds?: string[] }
): Promise<User[]> {
  try {
    const supabase = getAdminClient();

    // Query all users from auth.users
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }

    // Filter users by email or name
    const excludeIds = options?.excludeUserIds ?? [];

    const filteredUsers = data.users
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((user: any) => {
        const email = user.email?.toLowerCase() || "";
        const name = user.user_metadata?.name?.toLowerCase() || "";
        const searchTerm = query.toLowerCase();

        if (excludeIds.includes(user.id)) return false;

        return email.includes(searchTerm) || name.includes(searchTerm);
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        name:
          user.user_metadata?.name || user.email?.split("@")[0] || "Unknown",
        created_at: user.created_at,
      }))
      .slice(0, 10); // Limit to 10 results

    return filteredUsers;
  } catch (error) {
    console.error("User search failed:", error);
    return [];
  }
}

// Check if current user can edit a project
export async function canEditProject(
  projectId: string,
  userId: string,
  projectOwnerId?: string
): Promise<boolean> {
  try {
    const supabase = getAdminClient();

    // Short-circuit if ownerId already known
    if (projectOwnerId && projectOwnerId === userId) return true;

    // If ownerId not provided, fetch it once
    if (!projectOwnerId) {
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single();
      if (project?.user_id === userId) return true;
    }

    // Check if user has edit permission through sharing
    const { data: share } = await supabase
      .from("project_shares")
      .select("permission")
      .eq("project_id", projectId)
      .eq("shared_with", userId)
      .eq("permission", "edit")
      .maybeSingle();

    return !!share;
  } catch {
    return false;
  }
}

// Check if current user can view a project
export async function canViewProject(
  projectId: string,
  userId: string,
  projectOwnerId?: string
): Promise<boolean> {
  try {
    const supabase = getAdminClient();

    // Short-circuit if ownerId already known
    if (projectOwnerId && projectOwnerId === userId) return true;

    // If ownerId not provided, fetch it once
    if (!projectOwnerId) {
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single();
      if (project?.user_id === userId) return true;
    }

    // Check if user has any permission through sharing
    const { data: share } = await supabase
      .from("project_shares")
      .select("permission")
      .eq("project_id", projectId)
      .eq("shared_with", userId)
      .maybeSingle();

    return !!share;
  } catch {
    return false;
  }
}

export async function getResumeByUsername(
  username: string
): Promise<string | undefined> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    throw new Error("Error verifying user");
  }

  const requiredUserEmail = `${username.trim()}@infocusp.com`;
  const user = data.users.find((user) => user.email === requiredUserEmail);

  if (!user || !user?.id) {
    throw new Error("User not found");
  }

  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user?.id)
    .eq("project_type", "resume");

  if (projectError) {
    throw new Error("Error fetching projects");
  }

  if (!projects || projects.length == 0) {
    throw new Error(`No resume found for ${username}`);
  }

  // Currently, each user can have only one project
  // If we later support multiple projects, determine which project the user should be redirected to
  return projects[0].id as string;
}
