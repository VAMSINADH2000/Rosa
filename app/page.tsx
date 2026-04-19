"use client";

import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { Hero } from "@/components/hero";
import { VoicePanel } from "@/components/voice-panel";
import { HistoryDrawer } from "@/components/history-drawer";
import { LandingSections } from "@/components/landing-sections";

export default function Home() {
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);

  return (
    <>
      <TopBar onOpenHistory={() => setHistoryOpen(true)} />
      <main className="flex flex-col">
        <div className="flex min-h-[calc(100vh-4rem)] flex-col">
          <Hero
            onTalk={() => setVoiceOpen(true)}
            onPickPhoto={(file) => {
              setPendingPhoto(file);
              setVoiceOpen(true);
            }}
          />
        </div>
        <LandingSections />
      </main>
      <VoicePanel
        open={voiceOpen}
        onClose={() => {
          setVoiceOpen(false);
          setPendingPhoto(null);
        }}
        pendingPhoto={pendingPhoto}
        onPendingPhotoConsumed={() => setPendingPhoto(null)}
      />
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
