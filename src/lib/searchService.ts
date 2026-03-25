import { getAdminClient } from "./supabaseClient";
import {
  FilterType,
  ProjectWithShares,
} from "@/types";
import { isCXOUser } from "@/lib/sharingService";

const PAGE_SIZE = 20;

function chunkText(text: string, chunkSize = 1000, overlap = 100) {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  return chunks;
}
export async function processAndIndexDocument(projectId: string, text: string) {
  const supabase = getAdminClient();

  // 1. Chunk
  const chunks = chunkText(text);

  // 2. Prepare rows
  const rows = chunks.map((chunk, i) => ({
    project_id: projectId,
    chunk,
    chunk_index: i,
  }));

  // 3. Delete old chunks (important on update)
  await supabase
    .from("projects_search")
    .delete()
    .eq("project_id", projectId);

  // 5. Insert new chunks
  const { error } = await supabase.from("projects_search").insert(rows);

  if (error) {
    console.error("Indexing failed:", error);
  }
}

export async function search_resumes(
  searchQuery: string,
  page: number = 0,
  pageSize: number = PAGE_SIZE,
  filter: FilterType = "owned",
  userId: string
): Promise<{
  projects: ProjectWithShares[];
  hasMore: boolean;
  totalCount: number;
}> {
  const supabase = getAdminClient();
  let rpcName: string;
  const params: Record<string, string|number> = {
    search_query: searchQuery,
    page,
    page_size: pageSize,
  };

  if (filter === "owned") {
    rpcName = "search_resumes_own";
    params.curr_user = userId;
  }
  else if (filter === "shared") {
    rpcName = "search_resumes_shared";
    params.curr_user = userId;
  }
  else if (filter === "all") {
    const isCXO = await isCXOUser(userId);
    if (!isCXO) {
      throw new Error("Access denied: CXO privileges required");
    }
    params.page_size = pageSize
    rpcName = "search_resumes"; // global search
  }
  else {
    throw new Error("Invalid filter type");
  }
  const { data, error } = await supabase.rpc(rpcName, params);

  if (error) {
    console.error("Search resumes error:", error);
    throw new Error(error.message || "Failed to fetch resumes");
  }

  // Defensive safety (in case RPC ever returns null)
  const typedData = data as {
    projects: ProjectWithShares[];
    total_count: number;
  } | null;

  const projects = typedData?.projects ?? [];
  const totalCount = typedData?.total_count ?? 0;

  const hasMore = (page + 1) * pageSize < totalCount;

  return {
    projects,
    totalCount,
    hasMore,
  };
}