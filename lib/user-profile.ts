import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface UserProfile {
  name: string;
  zip_or_city: string;
  crops: string[];
  years_farming: number;
  last_session?: string;
}

interface UserProfileState {
  profile: UserProfile | null;
  saveProfile: (p: UserProfile) => void;
  touchSession: () => void;
  clear: () => void;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      saveProfile: (p) =>
        set({ profile: { ...p, last_session: new Date().toISOString() } }),
      touchSession: () => {
        const cur = get().profile;
        if (!cur) return;
        set({
          profile: { ...cur, last_session: new Date().toISOString() },
        });
      },
      clear: () => set({ profile: null }),
    }),
    {
      name: "rosa-user-profile",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
