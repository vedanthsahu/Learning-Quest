import { motion, type Variants } from "framer-motion";
import { useRef } from "react";
import { useFlight } from "@/lib/locale";
import { stepScroll, useScrollRaf } from "@/lib/scroll";

function smoothstep(p: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { delayChildren: 1.2, staggerChildren: 0.14 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Thin vertical telemetry tick line. */
function VLine({ h = 56 }: { h?: number }) {
  return (
    <span
      aria-hidden
      className="tw:block tw:w-px"
      style={{
        height: h,
        background:
          "linear-gradient(180deg, transparent, rgba(154,220,255,0.6) 20%, rgba(154,220,255,0.6) 80%, transparent)",
      }}
    />
  );
}

function TelemetrySquare() {
  return (
    <span aria-hidden className="tw:block tw:h-1.5 tw:w-1.5 tw:border tw:border-hud/70" />
  );
}

export default function HeroOverlay() {
  const { content, actions } = useFlight();
  const rootRef = useRef<HTMLDivElement>(null);
  const next = content.next;

  useScrollRaf((p) => {
    const el = rootRef.current;
    if (!el) return;
    const t = smoothstep(p, 0.02, 0.1);
    el.style.opacity = String(1 - t);
    el.style.transform = `translateY(${-40 * t}px)`;
    el.style.visibility = t >= 0.999 ? "hidden" : "visible";
  });

  return (
    <div ref={rootRef} className="tw:pointer-events-none tw:fixed tw:inset-0 tw:z-10 tw:will-change-transform">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="tw:relative tw:h-full tw:w-full"
      >
        {/* Identity — centered band between the nav and the rocket */}
        <div className="tw:absolute tw:inset-x-6 tw:top-[11%] tw:flex tw:flex-col tw:items-center tw:gap-6 tw:text-center">
          {/* Status chip flanked by HUD lines */}
          <motion.div variants={item} className="tw:flex tw:max-w-full tw:items-center tw:gap-4">
            <span aria-hidden className="hud-line tw:hidden tw:sm:block tw:sm:w-28" />
            <span className="glass tw:flex tw:items-center tw:gap-2.5 tw:rounded-2xl tw:px-4 tw:py-2 tw:sm:rounded-full tw:sm:px-5">
              <span
                aria-hidden
                className="tw:h-1.5 tw:w-1.5 tw:shrink-0 tw:animate-blink tw:rounded-full tw:bg-cyan tw:shadow-[0_0_10px_rgba(76,201,240,0.9)]"
              />
              <span className="tw:text-center tw:font-mono tw:text-[10px] tw:uppercase tw:tracking-[0.14em] tw:text-hud tw:sm:whitespace-nowrap tw:sm:tracking-[0.28em] tw:lg:text-[11px]">
                {`Level ${content.level.number} · ${content.level.title} · ${content.level.xp} XP`}
              </span>
            </span>
            <span aria-hidden className="hud-line tw:hidden tw:sm:block tw:sm:w-28" />
          </motion.div>

          {/* Title — gradient fill over a soft glow layer */}
          <motion.h1
            variants={item}
            className="tw:relative tw:m-0 tw:font-display tw:text-5xl tw:font-bold tw:uppercase tw:leading-none tw:tracking-[0.05em] tw:lg:text-7xl"
          >
            <span
              aria-hidden
              className="tw:absolute tw:inset-0 tw:select-none tw:bg-gradient-to-b tw:from-white tw:to-[#7df9ff] tw:bg-clip-text tw:text-transparent tw:opacity-50 tw:blur-[16px]"
            >
              Learning Quest
            </span>
            <span className="tw:relative tw:bg-gradient-to-b tw:from-white tw:from-40% tw:via-[#e8f4ff] tw:to-[#8fd8f8] tw:bg-clip-text tw:text-transparent tw:drop-shadow-[0_2px_18px_rgba(76,201,240,0.35)]">
              Learning Quest
            </span>
          </motion.h1>

          {/* Flourish */}
          <motion.div variants={item} className="tw:flex tw:items-center tw:gap-3 tw:opacity-80">
            <span
              aria-hidden
              className="tw:h-px tw:w-20"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(154,220,255,0.7))",
              }}
            />
            <span
              aria-hidden
              className="tw:h-1.5 tw:w-1.5 tw:rotate-45 tw:border tw:border-cyan/80 tw:bg-cyan/20 tw:shadow-[0_0_8px_rgba(76,201,240,0.6)]"
            />
            <span
              aria-hidden
              className="tw:h-px tw:w-20"
              style={{
                background:
                  "linear-gradient(90deg, rgba(154,220,255,0.7), transparent)",
              }}
            />
          </motion.div>

          <motion.p
            variants={item}
            className="tw:m-0 tw:max-w-md tw:text-[15px] tw:leading-relaxed tw:text-white/75"
          >
            Your handbooks, practice lab and next build — one flight, entirely yours.
          </motion.p>

          {next && (
            <motion.button
              variants={item}
              type="button"
              onClick={() =>
                actions.openReader({
                  scope: "book",
                  bookId: next.bookId,
                  partIndex: next.partIndex,
                  topicIndex: next.topicIndex,
                })
              }
              className="glass tw:pointer-events-auto tw:flex tw:max-w-[min(92vw,520px)] tw:items-center tw:gap-3 tw:rounded-full tw:px-5 tw:py-2.5 tw:text-left tw:text-star tw:transition-colors tw:hover:border-cyan/60"
            >
              <span className="tw:shrink-0 tw:font-mono tw:text-[10px] tw:uppercase tw:tracking-[0.2em] tw:text-cyan">
                Continue
              </span>
              <span className="tw:truncate tw:text-sm">{next.topic.title}</span>
              <span aria-hidden className="tw:text-cyan">↗</span>
            </motion.button>
          )}
        </div>

        {/* Right telemetry column */}
        <motion.div
          variants={item}
          className="tw:absolute tw:right-6 tw:top-1/2 tw:hidden tw:-translate-y-1/2 tw:flex-col tw:items-center tw:gap-4 tw:opacity-40 tw:lg:flex tw:lg:right-10"
        >
          <TelemetrySquare />
          <VLine h={40} />
          <p className="tw:m-0 tw:font-mono tw:text-[9px] tw:uppercase tw:tracking-[0.28em] tw:text-hud tw:[writing-mode:vertical-rl]">
            ALT +000.4
          </p>
          <VLine h={64} />
          <TelemetrySquare />
          <p className="tw:m-0 tw:font-mono tw:text-[9px] tw:uppercase tw:tracking-[0.28em] tw:text-hud tw:[writing-mode:vertical-rl]">
            THR 000%
          </p>
          <VLine h={40} />
          <TelemetrySquare />
        </motion.div>

        {/* Scroll indicator (desktop only — mobile uses the on-screen rocker) */}
        <motion.div
          variants={item}
          className="tw:absolute tw:bottom-10 tw:left-1/2 tw:hidden tw:-translate-x-1/2 tw:items-center tw:gap-6 tw:sm:flex"
        >
          <span className="hud-line tw:hidden tw:w-40 tw:sm:block" />
          <span className="tw:whitespace-nowrap tw:font-mono tw:text-[10px] tw:uppercase tracking-hud tw:text-hud/80">
            Scroll to
          </span>
          <button
            type="button"
            aria-label="Begin the flight"
            onClick={() => stepScroll(true)}
            className="tw:pointer-events-auto tw:flex tw:h-11 tw:w-7 tw:items-start tw:justify-center tw:rounded-full tw:border tw:border-hud/50 tw:bg-transparent tw:p-0 tw:pt-2 tw:shadow-[0_0_16px_rgba(76,201,240,0.15)]"
          >
            <span className="tw:h-2 tw:w-1 tw:animate-scroll-dot tw:rounded-full tw:bg-cyan-bright tw:shadow-[0_0_8px_rgba(125,249,255,0.9)]" />
          </button>
          <span className="tw:whitespace-nowrap tw:font-mono tw:text-[10px] tw:uppercase tracking-hud tw:text-hud/80">
            launch
          </span>
          <span className="hud-line tw:hidden tw:w-40 tw:sm:block" />
        </motion.div>
      </motion.div>
    </div>
  );
}
