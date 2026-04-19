import { create } from "zustand";

export interface Citation {
  doc_id: string;
  passage?: string;
  ts: number;
}

interface CitationState {
  citations: Citation[];
  addCitation: (c: Omit<Citation, "ts">) => void;
  clear: () => void;
}

const DEDUPE_WINDOW_MS = 30_000;

export const useCitationStore = create<CitationState>((set, get) => ({
  citations: [],
  addCitation: (c) => {
    const now = Date.now();
    const recent = get().citations.find(
      (x) => x.doc_id === c.doc_id && now - x.ts < DEDUPE_WINDOW_MS,
    );
    if (recent) return;
    set((s) => ({ citations: [...s.citations, { ...c, ts: now }] }));
  },
  clear: () => set({ citations: [] }),
}));
