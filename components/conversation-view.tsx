"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StateOrb } from "@/components/state-orb";
import { StatusStrip } from "@/components/status-strip";
import { MicAmplitude } from "@/components/mic-amplitude";
import { Transcript } from "@/components/transcript";
import { CitationPanel } from "@/components/citation-panel";
import { useStrings } from "@/lib/i18n";
import { useLangStore } from "@/lib/lang-store";
import { usePhaseStore } from "@/lib/phase-store";

type Props = {
  mediaStream: MediaStream | null;
  onClose: () => void;
  onPickPhoto: (file: File) => void;
  onSendText: (text: string) => void;
  errorMessage?: string | null;
};

export function ConversationView({
  mediaStream,
  onClose,
  onPickPhoto,
  onSendText,
  errorMessage,
}: Props) {
  const phase = usePhaseStore((s) => s.phase);
  const searchInfo = usePhaseStore((s) => s.searchInfo);
  const t = useStrings();

  const [muted, setMuted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const toggleMute = () => {
    if (!mediaStream) return;
    const next = !muted;
    mediaStream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  };

  // If the stream changes (new session), reset mute state.
  useEffect(() => {
    setMuted(false);
  }, [mediaStream]);

  const micActive = (phase === "listening" || phase === "idle") && !muted;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-40 flex flex-col bg-paper"
    >
      <StatusStrip phase={phase} searchInfo={searchInfo} muted={muted} />

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="hidden lg:block lg:w-[340px] lg:shrink-0" />

        <main className="flex flex-1 flex-col overflow-hidden px-5 pb-28 pt-6 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="flex flex-col items-center gap-4"
          >
            <StateOrb phase={phase} searchInfo={searchInfo} size={260} />
            <MicAmplitude stream={mediaStream} active={micActive} />
          </motion.div>

          {errorMessage && (
            <pre className="mx-auto mt-6 max-w-2xl overflow-auto whitespace-pre-wrap rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-ink">
              {errorMessage}
            </pre>
          )}

          <div className="mx-auto mt-6 flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
            <Transcript />
          </div>
        </main>

        <aside className="hidden border-l border-line lg:block lg:w-[340px] lg:shrink-0 lg:overflow-y-auto">
          <CitationPanel />
        </aside>
      </div>

      <ActionBar
        muted={muted}
        onToggleMute={toggleMute}
        onOpenChat={() => setChatOpen(true)}
        onPickPhoto={onPickPhoto}
        onClose={onClose}
        uploadLabel={t.upload}
      />

      <AnimatePresence>
        {chatOpen && (
          <ChatOverlay
            onClose={() => setChatOpen(false)}
            onSend={(text) => {
              onSendText(text);
              setChatOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionBar({
  muted,
  onToggleMute,
  onOpenChat,
  onPickPhoto,
  onClose,
  uploadLabel,
}: {
  muted: boolean;
  onToggleMute: () => void;
  onOpenChat: () => void;
  onPickPhoto: (file: File) => void;
  onClose: () => void;
  uploadLabel: string;
}) {
  const lang = useLangStore((s) => s.lang);
  const muteLabel = muted
    ? lang === "en"
      ? "Unmute"
      : "Activar micrófono"
    : lang === "en"
      ? "Mute"
      : "Silenciar";
  const chatLabel = lang === "en" ? "Chat" : "Escribir";
  const endLabel = lang === "en" ? "End call" : "Terminar";

  return (
    <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-3">
        <IconButton
          onClick={onToggleMute}
          label={muteLabel}
          active={muted}
          variant={muted ? "destructive" : "ghost"}
        >
          {muted ? <MicOffIcon /> : <MicIcon />}
        </IconButton>

        <IconButton onClick={onOpenChat} label={chatLabel} variant="ghost">
          <ChatIcon />
        </IconButton>

        <label
          className="inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-ink transition-colors hover:bg-secondary"
          aria-label={uploadLabel}
          title={uploadLabel}
        >
          <CameraIcon />
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickPhoto(f);
              e.target.value = "";
            }}
          />
        </label>

        <IconButton onClick={onClose} label={endLabel} variant="primary">
          <EndCallIcon />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  variant = "ghost",
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  variant?: "ghost" | "primary" | "destructive";
  active?: boolean;
}) {
  const base =
    "inline-flex h-14 w-14 items-center justify-center rounded-full border transition-colors";
  const styles =
    variant === "primary"
      ? "bg-chile text-white border-chile hover:bg-chile-deep"
      : variant === "destructive"
        ? "bg-destructive text-white border-destructive hover:opacity-90"
        : active
          ? "bg-secondary text-ink border-line"
          : "bg-card text-ink border-line hover:bg-secondary";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`${base} ${styles}`}
    >
      {children}
    </button>
  );
}

function ChatOverlay({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const lang = useLangStore((s) => s.lang);
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.form
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed bottom-28 left-1/2 z-[61] -translate-x-1/2 w-[min(640px,calc(100vw-32px))] rounded-3xl border border-line bg-card p-3 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = text.trim();
          if (!trimmed) return;
          onSend(trimmed);
        }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              lang === "en" ? "Type your message…" : "Escriba su mensaje…"
            }
            className="h-11 min-w-0 flex-1 rounded-full border border-line bg-paper px-5 text-[15px] text-ink placeholder:text-mutedink/70 focus:border-chile focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label={lang === "en" ? "Send" : "Enviar"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-chile text-white transition-opacity hover:bg-chile-deep disabled:opacity-40"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === "en" ? "Close" : "Cerrar"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper text-mutedink transition-colors hover:bg-secondary hover:text-ink"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </motion.form>
    </>
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
      aria-hidden
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
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
      aria-hidden
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ChatIcon() {
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
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
      aria-hidden
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function EndCallIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M21 15.46l-5.27-.61-2.52 2.52a15.05 15.05 0 0 1-6.59-6.58l2.53-2.52L8.54 3H3.03A17 17 0 0 0 21 20.97z" />
    </svg>
  );
}
