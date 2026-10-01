import { motion } from "framer-motion";
import { useRef } from "react";
import type { SectionId } from "@/lib/journey";
import { useFlight, useI18n } from "@/lib/locale";
import { scrollToSection, useCurrentSection, useScrollRaf } from "@/lib/scroll";

export default function Navbar() {
  const { ui } = useI18n();
  const { actions } = useFlight();
  const barRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  const LINKS: { id: SectionId; num: string; label: string }[] = [
    { id: "about", num: "01", label: ui.sections.about },
    { id: "experience", num: "02", label: ui.sections.experience },
    { id: "projects", num: "03", label: ui.sections.projects },
    { id: "contact", num: "04", label: ui.sections.contact },
  ];

  // hero/launch/skills aren't nav links — no link is active during those.
  const active: SectionId = useCurrentSection();

  useScrollRaf((p) => {
    const scrolled = p > 0.02;
    if (scrolled === scrolledRef.current) return;
    scrolledRef.current = scrolled;
    const bar = barRef.current;
    const line = lineRef.current;
    if (!bar || !line) return;
    bar.classList.toggle("glass", scrolled);
    line.style.opacity = scrolled ? "1" : "0";
  });

  const pill =
    "tw:rounded-full tw:border tw:border-cyan/60 tw:bg-transparent tw:px-4 tw:py-2 tw:font-mono tw:text-[11px] tw:uppercase tw:tracking-[0.2em] tw:text-cyan-bright tw:transition-all tw:duration-300 tw:hover:bg-cyan/15 tw:hover:shadow-[0_0_24px_rgba(76,201,240,0.4)] tw:sm:px-6";
  const ghost =
    "tw:border-0 tw:bg-transparent tw:p-2 tw:font-mono tw:text-[10px] tw:uppercase tw:tracking-[0.18em] tw:text-star/60 tw:transition-colors tw:duration-300 tw:hover:text-star";

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="tw:pointer-events-none tw:fixed tw:inset-x-0 tw:top-0 tw:z-40"
    >
      <div
        ref={barRef}
        className="tw:relative tw:flex tw:h-20 tw:w-full tw:items-center tw:justify-between tw:px-5 tw:transition-[background,box-shadow] tw:duration-500 tw:sm:px-8 tw:lg:px-14"
      >
        {/* Menu + logo */}
        <div className="tw:pointer-events-auto tw:flex tw:items-center tw:gap-3">
          <button
            type="button"
            onClick={actions.toggleMenu}
            aria-label="Open LearningQuest menu"
            className="tw:flex tw:h-10 tw:w-10 tw:items-center tw:justify-center tw:rounded-full tw:border tw:border-hud/25 tw:bg-space/40 tw:text-star/80 tw:transition-colors tw:hover:border-cyan tw:hover:text-cyan"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("hero")}
            className="tw:border-0 tw:bg-transparent tw:p-0"
            aria-label="Back to launch"
          >
            <span className="tw:font-display tw:text-2xl tw:font-bold tw:leading-none tw:text-star">
              lq<span className="tw:text-cyan">.</span>
            </span>
          </button>
        </div>

        {/* Center links */}
        <nav
          aria-label="Flight sections"
          className="tw:pointer-events-auto tw:absolute tw:left-1/2 tw:hidden tw:-translate-x-1/2 tw:items-center tw:gap-9 tw:lg:flex"
        >
          {LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <button
                key={link.id}
                type="button"
                aria-current={isActive ? "step" : undefined}
                onClick={() => scrollToSection(link.id)}
                className={`tw:relative tw:border-0 tw:bg-transparent tw:px-0 tw:py-2 tw:font-mono tw:text-[11px] tw:uppercase tw:tracking-[0.22em] tw:transition-colors tw:duration-300 ${
                  isActive ? "tw:text-cyan" : "tw:text-star/60 tw:hover:text-star"
                }`}
              >
                <span className="tw:mr-1.5 tw:text-[9px] tw:text-cyan">{link.num}.</span>
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="tw:absolute tw:inset-x-0 tw:-bottom-px tw:h-px tw:bg-cyan tw:shadow-[0_0_10px_rgba(76,201,240,0.9)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Motion + work surfaces */}
        <div className="tw:pointer-events-auto tw:flex tw:items-center tw:gap-2 tw:sm:gap-4">
          <button
            type="button"
            className={ghost}
            aria-pressed={actions.reduced}
            onClick={actions.toggleMotion}
            title="Quiet motion keeps scroll travel but drops parallax, shake and glide"
          >
            {actions.reduced ? "Quiet" : "Motion"}
          </button>
          <button
            type="button"
            className={pill}
            onClick={() => actions.navigate({ view: "dashboard" })}
          >
            Dashboard ↗
          </button>
        </div>

        {/* Bottom hairline — appears once scrolled */}
        <div
          ref={lineRef}
          className="hud-line tw:absolute tw:inset-x-0 tw:bottom-0 tw:opacity-0 tw:transition-opacity tw:duration-500"
        />
      </div>
    </motion.header>
  );
}
