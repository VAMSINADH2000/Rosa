"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Phase, SearchInfo } from "@/lib/phase-store";
import { useLangStore } from "@/lib/lang-store";

type Props = {
  phase: Phase;
  searchInfo: SearchInfo | null;
  muted?: boolean;
};

export function StatusStrip({ phase, searchInfo, muted = false }: Props) {
  const lang = useLangStore((s) => s.lang);
  const { label, detail, accent } = muted
    ? {
        label: lang === "en" ? "Muted" : "Silenciada",
        detail: null,
        accent: "var(--destructive)",
      }
    : getStatus(phase, searchInfo, lang);

  return (
    <div className="flex h-9 items-center justify-center border-b border-line bg-paper/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 text-[12px]">
        <span
          className="inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
        />
        <AnimatePresence mode="wait">
          <motion.span
            key={`${phase}-${detail ?? ""}`}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.18 }}
            className="tracking-[0.08em] text-ink"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <span className="uppercase text-mutedink">{label}</span>
            {detail && (
              <>
                <span className="mx-2 text-mutedink/60">·</span>
                <span className="text-ink">{detail}</span>
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

function getStatus(
  phase: Phase,
  info: SearchInfo | null,
  lang: "es" | "en",
): { label: string; detail: string | null; accent: string } {
  const L = lang === "en";
  switch (phase) {
    case "idle":
      return { label: L ? "Idle" : "En espera", detail: null, accent: "var(--line)" };
    case "connecting":
      return {
        label: L ? "Connecting" : "Conectando",
        detail: null,
        accent: "var(--chile)",
      };
    case "listening":
      return {
        label: L ? "Listening" : "Escuchando",
        detail: null,
        accent: "var(--healthy)",
      };
    case "thinking":
      return {
        label: L ? "Thinking" : "Pensando",
        detail: null,
        accent: "var(--amber)",
      };
    case "searching": {
      const isWeb = info?.tool === "web_search_fallback";
      const label = isWeb
        ? L
          ? "Web search"
          : "Búsqueda web"
        : L
          ? "Searching NMSU"
          : "Consultando NMSU";
      const detail = info?.pub_number ?? info?.query ?? null;
      return { label, detail, accent: "var(--chile)" };
    }
    case "speaking":
      return {
        label: L ? "Speaking" : "Hablando",
        detail: null,
        accent: "var(--chile)",
      };
    case "error":
      return {
        label: L ? "Error" : "Problema",
        detail: null,
        accent: "var(--destructive)",
      };
  }
}
