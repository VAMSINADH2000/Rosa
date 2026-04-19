"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranscriptStore } from "@/lib/transcript-store";
import { useCitationStore } from "@/lib/citation-store";
import { useStrings } from "@/lib/i18n";
import { useLangStore } from "@/lib/lang-store";
import { findDoc } from "@/seeds/nmsu-docs";

type StreamItem =
  | {
      kind: "turn";
      ts: number;
      key: string;
      role: "user" | "rosa";
      text: string;
      done: boolean;
      photo_url?: string;
    }
  | {
      kind: "cite";
      ts: number;
      key: string;
      doc_id: string;
      passage?: string;
    };

export function Transcript() {
  const turns = useTranscriptStore((s) => s.turns);
  const citations = useCitationStore((s) => s.citations);
  const t = useStrings();
  const lang = useLangStore((s) => s.lang);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const items: StreamItem[] = useMemo(() => {
    const merged: StreamItem[] = [
      ...turns.map((tn) => ({
        kind: "turn" as const,
        ts: tn.ts,
        key: `t-${tn.id}`,
        role: tn.role,
        text: tn.text,
        done: tn.done,
        photo_url: tn.photo_url,
      })),
      ...citations.map((c) => ({
        kind: "cite" as const,
        ts: c.ts,
        key: `c-${c.doc_id}-${c.ts}`,
        doc_id: c.doc_id,
        passage: c.passage,
      })),
    ];
    return merged.sort((a, b) => a.ts - b.ts);
  }, [turns, citations]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [items]);

  if (items.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-mutedink/70">
        {t.transcriptEmpty}
      </p>
    );
  }

  return (
    <div ref={scrollerRef} className="flex-1 overflow-y-auto pr-1">
      <ul className="flex flex-col gap-3 pb-2">
        {items.map((item) =>
          item.kind === "turn" ? (
            <li
              key={item.key}
              className={
                item.role === "rosa"
                  ? "rounded-2xl bg-secondary/70 px-4 py-3"
                  : "rounded-2xl border border-line bg-card px-4 py-3"
              }
            >
              <p
                className={`mb-1 text-[10px] uppercase tracking-[0.14em] ${
                  item.role === "rosa" ? "text-chile" : "text-mutedink"
                }`}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {item.role === "rosa" ? t.rosa : t.you}
              </p>
              {item.photo_url && (
                <img
                  src={item.photo_url}
                  alt=""
                  className="mt-1 mb-2 h-40 w-full max-w-[320px] rounded-xl border border-line object-cover"
                />
              )}
              {(item.text || !item.done) && (
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">
                  {item.text || "…"}
                </p>
              )}
            </li>
          ) : (
            <CitationCard
              key={item.key}
              doc_id={item.doc_id}
              passage={item.passage}
              lang={lang}
              readLabel={t.readFullGuide}
            />
          ),
        )}
      </ul>
    </div>
  );
}

function CitationCard({
  doc_id,
  passage,
  lang,
  readLabel,
}: {
  doc_id: string;
  passage?: string;
  lang: "es" | "en";
  readLabel: string;
}) {
  const doc = findDoc(doc_id);
  if (!doc) return null;
  const title = lang === "en" ? doc.title_en : doc.title_es;

  return (
    <li className="ml-4 rounded-2xl border border-chile/40 bg-chile/[0.06] px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-6 shrink-0 items-center justify-center rounded-md bg-chile px-1.5 text-[10px] font-semibold tracking-[0.08em] text-white"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          NMSU
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] tracking-[0.14em] text-chile"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {doc.pub_number.toUpperCase()}
          </p>
          <p
            className="mt-0.5 text-[15px] leading-tight text-ink"
            style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
          >
            {title}
          </p>
          {passage && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink/90">
              “{passage}”
            </p>
          )}
          <a
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[12px] font-medium text-chile hover:underline"
          >
            {readLabel} ↗
          </a>
        </div>
      </div>
    </li>
  );
}
