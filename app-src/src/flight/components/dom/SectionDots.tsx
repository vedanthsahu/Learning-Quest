import { motion } from "framer-motion";
import type { SectionId } from "@/lib/journey";
import { useI18n } from "@/lib/locale";
import { scrollToSection, useCurrentSection } from "@/lib/scroll";

/**
 * Mobile-only progress + section-jump rail. The desktop Navbar hides its
 * section links below `lg`, so on phones this vertical dot rail is how you see
 * where you are in the flight and jump between stops. Hidden on `lg+`.
 */
const DOT_IDS: SectionId[] = [
  "hero",
  "about",
  "experience",
  "skills",
  "projects",
  "contact",
];

export default function SectionDots() {
  const { ui } = useI18n();
  const DOTS = DOT_IDS.map((id) => ({ id, label: ui.sections[id] }));
  const current = useCurrentSection();
  // "launch" is the brief takeoff transition — keep Home lit through it.
  const activeId: SectionId = current === "launch" ? "hero" : current;

  return (
    <motion.nav
      aria-label="Sections"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
      className="tw:pointer-events-auto tw:fixed tw:right-2 tw:top-1/2 tw:z-40 tw:flex tw:-translate-y-1/2 tw:flex-col tw:items-end tw:gap-0.5 tw:lg:hidden"
    >
      {DOTS.map((d) => {
        const active = d.id === activeId;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => scrollToSection(d.id)}
            aria-label={`${ui.goTo} ${d.label}`}
            aria-current={active ? "step" : undefined}
            className="tw:flex tw:h-11 tw:items-center tw:justify-end tw:gap-2 tw:pl-4 tw:pr-1"
          >
            <span
              className={`tw:font-mono tw:text-[9px] tw:uppercase tw:tracking-[0.2em] tw:text-cyan tw:transition-opacity tw:duration-300 ${
                active ? "tw:opacity-100" : "tw:opacity-0"
              }`}
            >
              {d.label}
            </span>
            <span
              className={`tw:block tw:shrink-0 tw:rounded-full tw:transition-all tw:duration-300 ${
                active
                  ? "tw:h-2.5 tw:w-2.5 tw:bg-cyan tw:shadow-[0_0_10px_rgba(76,201,240,0.9)]"
                  : "tw:h-1.5 tw:w-1.5 tw:bg-white/30"
              }`}
            />
          </button>
        );
      })}
    </motion.nav>
  );
}
