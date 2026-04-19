import { create } from "zustand";

export type Role = "user" | "rosa";

export interface Turn {
  id: string;
  role: Role;
  text: string;
  done: boolean;
  ts: number;
  photo_url?: string;
}

interface TranscriptState {
  turns: Turn[];
  appendDelta: (id: string, role: Role, delta: string) => void;
  complete: (id: string, finalText?: string) => void;
  setPhotoUrl: (id: string, photo_url: string) => void;
  reset: () => void;
}

export const useTranscriptStore = create<TranscriptState>((set, get) => ({
  turns: [],
  appendDelta: (id, role, delta) => {
    const existing = get().turns.find((t) => t.id === id);
    if (existing) {
      set((s) => ({
        turns: s.turns.map((t) =>
          t.id === id ? { ...t, text: t.text + delta } : t,
        ),
      }));
    } else {
      set((s) => ({
        turns: [
          ...s.turns,
          { id, role, text: delta, done: false, ts: Date.now() },
        ],
      }));
    }
  },
  complete: (id, finalText) => {
    set((s) => ({
      turns: s.turns.map((t) =>
        t.id === id
          ? { ...t, done: true, text: finalText ?? t.text }
          : t,
      ),
    }));
  },
  setPhotoUrl: (id, photo_url) => {
    set((s) => ({
      turns: s.turns.map((t) =>
        t.id === id ? { ...t, photo_url } : t,
      ),
    }));
  },
  reset: () => set({ turns: [] }),
}));
