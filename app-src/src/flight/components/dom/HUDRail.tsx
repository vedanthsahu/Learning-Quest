import { useRef } from "react";
import { SECTIONS, sectionAt } from "@/lib/journey";
import { useI18n } from "@/lib/locale";
import { scrollToSection, useCurrentSection, useScrollRaf } from "@/lib/scroll";

export default function HUDRail() {
  const { ui } = useI18n();
  const LABELS = ui.sections;
  const current = useCurrentSection();

  const fillRef = useRef<HTMLDivElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const velRef = useRef<HTMLSpanElement>(null);
  const secRef = useRef<HTMLSpanElement>(null);
  const cache = useRef({ fill: "", alt: "", vel: "", sec: "", lastText: 0 });

  useScrollRaf((p, v) => {
    const c = cache.current;

    // Fill via transform — composited, never triggers layout
    const fill = p.toFixed(4);
    if (fill !== c.fill && fillRef.current) {
      c.fill = fill;
      fillRef.current.style.transform = `scaleY(${fill})`;
    }

    // Text readouts tick at ~8Hz like real telemetry — text mutations
    // invalidate layout, so keep them off the per-frame path
    const now = performance.now();
    if (now - c.lastText < 120) return;
    c.lastText = now;

    const alt = `ALT +${(p * 420).toFixed(1)} KM`;
    if (alt !== c.alt && altRef.current) {
      c.alt = alt;
      altRef.current.textContent = alt;
    }

    const vel = `VEL ${(Math.abs(v) * 2400).toFixed(0)} M/S`;
    if (vel !== c.vel && velRef.current) {
      c.vel = vel;
      velRef.current.textContent = vel;
    }

    const sec = `SEC // ${LABELS[sectionAt(p)].toUpperCase()}`;
    if (sec !== c.sec && secRef.current) {
      c.sec = sec;
      secRef.current.textContent = sec;
    }
  });

  return (
    <div className="tw:pointer-events-none tw:fixed tw:right-6 tw:top-1/2 tw:z-30 tw:hidden tw:-translate-y-1/2 tw:flex-col tw:items-center tw:gap-0 tw:lg:flex">
      {/* flight-progress rail */}
      <div className="tw:relative tw:h-[240px] tw:w-px tw:bg-white/15">
        {/* progress fill */}
        <div
          ref={fillRef}
          className="tw:absolute tw:left-0 tw:top-0 tw:h-full tw:w-full tw:origin-top tw:bg-gradient-to-b tw:from-cyan-bright tw:via-cyan tw:to-nebula tw:shadow-[0_0_8px_rgba(76,201,240,0.7)]"
          style={{ transform: "scaleY(0)" }}
        />

        {/* section ticks */}
        {SECTIONS.map((s) => {
          const active = current === s.id;
          return (
            <button
              key={s.id}
              type="button"
              data-cursor="hover"
              aria-label={`${ui.goTo} ${LABELS[s.id]}`}
              onClick={() => scrollToSection(s.id)}
              className="tw:group tw:pointer-events-auto tw:absolute tw:left-1/2 tw:flex tw:h-5 tw:w-5 tw:-translate-x-1/2 tw:-translate-y-1/2 tw:items-center tw:justify-center"
              style={{ top: `${s.range[0] * 100}%` }}
            >
              <span
                className={`tw:block tw:h-2 tw:w-2 tw:rotate-45 tw:border tw:transition-all tw:duration-300 ${
                  active
                    ? "tw:border-cyan tw:bg-cyan tw:shadow-[0_0_10px_rgba(76,201,240,0.9)]"
                    : "tw:border-white/40 tw:bg-space/70 tw:group-hover:border-cyan-bright tw:group-hover:shadow-[0_0_8px_rgba(125,249,255,0.5)]"
                }`}
              />
              <span className="tw:pointer-events-none tw:absolute tw:right-full tw:top-1/2 tw:mr-3 tw:-translate-y-1/2 tw:whitespace-nowrap tw:font-mono tw:text-[10px] tw:uppercase tw:tracking-[0.25em] tw:text-hud tw:opacity-0 tw:transition-opacity tw:duration-200 tw:group-hover:opacity-100">
                {LABELS[s.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* live telemetry */}
      <div className="tw:mt-6 tw:text-right tw:font-mono tw:text-[9px] tw:leading-relaxed tw:text-hud/70">
        <span ref={altRef} className="tw:block" />
        <span ref={velRef} className="tw:block" />
        <span ref={secRef} className="tw:block" />
      </div>
    </div>
  );
}
