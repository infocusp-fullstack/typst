import { User } from "@/types";

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
  };
  created_at?: string;
}

export async function getUserById(userId: string): Promise<{ user: User } | null> {
  try {
    const response = await fetch(`/api/admin/users/${userId}`);
    if (!response.ok) {
      const errorMessage = `Failed to fetch user: ${response.statusText}`;
      console.error(errorMessage);
      return null;
    }
    const data = await response.json();
    const authUser = data.user as AuthUser;

    const user: User = {
      id: authUser.id,
      email: authUser.email || 'Unknown',
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Unknown',
      created_at: authUser.created_at || new Date().toISOString(),
    };

    return { user };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching user';
    console.error('Error fetching user:', errorMessage);
    return null;
  }
}

export async function searchUsers(query: string): Promise<{ users: User[] }> {
  try {
    const response = await fetch(`/api/admin/users/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      const errorMessage = `Failed to search users: ${response.statusText}`;
      console.error(errorMessage);
      return { users: [] };
    }
    const data = await response.json();
    const authUsers = data.users as AuthUser[];

    const users: User[] = authUsers.map((authUser) => ({
      id: authUser.id,
      email: authUser.email || 'Unknown',
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Unknown',
      created_at: authUser.created_at || new Date().toISOString(),
    }));

    return { users };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error searching users';
    console.error('Error searching users:', errorMessage);
    return { users: [] };
  }
}
