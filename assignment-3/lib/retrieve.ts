import { documentIdFilter, getStore } from "./vectorstore";
import type { ChunkMetadata, RetrievedChunk } from "./types";

export async function retrieveRelevantChunks(
  question: string,
  documentId: string,
  k: number = 5
): Promise<RetrievedChunk[]> {
  const store = await getStore();
  const filter = documentIdFilter(documentId);

  const results = await store.similaritySearchWithScore(question, k, filter);

  return results.map(([doc, score]) => ({
    text: doc.pageContent,
    metadata: doc.metadata as ChunkMetadata,
    score,
  }));
}
