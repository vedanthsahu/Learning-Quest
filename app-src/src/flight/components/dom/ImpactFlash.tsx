import { useRef } from "react";
import { scrollState, useScrollRaf } from "@/lib/scroll";

/**
 * A full-frame flash that briefly blows out the whole viewport — UI
 * included — at the instant the rocket detonates against the sun. Driven
 * straight off scroll progress so it's scrubbable, and it fires the moment
 * the impact ramp opens (razor spike, gone within a breath).
 */
function spike(e: number, a0: number, a1: number, b0: number, b1: number) {
  const up = Math.min(1, Math.max(0, (e - a0) / (a1 - a0)));
  const dn = 1 - Math.min(1, Math.max(0, (e - b0) / (b1 - b0)));
  return up * up * (3 - 2 * up) * (dn * dn * (3 - 2 * dn));
}

export default function ImpactFlash() {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef(-1);

  useScrollRaf(() => {
    const el = ref.current;
    if (!el) return;
    const e = scrollState.impact;
    // Sub-second white-hot bloom then a fast warm afterglow tail
    const a = spike(e, 0.0, 0.06, 0.1, 0.28) * 0.92;
    if (Math.abs(a - last.current) < 0.004) return;
    last.current = a;
    el.style.opacity = a.toFixed(3);
    el.style.visibility = a < 0.004 ? "hidden" : "visible";
  });

  return (
    <div
      ref={ref}
      aria-hidden
      className="tw:pointer-events-none tw:fixed tw:inset-0 tw:z-[55]"
      style={{
        opacity: 0,
        visibility: "hidden",
        background:
          "radial-gradient(circle at 34% 52%, #ffffff 0%, #fff4de 30%, #ffd9a0 60%, rgba(255,180,90,0) 100%)",
        mixBlendMode: "screen",
        willChange: "opacity",
      }}
    />
  );
}
