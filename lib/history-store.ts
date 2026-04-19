import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Turn } from "./transcript-store";
import type { Citation } from "./citation-store";
import type { Lang } from "./lang-store";

export interface Session {
  id: string;
  started_at: string;
  ended_at: string;
  lang: Lang;
  turns: Turn[];
  citations: Citation[];
}

interface HistoryState {
  sessions: Session[];
  saveSession: (s: Omit<Session, "id">) => void;
  clear: () => void;
}

const MAX_SESSIONS = 50;

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      sessions: [],
      saveSession: (s) =>
        set((state) => {
          // Skip empty sessions (no turns and no citations).
          if (s.turns.length === 0 && s.citations.length === 0) return state;
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          return {
            sessions: [{ ...s, id }, ...state.sessions].slice(0, MAX_SESSIONS),
          };
        }),
      clear: () => set({ sessions: [] }),
    }),
    {
      name: "rosa-history",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
