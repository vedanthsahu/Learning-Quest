import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFlight, useI18n } from "@/lib/locale";
import { useScrollRaf } from "@/lib/scroll";
import { useUIStore } from "@/lib/store";

/* ------------------------------------------------------------------ */
/* Scroll envelope helpers                                             */
/* ------------------------------------------------------------------ */

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** alpha ramps in over [a0,a1] and back out over [b0,b1]. */
function envelope(
  p: number,
  a0: number,
  a1: number,
  b0: number,
  b1: number
): number {
  return smoothstep(a0, a1, p) * (1 - smoothstep(b0, b1, p));
}

function applyPanel(
  el: HTMLDivElement | null,
  last: { current: number },
  alpha: number,
  transform: (a: number) => string
) {
  if (!el) return;
  if (Math.abs(alpha - last.current) < 0.0008) return;
  last.current = alpha;
  el.style.opacity = alpha.toFixed(4);
  el.style.transform = transform(alpha);
  el.style.visibility = alpha < 0.02 ? "hidden" : "visible";
}

const HIDDEN: CSSProperties = {
  opacity: 0,
  visibility: "hidden",
  willChange: "opacity, transform",
};

const PANEL_STYLE: CSSProperties = {
  ...HIDDEN,
  background: "linear-gradient(150deg, rgba(14,20,42,0.94), rgba(6,8,20,0.94))",
  boxShadow:
    "0 0 40px rgba(5,8,20,0.7), 0 0 24px rgba(76,201,240,0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
  backdropFilter: "blur(18px)",
};

const PANEL =
  "hud-corners panel-scroll tw:pointer-events-auto tw:max-h-[calc(100svh-16rem)] tw:lg:max-h-[80vh] tw:max-w-[calc(100vw-5rem)] tw:overflow-y-auto tw:overscroll-contain tw:rounded-2xl tw:border tw:border-hud/25 tw:p-5 tw:sm:p-8";

const CTA =
  "tw:block tw:w-full tw:rounded-full tw:border-0 tw:bg-gradient-to-r tw:from-cyan tw:to-nebula tw:py-3.5 tw:text-center tw:font-display tw:text-lg tw:font-semibold tw:tracking-wide tw:text-space tw:transition tw:hover:brightness-110 tw:active:scale-[0.98]";

const TEXT_LINK =
  "tw:border-0 tw:bg-transparent tw:p-0 tw:py-2 tw:font-mono tw:text-[11px] tw:uppercase tw:tracking-[0.16em] tw:text-star/70 tw:transition-colors tw:hover:text-cyan";

/* ------------------------------------------------------------------ */
/* Small shared bits                                                   */
/* ------------------------------------------------------------------ */

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="tw:m-0 tw:font-mono tw:text-xs tracking-hud tw:text-hud tw:uppercase">
      {children}
    </p>
  );
}

function Pct({ value }: { value: number }) {
  return (
    <span className="tw:ml-auto tw:shrink-0 tw:font-mono tw:text-[11px] tw:tabular-nums tw:text-hud">
      {Math.round(value * 100)}%
    </span>
  );
}

/* ------------------------------------------------------------------ */

