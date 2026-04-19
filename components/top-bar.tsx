"use client";

import { useLangStore } from "@/lib/lang-store";

type TopBarProps = {
  onOpenHistory?: () => void;
};

export function TopBar({ onOpenHistory }: TopBarProps) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const historyLabel = lang === "en" ? "Conversations" : "Conversaciones";

  return (
    <header className="w-full border-b border-line bg-paper/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <span
          translate="no"
          className="notranslate text-[28px] leading-none text-ink"
          style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
        >
          Rosa.ai
        </span>

        <div className="flex items-center gap-3 sm:gap-4">
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              aria-label={historyLabel}
              title={historyLabel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card text-mutedink transition-colors hover:bg-secondary hover:text-ink"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
          )}

          <div
            role="group"
            aria-label="Idioma / Language"
            translate="no"
            className="notranslate flex h-8 items-center rounded-full border border-line bg-card p-0.5 text-[12px] font-medium"
          >
            <button
              type="button"
              onClick={() => setLang("es")}
              className={`h-7 rounded-full px-3.5 transition-colors ${
                lang === "es"
                  ? "bg-chile text-paper"
                  : "text-mutedink hover:text-ink"
              }`}
              aria-pressed={lang === "es"}
            >
              Español
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`h-7 rounded-full px-3.5 transition-colors ${
                lang === "en"
                  ? "bg-chile text-paper"
                  : "text-mutedink hover:text-ink"
              }`}
              aria-pressed={lang === "en"}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
