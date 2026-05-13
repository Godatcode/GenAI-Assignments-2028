import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import type { Document } from "@langchain/core/documents";
import { getEmbeddings } from "./embeddings";

function qdrantConfig() {
  const url = process.env.QDRANT_URL;
  if (!url) throw new Error("QDRANT_URL is not set.");
  const apiKey = process.env.QDRANT_API_KEY || undefined;
  const collectionName = process.env.QDRANT_COLLECTION ?? "notebooklm-docs";
  return { url, apiKey, collectionName };
}

let client: QdrantClient | null = null;
function getClient(): QdrantClient {
  if (client) return client;
  const { url, apiKey } = qdrantConfig();
  client = new QdrantClient({ url, apiKey });
  return client;
}

export async function indexDocuments(docs: Document[]): Promise<void> {
  const { url, apiKey, collectionName } = qdrantConfig();
  await QdrantVectorStore.fromDocuments(docs, getEmbeddings(), {
    url,
    apiKey,
    collectionName,
  });
  // Qdrant rejects filter queries on payload fields that don't have a payload
  // index. We filter every retrieval by metadata.documentId, so make sure
  // that index exists. The call is idempotent — if it's already there,
  // Qdrant returns success too — but we still swallow errors so a transient
  // race during the first upload can't fail the whole ingest.
  try {
    await getClient().createPayloadIndex(collectionName, {
      field_name: "metadata.documentId",
      field_schema: "keyword",
      wait: true,
    });
  } catch (err) {
    console.warn("[vectorstore] createPayloadIndex(metadata.documentId)", err);
  }
}

export async function getStore(): Promise<QdrantVectorStore> {
  const { url, apiKey, collectionName } = qdrantConfig();
  return QdrantVectorStore.fromExistingCollection(getEmbeddings(), {
    url,
    apiKey,
    collectionName,
  });
}

// Restrict similarity search to the user's currently-loaded documents by
// filtering on the documentId we stamp into every chunk's metadata at ingest
// time. Qdrant's `match.any` works against the same keyword payload index
// that `match.value` does, so multi-doc retrieval needs no schema change.
export function documentIdFilter(documentIds: string[]) {
  return {
    must: [
      {
        key: "metadata.documentId",
        match: { any: documentIds },
      },
    ],
  };
}

export async function ensureCollectionExists(): Promise<void> {
  const { collectionName } = qdrantConfig();
  const c = getClient();
  try {
    await c.getCollection(collectionName);
  } catch {
    // Created on first upload via QdrantVectorStore.fromDocuments — no-op here.
  }
}
