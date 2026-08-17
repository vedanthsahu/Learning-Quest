import { useEffect, useState, useRef } from "react";

// Produces small, irregularly-timed "alive" gestures (a head tilt, a glance) instead of a
// perfectly looping animation -- true idle-animal stillness reads as "dormant"; unpredictable
// micro-movements read as "alive." Returns { tilt, glance } that drift back to neutral.
export function useRandomGesture() {
  const [tilt, setTilt] = useState(0);
  const [glance, setGlance] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    function schedule() {
      const delay = 2200 + Math.random() * 3800;
      timerRef.current = setTimeout(() => {
        const dir = Math.random() > 0.5 ? 1 : -1;
        setTilt(dir * (4 + Math.random() * 7));
        setGlance(dir * (3 + Math.random() * 4));
        setTimeout(() => {
          setTilt(0);
          setGlance(0);
        }, 500 + Math.random() * 300);
        schedule();
      }, delay);
    }
    schedule();
    return () => clearTimeout(timerRef.current);
  }, []);

  return { tilt, glance };
}
