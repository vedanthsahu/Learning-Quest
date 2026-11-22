import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFlight } from "@/lib/locale";
import { useUIStore } from "@/lib/store";

/** Milestone brief — opened by clicking an orbiting card (or the list). */
export default function ProjectModal() {
  const { content, actions } = useFlight();
  const selectedProject = useUIStore((s) => s.selectedProject);
  const setSelectedProject = useUIStore((s) => s.setSelectedProject);
  const closeRef = useRef<HTMLButtonElement>(null);
  const project = selectedProject
    ? (content.projects.find((p) => p.id === selectedProject) ?? null)
    : null;

  // ESC closes; focus moves into the dialog and back out on close
  useEffect(() => {
    if (!selectedProject) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedProject(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [selectedProject, setSelectedProject]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          key={project.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="tw:fixed tw:inset-0 tw:z-50 tw:flex tw:items-center tw:justify-center tw:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={project.title}
          data-lenis-prevent
        >
          {/* backdrop */}
          <div
            className="tw:absolute tw:inset-0 tw:bg-black/70 tw:backdrop-blur-md"
            onClick={() => setSelectedProject(null)}
          />

          {/* panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 26, mass: 0.9 }}
            className="glass panel-scroll tw:relative tw:max-h-[90svh] tw:w-[92vw] tw:max-w-2xl tw:overflow-y-auto tw:rounded-3xl tw:p-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* banner */}
            <div
              className="tw:relative tw:h-36"
              style={{
                background: `linear-gradient(120deg, ${project.colorA}, ${project.colorB})`,
              }}
            >
              <div
                className="tw:absolute tw:inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(2,1,10,0.88), rgba(2,1,10,0.2) 55%, transparent 82%)",
                }}
              />
              <span className="tw:absolute tw:left-8 tw:top-5 tw:font-mono tw:text-[10px] tw:uppercase tw:tracking-[0.3em] tw:text-white/70">
                Milestone brief
              </span>
              <div className="tw:absolute tw:bottom-4 tw:left-8 tw:right-16">
                <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
                  {project.featured && (
                    <span className="tw:rounded-full tw:border tw:border-cyan/40 tw:px-3 tw:py-1 tw:font-mono tw:text-[10px] tw:uppercase tw:text-cyan">
                      Next up
                    </span>
                  )}
                  <span className="tw:font-mono tw:text-[10px] tw:uppercase tracking-hud tw:text-white/70">
                    {project.meta}
                  </span>
                </div>
                <h2 className="tw:m-0 tw:mt-2 tw:font-display tw:text-2xl tw:font-bold tw:text-white">
                  {project.title}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setSelectedProject(null)}
                aria-label="Close milestone"
                className="tw:absolute tw:right-4 tw:top-4 tw:flex tw:h-10 tw:w-10 tw:items-center tw:justify-center tw:rounded-full tw:border tw:border-white/20 tw:bg-black/20 tw:text-white/80 tw:transition-colors tw:hover:border-cyan tw:hover:text-cyan"
              >
                ✕
              </button>
            </div>

            {/* body */}
            <div className="tw:p-8">
              <p className="tw:m-0 tw:font-display tw:text-lg tw:font-medium tw:text-cyan">
                {project.tagline}
              </p>

              <ul className="tw:m-0 tw:mt-5 tw:list-none tw:space-y-3 tw:p-0">
                {project.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="tw:flex tw:gap-3 tw:text-sm tw:leading-relaxed tw:text-white/80"
                  >
                    <span
                      aria-hidden
                      className={`tw:mt-0.5 tw:shrink-0 ${task.done ? "tw:text-cyan" : "tw:text-white/35"}`}
                    >
                      {task.done ? "✓" : "○"}
                    </span>
                    <span>
                      {task.title}
                      <span className="tw:sr-only">{task.done ? " (verified)" : " (open)"}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="tw:mt-8 tw:flex tw:items-center tw:justify-between tw:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProject(null);
                    actions.navigate({ view: "incident-project" });
                  }}
                  className="tw:rounded-full tw:border-0 tw:bg-gradient-to-r tw:from-cyan tw:to-nebula tw:px-6 tw:py-2.5 tw:font-display tw:text-sm tw:font-semibold tw:uppercase tw:tracking-wide tw:text-space tw:transition tw:hover:brightness-110 tw:active:scale-[0.98]"
                >
                  Open in workspace ▸
                </button>
                <span className="tw:ml-auto tw:hidden tw:font-mono tw:text-[10px] tw:tracking-[0.24em] tw:text-white/30 tw:sm:inline">
                  MISSION FILE // {project.id.toUpperCase()}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