export default function SectionOverlays() {
  const { ui } = useI18n();
  const { content, actions } = useFlight();
  const panelsHidden = useUIStore((s) => s.panelsHidden);
  const setPanelsHidden = useUIStore((s) => s.setPanelsHidden);
  const setSelectedProject = useUIStore((s) => s.setSelectedProject);
  const aboutRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const lastAbout = useRef(-1);
  const lastExperience = useRef(-1);
  const lastSkills = useRef(-1);
  const lastProjects = useRef(-1);
  const lastContact = useRef(-1);

  useScrollRaf((p) => {
    // Read non-reactively so the rAF loop always sees the latest flag without
    // re-subscribing. When hidden, force alpha 0 → applyPanel writes opacity 0 +
    // visibility:hidden, so panels vanish AND stop catching touches.
    const hidden = useUIStore.getState().panelsHidden;
    applyPanel(
      aboutRef.current,
      lastAbout,
      hidden ? 0 : envelope(p, 0.205, 0.235, 0.315, 0.34),
      (a) => `translateX(${(-40 * (1 - a)).toFixed(2)}px)`
    );
    applyPanel(
      experienceRef.current,
      lastExperience,
      hidden ? 0 : envelope(p, 0.355, 0.39, 0.475, 0.5),
      (a) => `translateX(${(40 * (1 - a)).toFixed(2)}px)`
    );
    applyPanel(
      skillsRef.current,
      lastSkills,
      hidden ? 0 : envelope(p, 0.51, 0.54, 0.595, 0.62),
      (a) => `translateY(${(-18 * (1 - a)).toFixed(2)}px)`
    );
    applyPanel(
      projectsRef.current,
      lastProjects,
      hidden ? 0 : envelope(p, 0.635, 0.665, 0.775, 0.8),
      (a) => `translateX(${(-28 * (1 - a)).toFixed(2)}px)`
    );
    applyPanel(
      contactRef.current,
      lastContact,
      hidden ? 0 : smoothstep(0.82, 0.875, p),
      (a) => `translateX(${(40 * (1 - a)).toFixed(2)}px)`
    );
  });

  /* ---------------- practice tabs ---------------- */
  const [practiceTab, setPracticeTab] = useState<"challenges" | "revision">("challenges");
  const practice = content.practice;

  /* ---------------- milestone hover chip ---------------- */
  const hoveredId = useUIStore((s) => s.hoveredProject);
  const hovered = hoveredId
    ? (content.projects.find((pr) => pr.id === hoveredId) ?? null)
    : null;

  const build = content.build;
  const next = content.next;

  return (
    <div className="tw:pointer-events-none tw:fixed tw:inset-0 tw:z-10">
      {/* ============ 01 // LIBRARY ============ */}
      <div className="tw:absolute tw:inset-y-0 tw:left-0 tw:flex tw:items-start tw:pt-24 tw:lg:items-center tw:lg:pt-0">
        <section
          ref={aboutRef}
          aria-label="Library"
          data-lenis-prevent
          style={PANEL_STYLE}
          className={`${PANEL} tw:ml-4 tw:w-[470px] tw:lg:ml-16`}
        >
          <Kicker>01 // Library</Kicker>
          <h2 className="tw:m-0 tw:mt-3 tw:font-display tw:text-[28px] tw:font-bold tw:leading-[1.08] tw:text-star tw:sm:text-[40px] tw:sm:leading-[1.05]">
            Knowledge has its <span className="tw:text-cyan">own orbit.</span>
          </h2>
          <p className="tw:m-0 tw:mt-5 tw:text-[15px] tw:leading-relaxed tw:text-white/85">
            {content.books.length} handbooks, read where they live. Choose a
            destination and pick up where you left off.
          </p>
          {next && (
            <button
              type="button"
              onClick={() =>
                actions.openReader({
                  scope: "book",
                  bookId: next.bookId,
                  partIndex: next.partIndex,
                  topicIndex: next.topicIndex,
                })
              }
              className="tw:mt-5 tw:block tw:w-full tw:rounded-xl tw:border tw:border-cyan/40 tw:bg-cyan/10 tw:px-4 tw:py-3 tw:text-left tw:text-star tw:transition-colors tw:hover:bg-cyan/20"
            >
              <span className="tw:block tw:font-mono tw:text-[10px] tw:uppercase tw:tracking-[0.2em] tw:text-cyan">
                Continue reading · {next.bookName}
              </span>
              <span className="tw:mt-1 tw:block tw:text-sm">
                {next.topic.title} <span aria-hidden className="tw:text-cyan">↗</span>
              </span>
            </button>
          )}
          <div className="hud-line tw:mt-6" />
          <ul className="tw:m-0 tw:mt-2 tw:list-none tw:p-0">
            {content.books.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  className="flight-row"
                  onClick={() => actions.navigate({ view: "book", bookId: book.id })}
                >
                  <span
                    aria-hidden
                    className="tw:h-2 tw:w-2 tw:shrink-0 tw:rotate-45"
                    style={{ background: book.color, boxShadow: `0 0 8px ${book.color}` }}
                  />
                  <span className="tw:text-sm tw:leading-snug">{book.name}</span>
                  <Pct value={book.pct} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ============ 02 // PRACTICE ============ */}
      <div className="tw:absolute tw:inset-y-0 tw:right-0 tw:flex tw:items-start tw:pt-24 tw:lg:items-center tw:lg:pt-0">
        <section
          ref={experienceRef}
          aria-label="Practice lab"
          data-lenis-prevent
          style={PANEL_STYLE}
          className={`${PANEL} tw:mr-14 tw:w-[560px] tw:lg:mr-24`}
        >
          <Kicker>02 // Practice lab</Kicker>

          <div className="tw:mt-4 tw:flex tw:gap-3" role="tablist" aria-label="Practice">
            {(
              [
                ["challenges", "Challenges"],
                ["revision", "Revision"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={practiceTab === id}
                onClick={() => setPracticeTab(id)}
                className={`tw:rounded-full tw:border tw:px-5 tw:py-2 tw:font-mono tw:text-xs tw:uppercase tw:tracking-[0.14em] tw:transition-colors ${
                  practiceTab === id
                    ? "tw:border-cyan tw:bg-cyan/15 tw:text-cyan-bright tw:shadow-[0_0_14px_rgba(76,201,240,0.25)]"
                    : "tw:border-white/20 tw:bg-transparent tw:text-star/70 tw:hover:border-white/40 tw:hover:text-star"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {practiceTab === "challenges" ? (
            <div role="tabpanel" aria-label="Challenges">
              <h3 className="tw:m-0 tw:mt-5 tw:font-display tw:text-[18px] tw:font-bold tw:leading-snug tw:text-white tw:sm:text-[22px]">
                Leave theory. <span className="tw:text-cyan">Make contact.</span>
              </h3>
              <p className="tw:m-0 tw:mt-2 tw:font-mono tw:text-[11px] tw:uppercase tw:tracking-[0.18em] tw:text-hud/90">
                {practice.seriesName} · {practice.challengeDone}/{practice.total} built ·{" "}
                {practice.solutionDone} reviewed
              </p>
              <p className="tw:m-0 tw:mt-3 tw:text-[15px] tw:leading-relaxed tw:text-white/85">
                Build it first, struggle honestly, then compare against the
                reference solution. That's where reading turns into skill.
              </p>
              <div className="hud-line tw:mt-4" />
              {practice.nextChallenge ? (
                <button
                  type="button"
                  className="flight-row tw:mt-2"
                  onClick={() =>
                    actions.openReader({
                      scope: "challenge",
                      projectIndex: practice.nextChallengeIndex,
                      side: "challenge",
                    })
                  }
                >
                  <span className="tw:shrink-0 tw:font-mono tw:text-[11px] tw:text-cyan">
                    {practice.nextChallenge.num}
                  </span>
                  <span className="tw:text-sm">
                    Next challenge: {practice.nextChallenge.name}
                  </span>
                  <span aria-hidden className="tw:ml-auto tw:text-cyan">↗</span>
                </button>
              ) : (
                <p className="tw:m-0 tw:mt-4 tw:text-sm tw:text-white/75">
                  Every challenge is built. Review the solutions for a second pass.
                </p>
              )}
              <button
                type="button"
                className={`${CTA} tw:mt-6`}
                onClick={() => actions.navigate({ view: "challenges" })}
              >
                Enter the practice lab
              </button>
            </div>
          ) : (
            <div role="tabpanel" aria-label="Revision">
              <h3 className="tw:m-0 tw:mt-5 tw:font-display tw:text-[18px] tw:font-bold tw:leading-snug tw:text-white tw:sm:text-[22px]">
                Your highlights, <span className="tw:text-cyan">gathered.</span>
              </h3>
              <p className="tw:m-0 tw:mt-3 tw:text-[15px] tw:leading-relaxed tw:text-white/85">
                Every highlight, note and diagram you saved while reading, in
                one place for revision.
              </p>
              <button
                type="button"
                className={`${CTA} tw:mt-6`}
                onClick={() => actions.navigate({ view: "revision" })}
              >
                Open notes & diagrams
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ============ MOMENTUM ============ */}
      <div className="tw:absolute tw:inset-x-0 tw:top-28 tw:flex tw:justify-center">
        <div ref={skillsRef} style={HIDDEN} className="tw:px-6 tw:text-center">
          <Kicker>Momentum</Kicker>
          <h2
            className="tw:m-0 tw:mt-2 tw:font-display tw:text-[28px] tw:font-bold tw:text-star"
            style={{
              textShadow:
                "0 0 24px rgba(76,201,240,0.45), 0 0 64px rgba(124,58,237,0.35)",
            }}
          >
            Your flight log
          </h2>
          <p className="tw:m-0 tw:mt-2 tw:font-mono tw:text-xs tw:uppercase tw:tracking-[0.3em] tw:text-white/40">
            Saved progress · nothing invented
          </p>
        </div>
      </div>

      {/* ============ 03 // BUILD ============ */}
      <div className="tw:absolute tw:left-8 tw:top-28 tw:lg:left-16">
        <div ref={projectsRef} style={HIDDEN} className="tw:max-w-[min(420px,80vw)]">
          <Kicker>03 // Build</Kicker>
          <h2
            className="tw:m-0 tw:mt-2 tw:font-display tw:text-[34px] tw:font-bold tw:text-star"
            style={{ textShadow: "0 0 28px rgba(124,58,237,0.4)" }}
          >
            Incident Command AI
          </h2>
          <p className="tw:m-0 tw:mt-2 tw:font-mono tw:text-[11px] tw:uppercase tw:tracking-[0.18em] tw:text-hud/90">
            {build.done}/{build.total} core steps verified
          </p>
          <p className="tw:m-0 tw:mt-3 tw:animate-blink tw:font-mono tw:text-xs tw:uppercase tw:tracking-[0.2em] tw:text-hud">
            Select a milestone in orbit
          </p>
          <div className="tw:pointer-events-auto tw:mt-3 tw:flex tw:flex-wrap tw:gap-x-5">
            <button
              type="button"
              className={TEXT_LINK}
              onClick={() => actions.navigate({ view: "incident-project" })}
            >
              Open the workspace ↗
            </button>
            {/* Keyboard/screen-reader route to the same milestone briefs the
                3D cards open. */}
            <details className="tw:font-mono tw:text-[11px] tw:text-star/70">
              <summary className="tw:cursor-pointer tw:py-2 tw:uppercase tw:tracking-[0.16em] tw:hover:text-cyan">
                List milestones
              </summary>
              <ul className="glass tw:m-0 tw:mt-2 tw:list-none tw:rounded-xl tw:p-2">
                {content.projects.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="flight-row tw:min-h-0 tw:py-2 tw:text-xs tw:normal-case"
                      onClick={() => setSelectedProject(m.id)}
                    >
                      <span>{m.title}</span>
                      <span className="tw:ml-auto tw:tabular-nums tw:text-hud">
                        {m.done}/{m.total}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </div>

      {/* target-locked hint chip */}
      <div className="tw:absolute tw:bottom-8 tw:right-8">
        <AnimatePresence mode="wait">
          {hovered && (
            <motion.div
              key={hovered.id}
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="glass tw:flex tw:items-center tw:gap-2.5 tw:rounded-full tw:px-4 tw:py-2"
            >
              <span className="tw:block tw:h-1.5 tw:w-1.5 tw:rotate-45 tw:animate-blink tw:bg-cyan tw:shadow-[0_0_8px_rgba(76,201,240,0.9)]" />
              <span className="tw:font-mono tw:text-[10px] tw:uppercase tw:tracking-[0.22em] tw:text-hud">
                {`Target locked // ${hovered.title.toUpperCase()}`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============ 04 // ARRIVE ============ */}
      <div className="tw:absolute tw:inset-y-0 tw:right-0 tw:flex tw:items-start tw:pt-24 tw:lg:items-center tw:lg:pt-0">
        <section
          ref={contactRef}
          aria-label="Arrival"
          data-lenis-prevent
          style={PANEL_STYLE}
          className={`${PANEL} tw:mr-14 tw:w-[460px] tw:lg:mr-24`}
        >
          <Kicker>04 // Arrival</Kicker>
          <h2 className="tw:m-0 tw:mt-2 tw:font-display tw:text-[26px] tw:font-bold tw:leading-[1.1] tw:text-star tw:sm:text-[34px] tw:sm:leading-[1.08]">
            Docked. <span className="tw:text-cyan">Ready</span> to build.
          </h2>
          <p className="tw:m-0 tw:mt-4 tw:text-[15px] tw:leading-relaxed tw:text-white/80">
            {build.next
              ? `Next step: ${build.next.title}. ${build.next.outcome}`
              : "Core journey complete. Review your evidence and explore the optional experiments."}
          </p>

          <button
            type="button"
            className={`${CTA} tw:mt-7`}
            onClick={() => actions.navigate({ view: "incident-project" })}
          >
            Open Incident Command
          </button>
          <p className="tw:m-0 tw:mt-3 tw:text-center tw:font-mono tw:text-[10px] tw:uppercase tw:tracking-[0.22em] tw:text-white/40">
            {build.done}/{build.total} core steps verified · {build.percent}%
          </p>

          <div className="hud-line tw:mt-6" />

          <div className="tw:mt-4 tw:flex tw:flex-wrap tw:gap-x-5">
            <button type="button" className={TEXT_LINK} onClick={() => actions.navigate({ view: "dashboard" })}>
              Dashboard ↗
            </button>
            <button type="button" className={TEXT_LINK} onClick={() => actions.navigate({ view: "achievements" })}>
              Achievements ↗
            </button>
            <button type="button" className={TEXT_LINK} onClick={() => actions.navigate({ view: "profile" })}>
              Profile ↗
            </button>
          </div>

          <p className="tw:m-0 tw:mt-5 tw:font-mono tw:text-[10px] tw:leading-relaxed tw:tracking-[0.14em] tw:text-white/35">
            FLIGHT ADAPTED FROM JORDAN PEREZ&apos;S SPACE PORTFOLIO ·{" "}
            <a
              className="tw:text-white/55 tw:underline tw:underline-offset-4 tw:hover:text-cyan"
              href="/space/credits.html"
              target="_blank"
              rel="noreferrer"
            >
              ASSETS & CREDITS
            </a>
          </p>
        </section>
      </div>

      {/* Mobile: fade the text panels out to admire the scene behind them.
          Lives outside the panels (applyPanel never touches it) so it stays
          tappable while everything else is hidden. */}
      <button
        type="button"
        aria-label={panelsHidden ? ui.panels.show : ui.panels.hide}
        aria-pressed={panelsHidden}
        onClick={() => setPanelsHidden(!panelsHidden)}
        className="tw:pointer-events-auto tw:absolute tw:right-4 tw:bottom-[max(1.25rem,env(safe-area-inset-bottom))] tw:z-20 tw:flex tw:h-11 tw:w-11 tw:items-center tw:justify-center tw:rounded-full tw:border tw:border-hud/25 tw:bg-space/70 tw:text-star/80 tw:backdrop-blur-md tw:transition-colors tw:hover:text-cyan tw:lg:hidden"
      >
        {panelsHidden ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.4 5.2A9.3 9.3 0 0112 5c5 0 9 4.5 9 7-.3.9-1 1.9-2 2.9M6.1 6.1C3.9 7.4 2.3 9.6 2 12c0 2.5 4 7 10 7a9.7 9.7 0 004-.8" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
