import { useProgress } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/locale";
import { useUIStore } from "@/lib/store";

const MIN_SHOW_MS = 1400;
const FORCE_HIDE_MS = 9000;

/**
 * LearningQuest: the flight remounts every time you come back from a work
 * screen. Assets are cached by then, so the full loader only plays once per
 * session; returns go straight back into the scene.
 */
let shownThisSession = false;

function RocketGlyph() {
  return (
    <svg
      width="30"
      height="44"
      viewBox="0 0 32 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Capsule body */}
      <path
        d="M16 2 C21.5 8 23 15.5 23 23.5 L23 34 L9 34 L9 23.5 C9 15.5 10.5 8 16 2 Z"
        fill="#eef2ff"
      />
      {/* Fins */}
      <path d="M9 25 L2.5 36.5 L9 37.5 Z" fill="#c7d2fe" />
      <path d="M23 25 L29.5 36.5 L23 37.5 Z" fill="#c7d2fe" />
      {/* Nozzle */}
      <path d="M12 34 L20 34 L18.5 38 L13.5 38 Z" fill="#8b93b8" />
      {/* Window */}
      <circle
        cx="16"
        cy="17.5"
        r="3.6"
        fill="#4cc9f0"
        stroke="#7df9ff"
        strokeWidth="1"
      />
      {/* Exhaust */}
      <ellipse
        className="tw:animate-blink"
        cx="16"
        cy="42.5"
        rx="3"
        ry="4"
        fill="#7df9ff"
        opacity="0.85"
      />
    </svg>
  );
}

export default function Loader() {
  const { ui } = useI18n();
  const ready = useUIStore((s) => s.ready);
  const { progress } = useProgress();
  const [minElapsed, setMinElapsed] = useState(false);
  const [forced, setForced] = useState(false);
  const [gone, setGone] = useState(shownThisSession);

  useEffect(() => {
    const a = window.setTimeout(() => setMinElapsed(true), MIN_SHOW_MS);
    const b = window.setTimeout(() => setForced(true), FORCE_HIDE_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  const complete = ready || forced;
  const hidden = (ready && minElapsed) || forced;

  // Bar tracks real download progress; holds at 96% while shaders compile,
  // snaps to 100% the instant the scene is ready.
  const pct = complete ? 100 : Math.min(Math.round(progress), 96);

  // Hard unmount fallback: the exit fade is rAF-driven and freezes in
  // background tabs — this timeout guarantees the overlay is removed.
  useEffect(() => {
    if (!hidden) return;
    const t = window.setTimeout(() => setGone(true), 1000);
    return () => window.clearTimeout(t);
  }, [hidden]);

  if (hidden) shownThisSession = true;
  if (gone) return null;

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="tw:pointer-events-auto tw:fixed tw:inset-0 tw:z-[58] tw:flex tw:items-center tw:justify-center tw:bg-[#02010a]"
          aria-label="Loading"
        >
          <div className="tw:flex tw:flex-col tw:items-center tw:gap-8">
            {/* HUD ring + rocket */}
            <div className="tw:relative tw:grid tw:h-24 tw:w-24 tw:place-items-center">
              <div
                className="tw:absolute tw:inset-0 tw:animate-spin-slow tw:rounded-full tw:border tw:border-dashed tw:border-cyan/60"
                style={{
                  boxShadow:
                    "0 0 22px rgba(76,201,240,0.35), inset 0 0 18px rgba(76,201,240,0.12)",
                }}
              />
              <div
                className="tw:absolute tw:inset-2 tw:rounded-full tw:border tw:border-hud/15"
                aria-hidden
              />
              <RocketGlyph />
            </div>

            <p className="tw:font-mono tw:text-[10px] tw:uppercase tracking-hud tw:text-hud">
              {ui.loader}
            </p>

            {/* Progress bar — driven by real download progress */}
            <div className="tw:h-[3px] tw:w-[240px] tw:overflow-hidden tw:rounded-full tw:bg-white/10">
              <motion.div
                className="tw:h-full tw:rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, #7c3aed, #4cc9f0 70%, #7df9ff)",
                  boxShadow: "0 0 12px rgba(76,201,240,0.8)",
                }}
                initial={{ width: "0%" }}
                animate={{ width: `${pct}%` }}
                transition={
                  complete
                    ? { duration: 0.35, ease: "easeOut" }
                    : { duration: 0.4, ease: "easeOut" }
                }
              />
            </div>

            <p className="tw:font-mono tw:text-[10px] tracking-hud tw:text-hud/60 tw:tabular-nums">
              {pct}%
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
