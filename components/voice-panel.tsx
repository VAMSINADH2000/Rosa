"use client";

import { useEffect, useRef, useState } from "react";
import { useCitationStore } from "@/lib/citation-store";
import { useTranscriptStore } from "@/lib/transcript-store";
import { useHistoryStore } from "@/lib/history-store";
import { ROSA_TOOLS } from "@/lib/realtime-tools";
import { useLangStore } from "@/lib/lang-store";
import { detectCitedDocIds } from "@/lib/citation-detect";
import { fileToThumbDataUrl } from "@/lib/photo-utils";
import { useUserProfileStore } from "@/lib/user-profile";
import { usePhaseStore } from "@/lib/phase-store";
import { findDoc } from "@/seeds/nmsu-docs";
import { ConversationView } from "@/components/conversation-view";
import { AnimatePresence } from "framer-motion";

type VoicePanelProps = {
  open: boolean;
  onClose: () => void;
  pendingPhoto?: File | null;
  onPendingPhotoConsumed?: () => void;
};

type Status = "idle" | "connecting" | "live" | "error";

type RealtimeEvent =
  | {
      type: "response.output_item.done";
      item?: {
        type?: string;
        name?: string;
        call_id?: string;
        arguments?: string;
      };
    }
  | { type: string; [k: string]: unknown };

