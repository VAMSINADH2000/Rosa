import OpenAI from "openai";
import { NMSU_DOCS, type NmsuDoc } from "@/seeds/nmsu-docs";

// Server-side: ensures an OpenAI vector store exists with all NMSU docs
// uploaded, then lets callers search it. Idempotent across restarts — we
// look up an existing store by name before creating a new one.

// Bump this suffix whenever the seed corpus changes so reindex builds a
// fresh store rather than reusing an old one with stale contents.
const STORE_NAME = "rosa-nmsu-v2-62docs";

let cachedStoreId: string | null = null;
let initPromise: Promise<string> | null = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing on server");
  return new OpenAI({ apiKey });
}

function buildDocMarkdown(doc: NmsuDoc): string {
  return `# ${doc.pub_number} — ${doc.title_en}

doc_id: ${doc.id}
pub_number: ${doc.pub_number}
title_en: ${doc.title_en}
title_es: ${doc.title_es}
source_url: ${doc.source_url}
topics: ${doc.topic_tags.join(", ")}

## English body

${doc.content_en}

## Cuerpo en español

${doc.content_es}
`;
}

async function findExistingStore(
  client: OpenAI,
  name: string,
): Promise<string | null> {
  try {
    // Manual pagination — stores API has listing with a `data` page.
    const list = await client.vectorStores.list({ limit: 100 });
    const match = list.data.find((s) => s.name === name);
    return match?.id ?? null;
  } catch {
    return null;
  }
}

export async function ensureNmsuVectorStore(): Promise<string> {
  const envId = process.env.OPENAI_VECTOR_STORE_ID;
  if (envId) {
    cachedStoreId = envId;
    return envId;
  }
  if (cachedStoreId) return cachedStoreId;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const client = getClient();

    const existing = await findExistingStore(client, STORE_NAME);
    if (existing) {
      cachedStoreId = existing;
      return existing;
    }

    const store = await client.vectorStores.create({
      name: STORE_NAME,
      expires_after: { anchor: "last_active_at", days: 7 },
    });

    // Upload each doc as a file with doc_id-derived filename so matches can
    // be mapped back to our NmsuDoc entries on the way out.
    const fileIds: string[] = [];
    for (const doc of NMSU_DOCS) {
      const md = buildDocMarkdown(doc);
      const blob = new Blob([md], { type: "text/markdown" });
      const file = await client.files.create({
        file: new File([blob], `${doc.id}.md`, { type: "text/markdown" }),
        purpose: "assistants",
      });
      fileIds.push(file.id);
    }

    await client.vectorStores.fileBatches.createAndPoll(store.id, {
      file_ids: fileIds,
    });

    cachedStoreId = store.id;
    return store.id;
  })();

  try {
    return await initPromise;
  } finally {
    // Reset promise so transient failures can retry.
    initPromise = null;
  }
}

export interface NmsuSearchMatch {
  doc_id: string;
  pub_number: string;
  title_en: string;
  title_es: string;
  source_url: string;
  score: number;
  content: string;
}

function docIdFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

export interface ReindexResult {
  store_id: string;
  uploaded: number;
  deleted_previous: boolean;
}

// Tear down any existing store (and best-effort delete its files) and rebuild
// from the current NMSU_DOCS. Call this after seed file changes.
export async function reindexNmsuStore(): Promise<ReindexResult> {
  const client = getClient();
  let deletedPrevious = false;

  const existing = await findExistingStore(client, STORE_NAME);
  if (existing) {
    // Best-effort: delete files attached to the store, then the store itself.
    try {
      const files = await client.vectorStores.files.list(existing);
      for (const f of files.data) {
        try {
          await client.files.delete(f.id);
        } catch {
          /* ignore individual file cleanup errors */
        }
      }
    } catch {
      /* ignore listing errors */
    }
    try {
      await client.vectorStores.delete(existing);
      deletedPrevious = true;
    } catch {
      /* ignore — we'll create a new one regardless */
    }
  }

  // Reset in-memory cache so ensureNmsuVectorStore() creates fresh.
  cachedStoreId = null;
  initPromise = null;

  const newId = await ensureNmsuVectorStore();
  return {
    store_id: newId,
    uploaded: NMSU_DOCS.length,
    deleted_previous: deletedPrevious,
  };
}

export async function searchNmsu(
  query: string,
  topK = 3,
): Promise<NmsuSearchMatch[]> {
  const client = getClient();
  const storeId = await ensureNmsuVectorStore();

  const res = await client.vectorStores.search(storeId, {
    query,
    max_num_results: topK,
  });

  return res.data
    .map((match) => {
      const doc_id = docIdFromFilename(match.filename ?? "");
      const nmsu = NMSU_DOCS.find((d) => d.id === doc_id);
      if (!nmsu) return null;
      const contentText = match.content
        .map((c) => ("text" in c && typeof c.text === "string" ? c.text : ""))
        .join("\n")
        .trim();
      return {
        doc_id,
        pub_number: nmsu.pub_number,
        title_en: nmsu.title_en,
        title_es: nmsu.title_es,
        source_url: nmsu.source_url,
        score: typeof match.score === "number" ? match.score : 0,
        content: contentText,
      } as NmsuSearchMatch;
    })
    .filter((m): m is NmsuSearchMatch => m !== null);
}
