"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Phase, SearchInfo } from "@/lib/phase-store";

type Props = {
  phase: Phase;
  searchInfo: SearchInfo | null;
  size?: number;
};

// Rosa's face is always at the center. State is communicated by the ring
// and glow around her — six distinct visuals so the farmer knows at a glance
// what's happening.
export function StateOrb({ phase, searchInfo, size = 260 }: Props) {
  const dim = `${size}px`;
  const portraitSize = Math.round(size * 0.74);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: dim, height: dim }}
      aria-live="polite"
      aria-label={`Rosa state: ${phase}`}
    >
      {/* Glow + ring layers (phase-specific) go BEHIND the portrait */}
      {phase === "connecting" && <ConnectingLayer size={size} />}
      {phase === "listening" && <ListeningLayer size={size} />}
      {phase === "thinking" && <ThinkingLayer size={size} />}
      {phase === "searching" && <SearchingLayer size={size} />}
      {phase === "speaking" && <SpeakingLayer size={size} />}
      {phase === "error" && <ErrorLayer size={size} />}
      {phase === "idle" && <IdleLayer size={size} />}

      {/* Rosa portrait — always visible, subtly scales when speaking */}
      <motion.div
        className="relative overflow-hidden rounded-full border-[3px] shadow-[0_8px_40px_rgba(216,74,34,0.22)]"
        style={{
          width: portraitSize,
          height: portraitSize,
          borderColor: "var(--chile)",
        }}
        animate={
          phase === "speaking"
            ? { scale: [1, 1.035, 1] }
            : phase === "listening"
              ? { scale: [1, 1.012, 1] }
              : { scale: 1 }
        }
        transition={
          phase === "speaking"
            ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
            : phase === "listening"
              ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
        }
      >
        <Image
          src="/rosa-logo.png"
          alt=""
          fill
          sizes={`${portraitSize}px`}
          className={`object-cover ${phase === "error" ? "grayscale" : ""}`}
          priority
        />
      </motion.div>

      {/* Searching info badge below portrait */}
      {phase === "searching" && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={searchInfo?.pub_number ?? searchInfo?.query ?? "searching"}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 rounded-full border border-chile/30 bg-card px-3 py-1 text-[11px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <span className="uppercase tracking-[0.14em] text-chile">
                {searchInfo?.tool === "web_search_fallback" ? "Web" : "NMSU"}
              </span>
              <span className="max-w-[200px] truncate text-ink">
                {searchInfo?.pub_number ?? searchInfo?.query ?? "…"}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function Ring({
  size,
  color,
  strokeWidth = 3,
  dashed = false,
  opacity = 1,
}: {
  size: number;
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
  opacity?: number;
}) {
  const r = size / 2 - strokeWidth;
  return (
    <svg width={size} height={size} className="absolute inset-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "8 6" : undefined}
        strokeLinecap="round"
        opacity={opacity}
      />
    </svg>
  );
}

function IdleLayer({ size }: { size: number }) {
  return <Ring size={size} color="var(--line)" strokeWidth={2} />;
}

function ConnectingLayer({ size }: { size: number }) {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 3, ease: "linear", repeat: Infinity }}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 3}
          fill="none"
          stroke="var(--chile)"
          strokeWidth={3}
          strokeDasharray={`${size * 1.2} ${size * 2}`}
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

function ListeningLayer({ size }: { size: number }) {
  return (
    <>
      <motion.div
        className="absolute inset-0"
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.95, 0.6] }}
        transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
      >
        <Ring size={size} color="var(--healthy)" strokeWidth={3} />
      </motion.div>
      <div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle, rgba(94,122,63,0.14) 0%, transparent 70%)",
        }}
      />
    </>
  );
}

function ThinkingLayer({ size }: { size: number }) {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 4, ease: "linear", repeat: Infinity }}
    >
      <Ring size={size} color="var(--amber)" strokeWidth={3} dashed />
    </motion.div>
  );
}

function SearchingLayer({ size }: { size: number }) {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 3}
          fill="none"
          stroke="var(--chile)"
          strokeWidth={3}
          strokeDasharray={`${size * 0.42} ${size * 1.25}`}
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

function SpeakingLayer({ size }: { size: number }) {
  return (
    <>
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle, rgba(216,74,34,0.28) 0%, transparent 68%)",
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
      />
      <Ring size={size} color="var(--chile)" strokeWidth={3} />
    </>
  );
}

function ErrorLayer({ size }: { size: number }) {
  return <Ring size={size} color="var(--destructive)" strokeWidth={3} />;
}
