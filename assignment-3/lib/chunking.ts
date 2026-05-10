import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Document } from "@langchain/core/documents";

// Recursive character splitting respects paragraph → sentence → word
// boundaries before falling back to raw chars. The 150-char overlap keeps
// the head/tail of a chunk reachable from its neighbours so retrieval doesn't
// miss the start or end of a sentence that straddles a cut point.
export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 150;

export function makeSplitter(): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });
}

export async function splitDocuments(docs: Document[]): Promise<Document[]> {
  return makeSplitter().splitDocuments(docs);
}
