import { create } from "zustand";

export type Phase =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "searching"
  | "speaking"
  | "error";

export interface SearchInfo {
  tool: "search_nmsu" | "web_search_fallback" | "cite_nmsu_doc" | string;
  query?: string;
  doc_id?: string;
  pub_number?: string;
}

interface PhaseState {
  phase: Phase;
  searchInfo: SearchInfo | null;
  setPhase: (p: Phase) => void;
  setSearchInfo: (info: SearchInfo | null) => void;
  reset: () => void;
}

export const usePhaseStore = create<PhaseState>((set) => ({
  phase: "idle",
  searchInfo: null,
  setPhase: (p) => set({ phase: p }),
  setSearchInfo: (info) => set({ searchInfo: info }),
  reset: () => set({ phase: "idle", searchInfo: null }),
}));
