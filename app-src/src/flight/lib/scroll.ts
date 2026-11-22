import Lenis from "lenis";
import { useEffect, useState } from "react";
import {
  impactProgress,
  sectionAnchor,
  sectionAt,
  WAYPOINTS,
  type SectionId,
} from "./journey";

/**
 * Shared, mutable scroll state. Canvas components read this inside
 * useFrame (no React re-renders). DOM components that need reactivity
 * use the hooks below or motion's useScroll.
 */
export const scrollState = {
  /** Raw scroll progress 0..1 across the whole page. */
  progress: 0,
  /** Progress units per second, signed. Feeds the warp/thrust effects. */
  velocity: 0,
  /**
   * SLOW-MOTION finale playback: eases toward impactProgress(progress) over
   * a few seconds so the detonation unfolds cinematically on its own once
   * you reach the end — not frame-locked to how fast you scroll. Still
   * reverses if you scroll back up. Every finale effect reads THIS.
   */
  impact: 0,
  /**
   * Free-look offsets (radians), applied by the CameraRig after its lookAt —
   * FPS-style. The mobile drag writes the targets; the rig damps toward them.
   * Desktop leaves them 0 (mouse parallax covers it).
   */
  lookYaw: 0,
  lookPitch: 0,
};

/** Easing rate for the slow-mo blast — ~0.7 ⇒ ≈4s to fully play out. */
const IMPACT_LAMBDA = 0.7;
/**
 * Reverse rate: scrolling back UP should REWIND the blast responsively —
 * hugging the scrollbar so the explosion visibly plays backward instead of
 * hanging in the air while it slowly fades. Much faster than the forward
 * slow-mo, so the finale is fully scrubbable on the way out.
 */
const IMPACT_REVERSE_LAMBDA = 9;

let lenis: Lenis | null = null;

/**
 * Shared prefers-reduced-motion flag (SSR-safe, tracks OS changes). One
 * mechanism for the CameraRig, environment, and anything else that animates.
 */
let reducedMotion = false;
if (typeof window !== "undefined" && "matchMedia" in window) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = mq.matches;
  mq.addEventListener?.("change", (e) => {
    reducedMotion = e.matches;
  });
}
/**
 * LearningQuest: the app's own "Quiet" motion preference counts as reduced
 * motion too. It's pushed in from the PreferencesProvider.
 */
let appReducedMotion = false;
export function setAppReducedMotion(v: boolean) {
  appReducedMotion = v;
}
export function prefersReducedMotion(): boolean {
  return reducedMotion || appReducedMotion;
}

/**
 * LearningQuest: while the reader, a quiz or a dialog sits over the flight,
 * smooth scroll and the keyboard flight controls stand down so the overlay
 * scrolls and handles keys natively.
 */
