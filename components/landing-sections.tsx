"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useLangStore } from "@/lib/lang-store";

export function LandingSections() {
  const lang = useLangStore((s) => s.lang);
  return <Features lang={lang} />;
}

function SceneImage({ lang }: { lang: "es" | "en" }) {
  const caption =
    lang === "en"
      ? "In the field, in the farmer's language."
      : "En el campo, en el idioma del agricultor.";
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="lg:sticky lg:top-24"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line shadow-xl">
        <Image
          src="/rosa-scene.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent p-6 pt-28">
          <p
            className="text-balance text-[22px] leading-tight text-white sm:text-[26px]"
            style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
          >
            {caption}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function Features({ lang }: { lang: "es" | "en" }) {
  const title = lang === "en" ? "What Rosa can do" : "Lo que Rosa puede hacer";
  const items =
    lang === "en"
      ? [
          {
            icon: <MicIcon />,
            title: "Voice, bilingual",
            body: "Speak Spanish or English. Rosa adapts to the vocabulary US Southwest growers actually use.",
          },
          {
            icon: <CameraIcon />,
            title: "Photo diagnosis",
            body: "Upload a leaf, a wilt, a spot. Vision AI names the problem, gives the next step, and cites the guide behind the call.",
          },
          {
            icon: <BookIcon />,
            title: "Verified citations",
            body: "Grounded in 100+ NMSU Extension publications.",
          },
          {
            icon: <CloudIcon />,
            title: "Weather-aware",
            body: "Live NOAA forecast feeds into irrigation and planting advice automatically. No need to say where you are.",
          },
        ]
      : [
          {
            icon: <MicIcon />,
            title: "Voz bilingüe",
            body: "Hable en español o inglés. Rosa se adapta al vocabulario que usan los agricultores del suroeste.",
          },
          {
            icon: <CameraIcon />,
            title: "Diagnóstico por foto",
            body: "Suba una hoja, una marchitez, una mancha. La IA identifica el problema, da el siguiente paso, y cita la guía.",
          },
          {
            icon: <BookIcon />,
            title: "Citas verificadas",
            body: "Respaldada por 100+ publicaciones de NMSU Extension.",
          },
          {
            icon: <CloudIcon />,
            title: "Consciente del clima",
            body: "El pronóstico NOAA en vivo alimenta las recomendaciones de riego y siembra automáticamente.",
          },
        ];

  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
          <SceneImage lang={lang} />
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35 }}
              className="text-[32px] text-ink sm:text-[38px]"
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </motion.h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {items.map((it, i) => (
                <motion.article
                  key={it.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="rounded-3xl border border-line bg-card p-5 shadow-sm"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-chile/10 text-chile">
                    {it.icon}
                  </span>
                  <h3
                    className="mt-4 text-[17px] leading-tight text-ink"
                    style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
                  >
                    {it.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mutedink">
                    {it.body}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function CloudIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}
