"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCitationStore } from "@/lib/citation-store";
import { useStrings } from "@/lib/i18n";
import { useLangStore } from "@/lib/lang-store";
import { findDoc } from "@/seeds/nmsu-docs";

export function CitationPanel() {
  const citations = useCitationStore((s) => s.citations);
  const t = useStrings();
  const lang = useLangStore((s) => s.lang);

  return (
    <aside className="flex w-full flex-col gap-4 px-6 py-12 lg:max-w-sm lg:py-16">
      <p className="text-[12px] uppercase tracking-[0.12em] text-mutedink">
        {t.citedGuides}
      </p>

      {citations.length === 0 ? (
        <p className="max-w-xs text-sm leading-relaxed text-mutedink/80">
          {t.citedGuidesEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {[...citations]
              .slice()
              .reverse()
              .map((c) => {
                const doc = findDoc(c.doc_id);
                if (!doc) return null;
                const primaryTitle =
                  lang === "en" ? doc.title_en : doc.title_es;
                const secondaryTitle =
                  lang === "en" ? doc.title_es : doc.title_en;
                return (
                  <motion.li
                    key={`${c.doc_id}-${c.ts}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="rounded-2xl border border-line bg-card p-5 shadow-sm"
                  >
                    <p
                      className="text-[11px] tracking-[0.14em] text-chile"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {doc.pub_number.toUpperCase()}
                    </p>
                    <h3
                      className="mt-1 text-[18px] leading-tight text-ink"
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                      }}
                    >
                      {primaryTitle}
                    </h3>
                    <p className="mt-1 text-[13px] italic text-mutedink">
                      {secondaryTitle}
                    </p>
                    {c.passage && (
                      <p className="mt-3 text-sm leading-relaxed text-ink">
                        “{c.passage}”
                      </p>
                    )}
                    <a
                      href={doc.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-chile px-4 text-sm text-paper transition-colors hover:bg-chile-deep"
                    >
                      {t.readFullGuide}
                    </a>
                  </motion.li>
                );
              })}
          </AnimatePresence>
        </ul>
      )}
    </aside>
  );
}
