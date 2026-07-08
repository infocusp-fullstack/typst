import { getAdminClient } from "@/lib/supabaseClient";
import { ReviewComment } from "@/types";

export type CommentCreateInput = Omit<ReviewComment, "id" | "user_id" | "created_at" | "updated_at" | "users">;

const supabase = getAdminClient();

export const commentService = {
  async getComments(projectId: string): Promise<ReviewComment[]> {
    const { data, error } = await supabase
      .from("review_comments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }

    return data as ReviewComment[];
  },

  async addComment(projectId: string, input: CommentCreateInput): Promise<ReviewComment> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User must be authenticated to add comments");
    }

    const { data, error } = await supabase
      .from("review_comments")
      .insert({
        ...input,
        project_id: projectId,
        user_id: user.id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error adding comment:", error);
      throw error;
    }

    return data as ReviewComment;
  },

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from("review_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  },
};