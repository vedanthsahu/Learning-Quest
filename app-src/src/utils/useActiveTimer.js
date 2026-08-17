import { useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT_MS = 40000; // no mouse/scroll/key activity for 40s -> idle, timer pauses
const FLUSH_INTERVAL_MS = 15000; // hand accumulated active seconds to the caller every 15s

// Tracks "real" active reading time for whatever is currently mounted: only ticks while
// the tab is visible AND there's been recent user activity. Silent background tabs and
// walked-away-from-keyboard time are excluded automatically.
export function useActiveTimer(onFlush) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const accumulatedRef = useRef(0);
  const onFlushRef = useRef(onFlush);
  onFlushRef.current = onFlush;

  useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    events.forEach((e) => window.addEventListener(e, markActivity, { passive: true }));

    const tick = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      const visible = document.visibilityState === "visible";
      const active = visible && idleFor < IDLE_TIMEOUT_MS;
      setIsActive(active);
      if (active) {
        accumulatedRef.current += 1;
        setElapsedSeconds((e) => e + 1);
      }
    }, 1000);

    const flush = setInterval(() => {
      if (accumulatedRef.current > 0) {
        const delta = accumulatedRef.current;
        accumulatedRef.current = 0;
        onFlushRef.current?.(delta);
      }
    }, FLUSH_INTERVAL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActivity));
      clearInterval(tick);
      clearInterval(flush);
      if (accumulatedRef.current > 0) {
        onFlushRef.current?.(accumulatedRef.current);
        accumulatedRef.current = 0;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { elapsedSeconds, isActive };
}