let scrollLocked = false;
export function setScrollLocked(locked: boolean) {
  scrollLocked = locked;
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

/**
 * A scroll-height reference that ignores the mobile URL-bar show/hide. That
 * bar changes only window.innerHeight; if progress is divided by
 * (scrollHeight - innerHeight) it jumps every time the bar toggles, which made
 * the whole scene flicker dark/light on phones. We snapshot the height and
 * only refresh it on a real resize (width/orientation change).
 */
let stableH = 0;
function scrollMax(): number {
  const h = stableH || window.innerHeight;
  return Math.max(1, document.documentElement.scrollHeight - h);
}

export function initSmoothScroll(): () => void {
  if (lenis) return () => {};

  stableH = window.innerHeight;
  let lastW = window.innerWidth;
  const onResize = () => {
    if (window.innerWidth !== lastW) {
      lastW = window.innerWidth;
      stableH = window.innerHeight;
    }
  };
  window.addEventListener("resize", onResize);

  lenis = new Lenis({
    duration: 1.35,
    // Reduced motion keeps scroll-driven travel but drops the glide.
    smoothWheel: !prefersReducedMotion(),
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
  // Handle for programmatic scroll (nav, tests, console debugging)
  (window as unknown as { __lenis: Lenis }).__lenis = lenis;

  let lastP = 0;
  let lastT = performance.now();
  let raf = 0;

  const loop = (time: number) => {
    lenis?.raf(time);
    const max = scrollMax();
    const p = Math.min(1, Math.max(0, window.scrollY / max));
    const now = performance.now();
    const dt = Math.max(1, now - lastT) / 1000;
    // Low-pass the velocity so single wheel ticks don't spike the warp
    const instV = (p - lastP) / dt;
    scrollState.velocity += (instV - scrollState.velocity) * Math.min(1, dt * 8);
    scrollState.progress = p;
    // Slow-motion finale: ease the impact value toward the scroll target.
    // Frame-rate-independent (exp form stays stable through long frames).
    // Asymmetric — cinematic slow-mo playing FORWARD into the blast, but a
    // snappy rewind when scrolling back UP so the explosion reverses with
    // the scrollbar instead of lingering.
    const targetImpact = impactProgress(p);
    const lambda =
      targetImpact >= scrollState.impact
        ? IMPACT_LAMBDA
        : IMPACT_REVERSE_LAMBDA;
    scrollState.impact +=
      (targetImpact - scrollState.impact) * (1 - Math.exp(-lambda * dt));
    lastP = p;
    lastT = now;
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    lenis?.destroy();
    lenis = null;
  };
}

/** Ease the free-look back to center — movement recenters the view (game feel). */
function recenterLook() {
  scrollState.lookYaw = 0;
  scrollState.lookPitch = 0;
}

export function scrollToSection(id: SectionId) {
  recenterLook();
  const y = sectionAnchor(id) * scrollMax();
  if (lenis) {
    lenis.scrollTo(y, { duration: 2.2, immediate: prefersReducedMotion() });
  } else {
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "instant" : "smooth" });
  }
}

/**
 * Step to the next/previous content waypoint — shared by the keyboard flight
 * controls and the mobile on-screen controls so both never skip a beat.
 */
export function stepScroll(forward: boolean) {
  recenterLook();
  const cur = scrollState.progress;
  const eps = 0.004;
  let target: number | undefined;
  if (forward) target = WAYPOINTS.find((p) => p > cur + eps);
  else
    for (let i = WAYPOINTS.length - 1; i >= 0; i--)
      if (WAYPOINTS[i] < cur - eps) {
        target = WAYPOINTS[i];
        break;
      }
  if (target == null) target = forward ? 1 : 0;
  const y = target * scrollMax();
  if (lenis) lenis.scrollTo(y, { duration: 0.9, immediate: prefersReducedMotion() });
  else window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "instant" : "smooth" });
}

/** Reactive current-section id (updates only on section change). */
export function useCurrentSection(): SectionId {
  const [section, setSection] = useState<SectionId>("hero");
  useEffect(() => {
    let raf = 0;
    let last: SectionId = "hero";
    const tick = () => {
      const s = sectionAt(scrollState.progress);
      if (s !== last) {
        last = s;
        setSection(s);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return section;
}

/**
 * Keyboard flight controls. Flight metaphor (WASD-style), NOT native scroll:
 *   forward / "continue" → ArrowUp · W · ArrowRight
 *   back                 → ArrowDown · S · ArrowLeft
 * So Up/W advances the journey (scrolls the page down) — the opposite of the
 * browser default, matching how W means "forward" in a cockpit. Wheel, touch,
 * and the scrollbar keep their normal direction.
 */
export function useKeyboardScroll() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (scrollLocked) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.closest("[role='dialog']") ||
          el.isContentEditable)
      )
        return;

      const k = e.key.toLowerCase();
      const forward = k === "arrowup" || k === "arrowright" || k === "w";
      const back = k === "arrowdown" || k === "arrowleft" || k === "s";
      if (!forward && !back) return;

      e.preventDefault();
      stepScroll(forward);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * Subscribe a callback to scroll progress on rAF — for DOM elements that
 * animate with scroll without re-rendering (write styles imperatively).
 */
export function useScrollRaf(cb: (progress: number, velocity: number) => void) {
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      cb(scrollState.progress, scrollState.velocity);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
