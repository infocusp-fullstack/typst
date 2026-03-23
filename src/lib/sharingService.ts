import { getAdminClient } from "./supabaseClient";
import { ProjectShare, User, SharePermission } from "@/types";
import prisma from "./prisma";

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

    const data = await prisma.cxo_users.findUniqueOrThrow({
      where: {
        email: userData.user.email,
      },
      select: {
        id: true
      }
    })

    return !!data;
  } catch (error) {
    console.error("Error checking CXO status:", error);
    return false;
  }
}

export async function isCXOByEmail(email?: string | null): Promise<boolean> {
  try {
    if (!email) return false;
    const data = await prisma.cxo_users.findUniqueOrThrow({
      where: {
        email: email,
      },
      select: {
        id: true
      }
    })
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

    const data = await prisma.project_shares.findFirst({
      where: {
        project_id: projectId,
        shared_with: user.id
      }
    })

    const existingShare = data as ProjectShare;

    if (existingShare) {
      const data = await prisma.project_shares.update({
        where: {
          id: existingShare.id,
        },
        data: {
          permission: updatedPermission,
          updated_at: new Date().toISOString(),
        }
      })

      return data as ProjectShare;
    } else {
      // Create new share
      const data = await prisma.project_shares.create({
        data: {
          project_id: projectId,
          shared_by: sharedBy,
          shared_with: user.id,
          permission: updatedPermission,
        }
      })
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
    await prisma.project_shares.delete({
      where: {
        project_id_shared_with: {
          project_id: projectId,
          shared_with: sharedWith
        }
      }
    })
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

    const data = await prisma.project_shares.findMany({
      where: {
        project_id: projectId
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Get user details for each share
    const sharesWithUsers = await Promise.all(
      (data as ProjectShare[]).map(async (share) => {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(
            share.shared_with
          );
          if (userData) {
            const user: User = {
              id: share.shared_with,
              email: userData.user?.email || "Unknown",
              full_name:
                userData.user?.user_metadata?.name ||
                userData.user?.email?.split("@")[0] ||
                "Unknown",
              created_at: new Date(userData.user?.created_at!),
            };
            return { ...share, user };
          }
          else {
            throw new Error('failed to get user information')
          }
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
        full_name:
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
      const project = await prisma.projects.findUnique({
        where: {
          id: projectId
        },
        select: {
          user_id: true
        }
      })
      if (project?.user_id === userId) return true;
    }

    // Check if user has edit permission through sharing
    const share = await prisma.project_shares.findFirst({
      select: {
        permission: true
      },
      where: {
        project_id: projectId,
        shared_with: userId,
        permission: 'edit'
      }
    }
    )

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
      const project = await prisma.projects.findUnique({
        where: {
          id: projectId
        },
        select: {
          user_id: true
        }
      })
      if (project?.user_id === userId) return true;
    }

    // Check if user has any permission through sharing
    const share = await prisma.project_shares.findFirst({
      select: {
        permission: true
      },
      where: {
        project_id: projectId,
        shared_with: userId,
      }
    })
    return !!share;
  } catch {
    return false;
  }
}

export async function getResumeByUsername(
  username: string
): Promise<string | undefined> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    throw new Error("Error verifying user");
  }

  const requiredUserEmail = `${username.trim()}@infocusp.com`;
  const user = data.users.find((user) => user.email === requiredUserEmail);

  if (!user || !user?.id) {
    throw new Error("User not found");
  }

  const project = await prisma.projects.findFirst({
    where:{
      user_id: user?.id,
      project_type: "resume"
    }
  })

  if (!project) {
    throw new Error(`No resume found for ${username}`);
  }

  // Currently, each user can have only one project
  // If we later support multiple projects, determine which project the user should be redirected to
  return project.id as string;
}
