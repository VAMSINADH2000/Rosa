import { NextResponse } from "next/server";
import { buildRosaInstructions } from "@/lib/rosa-prompt";
import { ROSA_TOOLS } from "@/lib/realtime-tools";
import { fetchAlbuquerqueForecastSummary } from "@/lib/weather";
import type { Lang } from "@/lib/lang-store";
import type { UserProfile } from "@/lib/user-profile";

export const dynamic = "force-dynamic";
// Vercel hobby default is 10s; bump so a slow NOAA or OpenAI handshake
// doesn't time out before we return the ephemeral key to the browser.
export const maxDuration = 30;

interface SessionRequestBody {
  lang?: string;
  profile?: UserProfile | null;
  lastSessionSummary?: string | null;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY missing on server" },
      { status: 500 },
    );
  }

  let body: SessionRequestBody = {};
  try {
    body = (await req.json()) as SessionRequestBody;
  } catch {
    /* empty body — defaults */
  }
  const lang: Lang = body.lang === "en" ? "en" : "es";
  const profile = body.profile ?? null;
  const lastSessionSummary = body.lastSessionSummary ?? null;

  const model = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime";
  const voice = process.env.OPENAI_REALTIME_VOICE ?? "marin";

  // Fetch weather with a hard timeout — failures are non-fatal. If NOAA
  // is slow we'd rather mint the session without weather than make the
  // user wait past the mic timeout.
  const weatherSummary = await Promise.race<string | null>([
    fetchAlbuquerqueForecastSummary(lang).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
  ]);

  const instructions = buildRosaInstructions({
    lang,
    profile,
    lastSessionSummary,
    weatherSummary,
  });

  const upstream = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          instructions,
          tools: ROSA_TOOLS as unknown as Array<Record<string, unknown>>,
          audio: {
            input: {
              turn_detection: { type: "server_vad" },
              transcription: { model: "gpt-4o-transcribe" },
            },
            output: { voice },
          },
        },
      }),
    },
  );

  const bodyText = await upstream.text();

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "OpenAI session creation failed", detail: bodyText },
      { status: upstream.status },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return NextResponse.json(
      { error: "OpenAI returned non-JSON", detail: bodyText },
      { status: 502 },
    );
  }

  const data = parsed as Record<string, unknown>;
  const nestedSecret = (data.client_secret as { value?: string } | undefined)
    ?.value;
  const flatSecret = typeof data.value === "string" ? data.value : undefined;
  const client_secret = flatSecret ?? nestedSecret ?? null;

  if (!client_secret) {
    return NextResponse.json(
      { error: "No ephemeral key in OpenAI response", raw: parsed },
      { status: 502 },
    );
  }

  return NextResponse.json({
    client_secret,
    model,
    voice,
    lang,
    weatherUsed: Boolean(weatherSummary),
    profileUsed: Boolean(profile),
  });
}
