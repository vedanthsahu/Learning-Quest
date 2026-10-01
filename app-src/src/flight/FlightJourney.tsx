import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "./flight.css";
import { TOTAL_PAGES } from "@/lib/journey";
import {
  initSmoothScroll,
  scrollState,
  setAppReducedMotion,
  setScrollLocked,
  useKeyboardScroll,
} from "@/lib/scroll";
import { FlightProvider, UI, type FlightActions } from "@/lib/locale";
import type { FlightContent } from "@/lib/data";
import Loader from "@/components/dom/Loader";
import Navbar from "@/components/dom/Navbar";
import HeroOverlay from "@/components/dom/HeroOverlay";
import SectionOverlays from "@/components/dom/SectionOverlays";
import ProjectModal from "@/components/dom/ProjectModal";
import HUDRail from "@/components/dom/HUDRail";
import SectionDots from "@/components/dom/SectionDots";
import MobileControls from "@/components/dom/MobileControls";
import ImpactFlash from "@/components/dom/ImpactFlash";
import { useUIStore } from "@/lib/store";

const Experience = lazy(() => import("@/components/canvas/Experience"));

/**
 * Where the flight was when you left it for a work screen, so coming back
 * resumes the same spot instead of relaunching from the pad.
 */
let resumeProgress = 0;

/** WebGL creation can throw synchronously inside <Canvas>. */
class GLBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("LearningQuest flight: 3D scene failed", error);
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Shown if WebGL is unavailable or the GPU drops the context. */
function GLFallback({ onRetry, onDashboard }: { onRetry: () => void; onDashboard: () => void }) {
  return (
    // Sits behind the overlays (which stay fully usable) instead of blocking them.
    <div
      className="tw:fixed tw:inset-0 tw:z-[1] tw:flex tw:flex-col tw:items-center tw:justify-end tw:gap-4 tw:px-6 tw:pb-28 tw:text-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, rgba(76,201,240,0.16), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(124,58,237,0.18), transparent 50%), #050310",
      }}
    >
      <p role="status" className="tw:m-0 tw:max-w-sm tw:text-sm tw:font-medium tw:text-white/80">
        {UI.fallback.title}
      </p>
      <div className="tw:flex tw:flex-wrap tw:justify-center tw:gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="tw:rounded-full tw:border tw:border-white/20 tw:bg-white/10 tw:px-6 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-white tw:transition-colors tw:hover:bg-white/20"
        >
          {UI.fallback.retry}
        </button>
        <button
          type="button"
          onClick={onDashboard}
          className="tw:rounded-full tw:border tw:border-cyan/60 tw:bg-transparent tw:px-6 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-cyan-bright tw:transition-colors tw:hover:bg-cyan/15"
        >
          {UI.fallback.dashboard}
        </button>
      </div>
    </div>
  );
}

export default function FlightJourney({
  content,
  actions,
  paused,
}: {
  content: FlightContent;
  actions: FlightActions;
  /** Reader, quiz or menu is covering the flight. */
  paused: boolean;
}) {
  const [fontsReady, setFontsReady] = useState(false);
  const [fatal, setFatal] = useState(false);
  const [glKey, setGlKey] = useState(0);
  const modalOpen = useUIStore((s) => !!s.selectedProject);
  useKeyboardScroll();

  // Resume where the last flight left off (before Lenis reads scroll).
  useEffect(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (resumeProgress > 0 && max > 0) {
      window.scrollTo({ top: resumeProgress * max, behavior: "instant" });
    }
    return () => {
      resumeProgress = scrollState.progress;
      useUIStore.getState().setSelectedProject(null);
      useUIStore.getState().setHoveredProject(null);
    };
  }, []);

  // Smooth scroll; rebuilt when Quiet motion toggles so the glide follows it.
  useEffect(() => {
    setAppReducedMotion(actions.reduced);
    return initSmoothScroll();
  }, [actions.reduced]);

  useEffect(() => {
    setScrollLocked(paused || modalOpen);
  }, [paused, modalOpen]);
  useEffect(() => () => setScrollLocked(false), []);

  // Canvas card/label textures are drawn with these faces — make sure they're
  // loaded before the scene paints them (canvas text doesn't wait for fonts).
  useEffect(() => {
    let alive = true;
    Promise.all(
      [
        "700 52px 'Space Grotesk'",
        "400 26px 'Space Grotesk'",
        "600 26px 'JetBrains Mono'",
        "500 20px 'JetBrains Mono'",
        "700 44px 'JetBrains Mono'",
      ].map((font) => document.fonts.load(font))
    )
      .catch(() => {})
      .then(() => document.fonts.ready)
      .then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onFatal = () => setFatal(true);
    window.addEventListener("gl-fatal", onFatal);
    return () => window.removeEventListener("gl-fatal", onFatal);
  }, []);

  return (
    <FlightProvider value={{ content, actions }}>
      <div className="flight-root">
        {/* Scroll runway — the journey lives in this scroll distance */}
        <div aria-hidden style={{ height: `${TOTAL_PAGES * 100}vh` }} />

        {/* 3D scene (fixed, behind everything) */}
        {fontsReady && !fatal && (
          <GLBoundary key={glKey} onFail={() => setFatal(true)}>
            <Suspense fallback={null}>
              <Experience content={content} paused={paused} />
            </Suspense>
          </GLBoundary>
        )}

        {/* DOM overlay */}
        <Navbar />
        <HeroOverlay />
        <SectionOverlays />
        <HUDRail />
        <SectionDots />
        <MobileControls />
        <ProjectModal />
        <ImpactFlash />
        {!fatal && <Loader />}
        {fatal && (
          <GLFallback
            onRetry={() => {
              setFatal(false);
              setGlKey((k) => k + 1);
            }}
            onDashboard={() => actions.navigate({ view: "dashboard" })}
          />
        )}
      </div>
    </FlightProvider>
  );
}
