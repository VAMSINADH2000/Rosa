import { create } from "zustand";

export type Lang = "es" | "en";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

// In-memory only for now. Phase 6 will persist alongside the user profile.
export const useLangStore = create<LangState>((set) => ({
  lang: "es",
  setLang: (l) => set({ lang: l }),
}));
