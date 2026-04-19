import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

// Web-search fallback for Rosa. Uses OpenAI Responses API with the
// web_search_preview built-in tool. Only reached when search_nmsu returns
// nothing relevant AND the in-prompt NMSU title index has no matching guide.

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY missing on server" },
      { status: 500 },
    );
  }

  let body: { query?: string; lang?: string } = {};
  try {
    body = (await req.json()) as { query?: string; lang?: string };
  } catch {
    /* empty body */
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const lang = body.lang === "en" ? "en" : "es";
  if (!query) {
    return NextResponse.json({ error: "Missing 'query'" }, { status: 400 });
  }

  const framing =
    lang === "en"
      ? `You are researching a US Southwest smallholder farming question for a bilingual AI advisor named Rosa. In 120 words max, answer this question using current authoritative web sources. Prefer university Extension sites (NMSU, UC, Texas A&M, Utah State), USDA, NOAA, and peer-reviewed sources. Be concrete and practical. If the question is ambiguous, pick the most common interpretation. Question: ${query}`
      : `Usted está investigando una pregunta agrícola de un agricultor hispano del suroeste de EE.UU. para una asesora de IA llamada Rosa. En máximo 120 palabras, responda esta pregunta usando fuentes autoritativas actuales de la web. Prefiera sitios de Extensión universitaria (NMSU, UC, Texas A&M, Utah State), USDA, NOAA, y fuentes revisadas por pares. Sea concreto y práctico. Pregunta: ${query}`;

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "web_search_preview" }],
        input: framing,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: "Responses API error", detail },
        { status: res.status },
      );
    }

    const data = (await res.json()) as {
      output_text?: string;
      output?: Array<{
        type?: string;
        content?: Array<{
          type?: string;
          text?: string;
          annotations?: Array<{
            type?: string;
            title?: string;
            url?: string;
          }>;
        }>;
      }>;
    };

    // Extract answer text + citations. The Responses API sometimes leaves
    // output_text empty, so fall back to walking output[].content[].text.
    const textParts: string[] = [];
    const seen = new Set<string>();
    const sources: Array<{ title: string; url: string }> = [];
    if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type !== "message" || !Array.isArray(item.content)) continue;
        for (const c of item.content) {
          if (c.type === "output_text" && typeof c.text === "string") {
            textParts.push(c.text);
          }
          if (!Array.isArray(c.annotations)) continue;
          for (const a of c.annotations) {
            if (a.type !== "url_citation" || !a.url) continue;
            if (seen.has(a.url)) continue;
            seen.add(a.url);
            sources.push({ title: a.title ?? a.url, url: a.url });
          }
        }
      }
    }
    const answer = (data.output_text || textParts.join("\n")).trim();

    return NextResponse.json({ answer, sources });
  } catch (err) {
    return NextResponse.json(
      {
        error: "web-search call failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
