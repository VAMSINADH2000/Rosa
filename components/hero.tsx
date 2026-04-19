"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useStrings } from "@/lib/i18n";

type HeroProps = {
  onTalk: () => void;
  onPickPhoto?: (file: File) => void;
};

export function Hero({ onTalk, onPickPhoto }: HeroProps) {
  const t = useStrings();

  return (
    <section className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex max-w-2xl flex-col items-center text-center">
        <div
          aria-hidden
          className="relative mb-10 h-36 w-36 overflow-hidden rounded-full border-[3px] border-chile shadow-[0_8px_36px_rgba(216,74,34,0.22)]"
        >
          <Image
            src="/rosa-logo.png"
            alt=""
            fill
            sizes="144px"
            priority
            className="object-cover"
          />
        </div>

        <h1
          className="text-balance text-[44px] leading-[1.1] text-ink"
          style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
        >
          {t.greeting}
        </h1>

        <p className="mt-5 max-w-md text-pretty text-[17px] leading-relaxed text-mutedink">
          {t.intro}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={onTalk}
            className="h-12 rounded-full bg-chile px-8 text-base text-paper shadow-sm hover:bg-chile-deep"
          >
            {t.talk}
          </Button>
          <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-base text-ink transition-colors hover:bg-secondary">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {t.upload}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickPhoto?.(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
