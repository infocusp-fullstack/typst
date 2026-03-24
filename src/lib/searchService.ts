import { getAdminClient } from "./supabaseClient";

function chunkText(text: string, chunkSize = 1000, overlap = 100) {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  return chunks;
}

// async function generateEmbedding(text: string): Promise<number[]> {
//   const res = await fetch("YOUR_EMBEDDING_API", {
//     method: "POST",
//     body: JSON.stringify({ input: text }),
//   });

//   const data = await res.json();
//   return data.embedding;
// }

export async function processAndIndexDocument(projectId: string, text: string) {
  const supabase = getAdminClient();

  // 1. Chunk
  const chunks = chunkText(text);

  // 2. Generate embeddings (parallel)
  // const embeddings = await Promise.all(
  //   chunks.map((chunk) => generateEmbedding(chunk))
  // );

  // 3. Prepare rows
  const rows = chunks.map((chunk, i) => ({
    project_id: projectId,
    chunk,
    // embedding: embeddings[i],
    chunk_index: i,
  }));

  // 4. Delete old chunks (important on update)
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