export function VoicePanel({
  open,
  onClose,
  pendingPhoto,
  onPendingPhotoConsumed,
}: VoicePanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionStartRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    sessionStartRef.current = new Date().toISOString();

    const start = async () => {
      setStatus("connecting");
      usePhaseStore.getState().setPhase("connecting");
      setErrorMsg(null);
      try {
        const lang = useLangStore.getState().lang;
        const profile = useUserProfileStore.getState().profile;
        const lastSessionSummary = buildLastSessionSummary();
        const tokenRes = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang, profile, lastSessionSummary }),
        });
        if (!tokenRes.ok) {
          throw new Error(
            `No se pudo crear la sesión (${tokenRes.status}): ${await tokenRes.text()}`,
          );
        }
        const { client_secret, model } = (await tokenRes.json()) as {
          client_secret: string;
          model: string;
        };
        if (!client_secret) throw new Error("Token vacío");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setMediaStream(stream);

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.ontrack = (event) => {
          if (audioRef.current && event.streams[0]) {
            audioRef.current.srcObject = event.streams[0];
          }
        };

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.addEventListener("open", () => {
          dc.send(
            JSON.stringify({
              type: "session.update",
              session: {
                tools: ROSA_TOOLS as unknown as Array<Record<string, unknown>>,
                tool_choice: "auto",
              },
            }),
          );
        });
        dc.addEventListener("message", (ev) =>
          handleRealtimeMessage(ev.data, dc),
        );

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch(
          `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(
            model,
          )}`,
          {
            method: "POST",
            body: offer.sdp,
            headers: {
              Authorization: `Bearer ${client_secret}`,
              "Content-Type": "application/sdp",
            },
          },
        );
        if (cancelled || (pc.signalingState as string) === "closed") return;
        if (!sdpRes.ok) {
          throw new Error(
            `Intercambio SDP falló (${sdpRes.status}): ${await sdpRes.text()}`,
          );
        }
        const answerSdp = await sdpRes.text();
        if (cancelled || (pc.signalingState as string) === "closed") return;
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

        if (!cancelled) {
          setStatus("live");
          usePhaseStore.getState().setPhase("listening");
        }
      } catch (err) {
        console.error("[voice-panel]", err);
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : String(err));
          setStatus("error");
          usePhaseStore.getState().setPhase("error");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      // Snapshot session into history before tearing down stores.
      const turns = useTranscriptStore.getState().turns;
      const citations = useCitationStore.getState().citations;
      if (turns.length > 0 || citations.length > 0) {
        useHistoryStore.getState().saveSession({
          started_at: sessionStartRef.current ?? new Date().toISOString(),
          ended_at: new Date().toISOString(),
          lang: useLangStore.getState().lang,
          turns,
          citations,
        });
      }
      useTranscriptStore.getState().reset();
      useCitationStore.getState().clear();
      usePhaseStore.getState().reset();
      // Clear module-level dedup sets so a second session in the same page
      // load doesn't silently drop tool calls that happen to reuse an id.
      handledCallIds.clear();
      handledTranscriptItemIds.clear();
      sessionStartRef.current = null;

      dcRef.current?.close();
      dcRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setMediaStream(null);
      if (audioRef.current) audioRef.current.srcObject = null;
    };
  }, [open]);

  // Auto-consume a photo staged from the hero "Subir foto" button: as soon as
  // the connection is live, trigger the diagnosis flow with the staged file.
  useEffect(() => {
    if (status !== "live" || !pendingPhoto) return;
    const file = pendingPhoto;
    onPendingPhotoConsumed?.();
    void onPickPhoto(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pendingPhoto]);

  const onSendText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    const id = `text-user-${Date.now()}`;
    useTranscriptStore.getState().appendDelta(id, "user", trimmed);
    useTranscriptStore.getState().complete(id);
    // Cancel any in-flight Rosa response so she answers what was just typed.
    try {
      dc.send(JSON.stringify({ type: "response.cancel" }));
    } catch {
      /* harmless */
    }
    dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: trimmed }],
        },
      }),
    );
    dc.send(JSON.stringify({ type: "response.create" }));
  };

  const onPickPhoto = async (file: File) => {
    const lang = useLangStore.getState().lang;
    const stamp = Date.now();

    // Interrupt Rosa if she's mid-speech so the user gets fast acknowledgement
    // that the photo is being processed. response.cancel is a no-op if no
    // response is active.
    const dcEarly = dcRef.current;
    if (dcEarly && dcEarly.readyState === "open") {
      try {
        dcEarly.send(JSON.stringify({ type: "response.cancel" }));
      } catch {
        /* harmless */
      }
    }

    // 1. User's photo turn (just the filename — thumbnail tells the story).
    const userTurnId = `photo-user-${stamp}`;
    useTranscriptStore
      .getState()
      .appendDelta(userTurnId, "user", file.name);
    useTranscriptStore.getState().complete(userTurnId);
    // Generate thumbnail off the main path; not blocking the diagnosis call.
    fileToThumbDataUrl(file)
      .then((url) => useTranscriptStore.getState().setPhotoUrl(userTurnId, url))
      .catch((err) =>
        console.warn("[voice-panel] thumbnail failed", err),
      );

    // 2. Rosa's "analyzing" turn (will be replaced with the diagnosis text)
    const rosaTurnId = `diag-rosa-${stamp}`;
    useTranscriptStore
      .getState()
      .appendDelta(
        rosaTurnId,
        "rosa",
        lang === "en"
          ? "Analyzing the photo…"
          : "Analizando la foto…",
      );

    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("lang", lang);
      const res = await fetch("/api/diagnose-photo", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`HTTP ${res.status}: ${errBody}`);
      }
      const data = (await res.json()) as {
        diagnosis_es: string;
        diagnosis_en: string;
        confidence: "high" | "medium" | "low";
        cited_doc_id: string;
        recommended_action_es: string;
        recommended_action_en: string;
      };

      const diagnosis = lang === "en" ? data.diagnosis_en : data.diagnosis_es;
      const action =
        lang === "en"
          ? data.recommended_action_en
          : data.recommended_action_es;
      const confidenceLabel = formatConfidence(data.confidence, lang);

      useTranscriptStore
        .getState()
        .complete(
          rosaTurnId,
          `${diagnosis}\n\n${action}\n\n${confidenceLabel}`,
        );

      if (data.cited_doc_id) {
        useCitationStore.getState().addCitation({
          doc_id: data.cited_doc_id,
          passage: diagnosis,
        });
      }

      // Let the live voice agent know about the diagnosis so she can speak it.
      // The session was minted in `lang`, and Rosa is locked to that language,
      // so use that side of the diagnosis directly.
      const dc = dcRef.current;
      if (dc && dc.readyState === "open") {
        const inject =
          lang === "en"
            ? `[System note from the photo-diagnosis tool: the farmer just uploaded a photo. Diagnosis: "${data.diagnosis_en}". Recommendation: "${data.recommended_action_en}". Confidence: ${data.confidence}. Briefly summarize this aloud for the farmer in ENGLISH only.]`
            : `[Nota del sistema desde la herramienta de diagnóstico de fotos: el agricultor acaba de subir una foto. Diagnóstico: "${data.diagnosis_es}". Recomendación: "${data.recommended_action_es}". Confianza: ${data.confidence}. Resuma esto brevemente en voz para el agricultor SOLO EN ESPAÑOL.]`;
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: inject }],
            },
          }),
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      }
    } catch (err) {
      console.error("[voice-panel] diagnose-photo failed", err);
      useTranscriptStore
        .getState()
        .complete(
          rosaTurnId,
          lang === "en"
            ? `Sorry, I couldn't analyze that photo. ${err instanceof Error ? err.message : String(err)}`
            : `Lo siento, no pude analizar la foto. ${err instanceof Error ? err.message : String(err)}`,
        );
    }
  };

  return (
    <>
      <audio ref={audioRef} autoPlay className="hidden" />
      <AnimatePresence>
        {open && (
          <ConversationView
            key="conversation"
            mediaStream={mediaStream}
            onClose={onClose}
            onPickPhoto={onPickPhoto}
            onSendText={onSendText}
            errorMessage={status === "error" ? errorMsg : null}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// --- realtime event handling ---

const handledCallIds = new Set<string>();
const handledTranscriptItemIds = new Set<string>();

// Matches any leading greeting phrase so we can strip them and check whether
// what's left has real substance. Runs repeatedly until no more match, so
// chains like "Hey, good morning, how are you" strip cleanly.
const GREETING_PREFIX_RE =
  /^\s*(hi|hello|hey|yo|hola|buenas|buen[oa]s?\s+(d[ií]as|tardes|noches)|good\s+(morning|afternoon|evening|night)|how\s+(are\s+you|is\s+it\s+going|'?s\s+it\s+going|have\s+you\s+been)|what'?s\s+up|qu[ée]\s+tal|c[oó]mo\s+(est[aá]s?|va|le\s+va)|thanks|thank\s+you|gracias|ok|okay|vale|rosa)[\s.,!?]*/i;

function stripGreetingPrefixes(text: string): string {
  let current = text.trim();
  // Iterate until the regex stops consuming (guards against infinite loops
  // from pathological input by capping at 6 passes).
  for (let i = 0; i < 6; i++) {
    const next = current.replace(GREETING_PREFIX_RE, "").trim();
    if (next === current) break;
    current = next;
  }
  return current;
}

function isTrivialTurn(text: string): boolean {
  const remainder = stripGreetingPrefixes(text);
  if (remainder.length < 15) return true;
  const words = remainder.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 4) return true;
  return false;
}

function buildLastSessionSummary(): string | null {
  const sessions = useHistoryStore.getState().sessions;
  const currentLang = useLangStore.getState().lang;
  // Same-language sessions only, so an English session's topic doesn't bleed
  // into a Spanish greeting and vice versa.
  const sameLang = sessions.filter((s) => s.lang === currentLang);
  for (const session of sameLang) {
    // Look through the session for a substantive user turn — not just
    // "Hello." or "hey". Falls back through the whole session before moving
    // on to older sessions.
    const meaningful = session.turns.find(
      (t) => t.role === "user" && !isTrivialTurn(t.text),
    );
    if (meaningful) {
      return meaningful.text.trim().slice(0, 140);
    }
  }
  return null;
}

async function dispatchToolCall(
  call_id: string,
  name: string,
  argsStr: string,
  dc: RTCDataChannel,
) {
  if (handledCallIds.has(call_id)) return;
  handledCallIds.add(call_id);

  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsStr) as Record<string, unknown>;
  } catch {
    console.debug(
      "[voice-panel] tool args incomplete, waiting for full event",
      name,
    );
    return;
  }

  // Update status-strip searchInfo so the user sees what Rosa is doing.
  const phaseStore = usePhaseStore.getState();
  if (name === "search_nmsu") {
    phaseStore.setPhase("searching");
    phaseStore.setSearchInfo({
      tool: "search_nmsu",
      query: typeof args.query === "string" ? args.query : undefined,
    });
  } else if (name === "web_search_fallback") {
    phaseStore.setPhase("searching");
    phaseStore.setSearchInfo({
      tool: "web_search_fallback",
      query: typeof args.query === "string" ? args.query : undefined,
    });
  } else if (name === "cite_nmsu_doc") {
    const docId = typeof args.doc_id === "string" ? args.doc_id : undefined;
    const doc = docId ? findDoc(docId) : undefined;
    phaseStore.setPhase("searching");
    phaseStore.setSearchInfo({
      tool: "cite_nmsu_doc",
      doc_id: docId,
      pub_number: doc?.pub_number,
    });
  }

  let output: Record<string, unknown> = { ok: true };

  if (name === "cite_nmsu_doc") {
    const doc_id = typeof args.doc_id === "string" ? args.doc_id : null;
    const passage =
      typeof args.passage === "string"
        ? args.passage
        : typeof args.passage_es === "string"
          ? (args.passage_es as string)
          : undefined;
    if (doc_id) {
      useCitationStore.getState().addCitation({ doc_id, passage });
    }
    output = { displayed: true };
  } else if (name === "search_nmsu") {
    const query = typeof args.query === "string" ? args.query : "";
    if (!query) {
      output = { error: "missing query", matches: [] };
    } else {
      try {
        const res = await fetch("/api/search-nmsu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, top_k: 5 }),
        });
        if (!res.ok) {
          const detail = await res.text();
          output = { error: `search failed: ${res.status}`, detail, matches: [] };
        } else {
          const data = (await res.json()) as {
            matches?: Array<{
              doc_id: string;
              pub_number: string;
              title_en: string;
              title_es: string;
              source_url: string;
              score: number;
              content: string;
            }>;
          };
          output = { matches: data.matches ?? [] };
        }
      } catch (err) {
        output = {
          error: err instanceof Error ? err.message : String(err),
          matches: [],
        };
      }
    }
  } else if (name === "web_search_fallback") {
    const query = typeof args.query === "string" ? args.query : "";
    if (!query) {
      output = { error: "missing query", answer: "", sources: [] };
    } else {
      try {
        const lang = useLangStore.getState().lang;
        const res = await fetch("/api/web-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, lang }),
        });
        if (!res.ok) {
          const detail = await res.text();
          output = {
            error: `web-search failed: ${res.status}`,
            detail,
            answer: "",
            sources: [],
          };
        } else {
          const data = (await res.json()) as {
            answer?: string;
            sources?: Array<{ title: string; url: string }>;
          };
          output = {
            answer: data.answer ?? "",
            sources: data.sources ?? [],
            source_note: "web (not NMSU-verified)",
          };
        }
      } catch (err) {
        output = {
          error: err instanceof Error ? err.message : String(err),
          answer: "",
          sources: [],
        };
      }
    }
  } else {
    return;
  }

  if (dc.readyState === "open") {
    dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id,
          output: JSON.stringify(output),
        },
      }),
    );
    // Trigger continuation so Rosa keeps speaking after the tool call.
    dc.send(JSON.stringify({ type: "response.create" }));
  }
}

