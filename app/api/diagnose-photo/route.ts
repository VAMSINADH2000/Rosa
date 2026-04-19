import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NMSU_DOCS } from "@/seeds/nmsu-docs";
import type { Lang } from "@/lib/lang-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_DOC_IDS = new Set(NMSU_DOCS.map((d) => d.id));
const SUPPORTED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

interface Diagnosis {
  diagnosis_es: string;
  diagnosis_en: string;
  confidence: "high" | "medium" | "low";
  cited_doc_id: string;
  recommended_action_es: string;
  recommended_action_en: string;
}

function buildSystemPrompt(): string {
  // Slim listing — full bodies blow past TPM limits. The model uses these
  // metadata lines to pick the best cited_doc_id; the farmer gets the full
  // guide at the rendered citation card's "Read full guide" link.
  const docsBlock = NMSU_DOCS.map(
    (d) =>
      `- ${d.id} (${d.pub_number}) "${d.title_en}" — topics: ${d.topic_tags.join(", ")}`,
  ).join("\n");
  const validIds = [...VALID_DOC_IDS].join(" | ");

  return `You are Rosa, an expert agronomist for chile farming in New Mexico and the US Southwest. The user has uploaded a photo of a plant. Diagnose what you see using these NMSU Extension publications as your reference:

${docsBlock}

Respond with ONLY valid JSON (no markdown fences, no prose before or after) matching this exact schema:

{
  "diagnosis_es": "1-2 sentence diagnosis in Mexican Spanish using 'usted' formality and chile vocabulary",
  "diagnosis_en": "1-2 sentence diagnosis in English",
  "confidence": "high" or "medium" or "low",
  "cited_doc_id": "exactly one of: ${validIds}",
  "recommended_action_es": "1-2 sentence specific actionable recommendation in Spanish",
  "recommended_action_en": "1-2 sentence specific actionable recommendation in English"
}

Rules:
- If confidence is "low", admit uncertainty in the diagnosis text and recommend asking NMSU Ask-an-Expert in recommended_action.
- Always pick exactly one cited_doc_id even at low confidence — pick the closest topical match.
- Be specific. Don't say "irrigation issues" — say "over-irrigation creating root-rot conditions" or similar.
- Keep recommendations concrete: a specific action the farmer can do this week.`;
}

function userPromptText(lang: Lang) {
  return lang === "en"
    ? "Please diagnose this chile plant photo. Return JSON only."
    : "Por favor diagnostique esta foto de planta de chile. Devuelva solo JSON.";
}

function cleanJsonText(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

async function diagnoseWithOpenAI(
  base64: string,
  mediaType: string,
  lang: Lang,
): Promise<{ raw: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing on server");
  const model = process.env.DIAGNOSE_OPENAI_MODEL ?? "gpt-4o";
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: [
          { type: "text", text: userPromptText(lang) },
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${base64}` },
          },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return { raw };
}

async function diagnoseWithAnthropic(
  base64: string,
  mediaType: string,
  lang: Lang,
): Promise<{ raw: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing on server");
  const model = process.env.DIAGNOSE_ANTHROPIC_MODEL ?? "claude-opus-4-7";
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64,
            },
          },
          { type: "text", text: userPromptText(lang) },
        ],
      },
    ],
  });

  const raw =
    message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim() ?? "";
  return { raw };
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("photo");
  const langRaw = formData.get("lang");
  const lang: Lang = langRaw === "en" ? "en" : "es";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'photo' file" }, { status: 400 });
  }
  if (!SUPPORTED_MEDIA.has(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported image type: ${file.type || "unknown"}. Use JPEG, PNG, GIF, or WEBP.`,
      },
      { status: 415 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const provider = (process.env.DIAGNOSE_PROVIDER ?? "openai").toLowerCase();

  let raw = "";
  try {
    if (provider === "anthropic") {
      ({ raw } = await diagnoseWithAnthropic(base64, file.type, lang));
    } else {
      ({ raw } = await diagnoseWithOpenAI(base64, file.type, lang));
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `${provider} call failed`,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  let parsed: Diagnosis;
  try {
    parsed = JSON.parse(cleanJsonText(raw)) as Diagnosis;
  } catch {
    return NextResponse.json(
      { error: "Diagnosis was not valid JSON", raw },
      { status: 502 },
    );
  }

  if (!VALID_DOC_IDS.has(parsed.cited_doc_id)) {
    console.warn(
      "[diagnose-photo] model returned invalid cited_doc_id, defaulting to nmsu-h-230",
      parsed.cited_doc_id,
    );
    parsed.cited_doc_id = "nmsu-h-230";
  }

  return NextResponse.json({ ...parsed, provider });
}
