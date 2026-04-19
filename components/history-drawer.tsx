"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useHistoryStore, type Session } from "@/lib/history-store";
import { useStrings } from "@/lib/i18n";
import { useLangStore } from "@/lib/lang-store";
import { findDoc } from "@/seeds/nmsu-docs";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HistoryDrawer({ open, onClose }: Props) {
  const sessions = useHistoryStore((s) => s.sessions);
  const t = useStrings();
  const lang = useLangStore((s) => s.lang);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  // ESC closes the drawer.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col border-r border-line bg-paper shadow-2xl"
            role="dialog"
            aria-label={lang === "en" ? "Past conversations" : "Conversaciones anteriores"}
          >
            <header className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <p className="text-[12px] uppercase tracking-[0.14em] text-mutedink">
                  {lang === "en" ? "History" : "Historial"}
                </p>
                <h2
                  className="mt-0.5 text-2xl text-ink"
                  style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
                >
                  {lang === "en"
                    ? "Past conversations"
                    : "Conversaciones anteriores"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-3 py-1.5 text-sm text-mutedink hover:bg-secondary hover:text-ink"
              >
                {t.close}
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {!hydrated ? null : sessions.length === 0 ? (
                <p className="px-2 py-8 text-sm text-mutedink">
                  {lang === "en"
                    ? "No conversations yet. Start one with Rosa to see it here."
                    : "Aún no hay conversaciones. Empiece una con Rosa para verla aquí."}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {sessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      expanded={expandedId === session.id}
                      onToggle={() =>
                        setExpandedId((cur) =>
                          cur === session.id ? null : session.id,
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SessionRow({
  session,
  expanded,
  onToggle,
}: {
  session: Session;
  expanded: boolean;
  onToggle: () => void;
}) {
  const lang = useLangStore((s) => s.lang);
  const startedAt = new Date(session.started_at);
  const firstUser = session.turns.find((t) => t.role === "user");
  const preview = firstUser?.text.trim().slice(0, 96) ?? "—";

  return (
    <li className="rounded-2xl border border-line bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 rounded-2xl px-4 py-3 text-left hover:bg-secondary/50"
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] uppercase tracking-[0.14em] text-mutedink"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {formatDate(startedAt, lang)}
          </p>
          <p className="mt-1 truncate text-sm text-ink">{preview || "—"}</p>
          <p className="mt-1 text-[12px] text-mutedink">
            {session.turns.length}{" "}
            {lang === "en" ? "turns" : "turnos"} ·{" "}
            {session.citations.length}{" "}
            {lang === "en" ? "citations" : "citas"} · {session.lang.toUpperCase()}
          </p>
        </div>
        <span className="mt-1 text-mutedink">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="border-t border-line px-4 py-3">
          <ExpandedSession session={session} />
        </div>
      )}
    </li>
  );
}

function ExpandedSession({ session }: { session: Session }) {
  // Interleave turns and citations chronologically.
  type Item =
    | { kind: "turn"; ts: number; data: Session["turns"][number] }
    | { kind: "cite"; ts: number; data: Session["citations"][number] };
  const items: Item[] = [
    ...session.turns.map((t) => ({ kind: "turn" as const, ts: t.ts, data: t })),
    ...session.citations.map((c) => ({
      kind: "cite" as const,
      ts: c.ts,
      data: c,
    })),
  ].sort((a, b) => a.ts - b.ts);
  const lang = useLangStore((s) => s.lang);

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => {
        if (item.kind === "turn") {
          const turn = item.data;
          return (
            <li
              key={`t-${turn.id}-${i}`}
              className={
                turn.role === "rosa"
                  ? "rounded-xl bg-secondary/70 p-3"
                  : "rounded-xl border border-line p-3"
              }
            >
              <p
                className={`mb-0.5 text-[10px] uppercase tracking-[0.14em] ${
                  turn.role === "rosa" ? "text-chile" : "text-mutedink"
                }`}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {turn.role === "rosa" ? "Rosa" : lang === "en" ? "You" : "Usted"}
              </p>
              {turn.photo_url && (
                <img
                  src={turn.photo_url}
                  alt=""
                  className="mb-2 h-32 w-full max-w-[240px] rounded-lg border border-line object-cover"
                />
              )}
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                {turn.text}
              </p>
            </li>
          );
        }
        const cite = item.data;
        const doc = findDoc(cite.doc_id);
        if (!doc) return null;
        return (
          <li
            key={`c-${cite.doc_id}-${cite.ts}-${i}`}
            className="rounded-xl border border-chile/40 bg-chile/5 p-3"
          >
            <p
              className="text-[10px] tracking-[0.14em] text-chile"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {doc.pub_number.toUpperCase()}
            </p>
            <p
              className="mt-0.5 text-sm leading-tight text-ink"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
            >
              {lang === "en" ? doc.title_en : doc.title_es}
            </p>
            <a
              href={doc.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[12px] text-chile hover:underline"
            >
              {lang === "en" ? "Read full guide ↗" : "Leer la guía completa ↗"}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function formatDate(d: Date, lang: "es" | "en") {
  const locale = lang === "en" ? "en-US" : "es-MX";
  return d.toLocaleString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
