import { NextResponse } from "next/server";
import { searchNmsu } from "@/lib/nmsu-kb";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { query?: string; top_k?: number } = {};
  try {
    body = (await req.json()) as { query?: string; top_k?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "Missing 'query'" }, { status: 400 });
  }
  const top_k =
    typeof body.top_k === "number"
      ? Math.max(1, Math.min(5, Math.round(body.top_k)))
      : 3;

  try {
    const matches = await searchNmsu(query, top_k);
    return NextResponse.json({ matches });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Vector-store search failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