function fallbackDetectFromTranscript(item_id: string, transcript?: string) {
  if (!transcript) return;
  if (handledTranscriptItemIds.has(item_id)) return;
  handledTranscriptItemIds.add(item_id);
  const docs = detectCitedDocIds(transcript);
  for (const doc_id of docs) {
    useCitationStore.getState().addCitation({ doc_id });
  }
}

function handleRealtimeMessage(raw: unknown, dc: RTCDataChannel) {
  if (typeof raw !== "string") return;
  let msg: RealtimeEvent;
  try {
    msg = JSON.parse(raw) as RealtimeEvent;
  } catch {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[realtime]", msg.type);
  }

  // --- PHASE TRANSITIONS ---
  const phaseStore = usePhaseStore.getState();
  if (msg.type === "input_audio_buffer.speech_started") {
    phaseStore.setPhase("listening");
  } else if (msg.type === "input_audio_buffer.speech_stopped") {
    phaseStore.setPhase("thinking");
  } else if (msg.type === "response.function_call_arguments.delta") {
    if (phaseStore.phase !== "searching") phaseStore.setPhase("searching");
  } else if (
    msg.type === "response.output_audio_transcript.delta" ||
    msg.type === "response.audio_transcript.delta"
  ) {
    if (phaseStore.phase !== "speaking") phaseStore.setPhase("speaking");
  } else if (msg.type === "response.done") {
    phaseStore.setPhase("listening");
    phaseStore.setSearchInfo(null);
  }

  // Transcript: user audio (Whisper / gpt-4o-transcribe).
  if (msg.type === "conversation.item.input_audio_transcription.delta") {
    const m = msg as unknown as { item_id?: string; delta?: string };
    if (m.item_id && typeof m.delta === "string") {
      useTranscriptStore.getState().appendDelta(m.item_id, "user", m.delta);
    }
    return;
  }
  if (msg.type === "conversation.item.input_audio_transcription.completed") {
    const m = msg as unknown as { item_id?: string; transcript?: string };
    if (m.item_id) {
      useTranscriptStore.getState().complete(m.item_id, m.transcript);
    }
    return;
  }

  // Transcript: assistant audio.
  if (
    msg.type === "response.output_audio_transcript.delta" ||
    msg.type === "response.audio_transcript.delta"
  ) {
    const m = msg as unknown as { item_id?: string; delta?: string };
    if (m.item_id && typeof m.delta === "string") {
      useTranscriptStore.getState().appendDelta(m.item_id, "rosa", m.delta);
    }
    return;
  }
  if (
    msg.type === "response.output_audio_transcript.done" ||
    msg.type === "response.audio_transcript.done"
  ) {
    const m = msg as unknown as { item_id?: string; transcript?: string };
    if (m.item_id) {
      useTranscriptStore.getState().complete(m.item_id, m.transcript);
      // Regex fallback: scan completed Rosa text for "H-230" etc.
      fallbackDetectFromTranscript(m.item_id, m.transcript);
    }
    return;
  }

  // Function call (preferred path).
  if (msg.type === "response.function_call_arguments.done") {
    const m = msg as unknown as {
      call_id?: string;
      name?: string;
      arguments?: string;
    };
    if (m.call_id && m.name && typeof m.arguments === "string") {
      void dispatchToolCall(m.call_id, m.name, m.arguments, dc);
    }
    return;
  }
  // NOTE: deliberately not handling response.output_item.done for function
  // calls — that event can fire while args are still streaming, leading to
  // truncated JSON. function_call_arguments.done is the canonical completion
  // signal and is handled above.
}

function formatConfidence(
  confidence: "high" | "medium" | "low",
  lang: "es" | "en",
): string {
  if (lang === "en") {
    if (confidence === "high") return "Confidence: high.";
    if (confidence === "medium") return "Confidence: medium — keep an eye on it.";
    return "Confidence: low — please contact NMSU Ask-an-Expert for a closer look.";
  }
  if (confidence === "high") return "Confianza: alta.";
  if (confidence === "medium")
    return "Confianza: media — manténgalo en observación.";
  return "Confianza: baja — le recomiendo contactar a NMSU Ask-an-Expert.";
}

