import { NextResponse } from "next/server";
import { reindexNmsuStore } from "@/lib/nmsu-kb";
import { NMSU_DOCS } from "@/seeds/nmsu-docs";

export const dynamic = "force-dynamic";
// Upload of many files can take a while — give it headroom.
export const maxDuration = 180;

export async function POST(req: Request) {
  let body: { confirm?: string } = {};
  try {
    body = (await req.json()) as { confirm?: string };
  } catch {
    /* empty body */
  }

  if (body.confirm !== "YES") {
    return NextResponse.json(
      {
        error:
          "Pass a JSON body { \"confirm\": \"YES\" } to reindex. This deletes the current vector store and re-uploads every doc in seeds/nmsu-docs.ts.",
        current_doc_count: NMSU_DOCS.length,
      },
      { status: 400 },
    );
  }

  try {
    const started = Date.now();
    const result = await reindexNmsuStore();
    return NextResponse.json({
      ok: true,
      ...result,
      elapsed_ms: Date.now() - started,
      doc_ids: NMSU_DOCS.map((d) => d.id),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "reindex failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
