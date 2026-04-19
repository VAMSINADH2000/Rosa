"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  stream: MediaStream | null;
  active: boolean;
  bars?: number;
};

// Reads the local mic stream via Web Audio AnalyserNode, renders N bars whose
// heights track low-frequency energy. Bars go muted when `active` is false
// (e.g., Rosa is speaking and we don't care about user amplitude).
export function MicAmplitude({ stream, active, bars = 9 }: Props) {
  const [levels, setLevels] = useState<number[]>(() => Array(bars).fill(0));
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);

    ctxRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const groupSize = Math.floor(analyser.frequencyBinCount / bars);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const next: number[] = [];
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < groupSize; j++) {
          sum += data[i * groupSize + j] ?? 0;
        }
        const avg = sum / groupSize / 255;
        // Emphasis curve: quiet speech still shows as visible motion.
        next.push(Math.min(1, Math.pow(avg, 0.8) * 1.4));
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        source.disconnect();
      } catch {
        /* noop */
      }
      try {
        void ctx.close();
      } catch {
        /* noop */
      }
      ctxRef.current = null;
      sourceRef.current = null;
      analyserRef.current = null;
    };
  }, [stream, bars]);

  return (
    <div
      className="flex items-end gap-[6px]"
      style={{ height: 44 }}
      aria-hidden
    >
      {levels.map((v, i) => {
        const h = active ? 4 + v * 40 : 4;
        return (
          <span
            key={i}
            className="rounded-full transition-colors"
            style={{
              width: 4,
              height: `${h}px`,
              background: active
                ? v > 0.12
                  ? "var(--chile)"
                  : "var(--line)"
                : "var(--line)",
              transition: "height 60ms ease-out, background 200ms",
            }}
          />
        );
      })}
    </div>
  );
}
