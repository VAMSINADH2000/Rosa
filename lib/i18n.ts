import { useLangStore, type Lang } from "./lang-store";

const STRINGS = {
  es: {
    statusConnected: "Conectada",
    statusInCall: "En conversación",
    talk: "Hablar con Rosa",
    upload: "Subir foto",
    greeting: "Buenas. Soy Rosa, su consejera agrícola.",
    intro:
      "Cuénteme qué le está pasando en la finca. Lo resolvemos juntos.",
    rosa: "Rosa",
    you: "Usted",
    citedGuides: "Guías citadas",
    citedGuidesEmpty:
      "Cuando Rosa cite una publicación de NMSU Extension, la verá aquí con el enlace a la guía completa.",
    readFullGuide: "Leer la guía completa",
    close: "Cerrar",
    statusReady: "Lista",
    statusConnecting: "Conectando…",
    statusLive: "Hablando con Rosa",
    statusError: "Hubo un problema",
    transcriptEmpty: "La transcripción aparecerá aquí mientras hablan.",
    speakWhenReady: "Hable cuando quiera. Rosa la está escuchando.",
    langEs: "Español",
    langEn: "English",
  },
  en: {
    statusConnected: "Connected",
    statusInCall: "In conversation",
    talk: "Talk with Rosa",
    upload: "Upload photo",
    greeting: "Hi. I'm Rosa, your farm advisor.",
    intro:
      "Let me know what you're dealing with on the farm. We can figure it out together.",
    rosa: "Rosa",
    you: "You",
    citedGuides: "Cited guides",
    citedGuidesEmpty:
      "When Rosa cites an NMSU Extension publication, you'll see it here with a link to the full guide.",
    readFullGuide: "Read full guide",
    close: "Close",
    statusReady: "Ready",
    statusConnecting: "Connecting…",
    statusLive: "Talking with Rosa",
    statusError: "Something went wrong",
    transcriptEmpty: "The transcript will appear here as you speak.",
    speakWhenReady: "Speak whenever. Rosa is listening.",
    langEs: "Español",
    langEn: "English",
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["es"];

export function useStrings() {
  const lang = useLangStore((s) => s.lang);
  return STRINGS[lang];
}

export function getStrings(lang: Lang) {
  return STRINGS[lang];
}
