import { motion } from "framer-motion";
import { useRandomGesture } from "../utils/useRandomGesture";

// Companion for the AI Systems Handbook -- alert, quick, a little mischievous.
export default function Fox({ level = 1, mood = "idle", size = 140 }) {
  const sleepy = mood === "sleepy";
  const happy = mood === "happy" || mood === "levelup";
  const levelup = mood === "levelup";
  const idle = !sleepy && !happy;
  const { tilt, glance } = useRandomGesture();

  const eyeState = sleepy ? { scaleY: 0.12, x: 0 } : { scaleY: [1, 1, 0.15, 1], x: idle ? glance : 0 };
  const eyeTransition = sleepy
    ? { duration: 0.3 }
    : { scaleY: { duration: 3.6, repeat: Infinity, times: [0, 0.9, 0.94, 1] }, x: { duration: 0.5 } };

  return (
    <motion.div
      style={{ width: size, height: size, position: "relative", display: "inline-block" }}
      animate={
        levelup
          ? { y: [0, -18, 0], rotate: [0, -6, 6, 0] }
          : happy
          ? { y: [0, -8, 0], rotate: 0 }
          : { y: [0, -3, 0], rotate: tilt }
      }
      transition={{
        y: { duration: levelup ? 0.9 : happy ? 1.0 : 2.3, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 0.5, ease: "easeOut" },
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        {/* Cape (level 7+) */}
        {level >= 7 && <path d="M 62 95 Q 100 215 138 95" fill="#7c3aed" opacity="0.85" />}

        {/* Tail (swishes) */}
        <motion.g
          style={{ transformOrigin: "150px 140px" }}
          animate={{ rotate: happy ? [10, 40, 10] : [8, 20, 8] }}
          transition={{ duration: happy ? 0.5 : 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M 150 140 Q 190 130 185 90 Q 178 120 150 125 Z" fill="#c2571b" />
          <circle cx="184" cy="94" r="10" fill="white" />
        </motion.g>

        {/* Ears (occasional twitch via tilt-linked rotation) */}
        <motion.path d="M 68 62 L 58 25 L 88 55 Z" fill="#c2571b" animate={{ rotate: idle ? tilt * 0.6 : 0 }} style={{ transformOrigin: "70px 60px" }} />
        <path d="M 68 62 L 62 35 L 82 56 Z" fill="#2b2118" opacity="0.5" />
        <motion.path d="M 132 62 L 142 25 L 112 55 Z" fill="#c2571b" animate={{ rotate: idle ? tilt * 0.6 : 0 }} style={{ transformOrigin: "130px 60px" }} />
        <path d="M 132 62 L 138 35 L 118 56 Z" fill="#2b2118" opacity="0.5" />

        {/* Body / head */}
        <ellipse cx="100" cy="128" rx="50" ry="55" fill="#d9631a" />
        <path d="M 65 120 Q 100 175 135 120 Q 120 145 100 148 Q 80 145 65 120 Z" fill="#fdf3e7" />

        {/* Face */}
        <path d="M 70 95 Q 100 80 130 95 Q 120 130 100 138 Q 80 130 70 95 Z" fill="#e8873f" />
        <path d="M 82 108 Q 100 100 118 108 Q 110 128 100 132 Q 90 128 82 108 Z" fill="#fdf3e7" />

        {/* Eyes */}
        <ellipse cx="82" cy="100" rx="8" ry="9" fill="white" />
        <ellipse cx="118" cy="100" rx="8" ry="9" fill="white" />
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "82px 100px" }}>
          <circle cx="82" cy="101" r="4" fill="#1c1108" />
        </motion.g>
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "118px 100px" }}>
          <circle cx="118" cy="101" r="4" fill="#1c1108" />
        </motion.g>

        {/* Nose */}
        <ellipse cx="100" cy="120" rx="6" ry="4.5" fill="#1c1108" />

        {/* Glasses (level 5+, fitting for an "analytical" AI companion) */}
        {level >= 5 && (
          <g stroke="#111827" strokeWidth="2.5" fill="none">
            <circle cx="82" cy="100" r="13" />
            <circle cx="118" cy="100" r="13" />
            <line x1="95" y1="100" x2="105" y2="100" />
          </g>
        )}

        {/* Bandana (level 3+, hidden once cape takes over at 7+) */}
        {level >= 3 && level < 7 && (
          <path d="M 78 140 L 100 132 L 122 140 L 100 150 Z M 78 140 L 84 149 L 100 150 Z M 122 140 L 116 149 L 100 150 Z" fill="#38bdf8" />
        )}

        {/* Crown (level 9) */}
        {level >= 9 && (
          <path d="M 68 58 L 78 32 L 90 52 L 100 25 L 110 52 L 122 32 L 132 58 Z" fill="#facc15" stroke="#b8860b" strokeWidth="1.5" />
        )}

        {sleepy && (
          <motion.text
            x="140" y="60" fontSize="18" fill="#94a3c4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], y: [60, 42] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            z z Z
          </motion.text>
        )}
      </svg>
    </motion.div>
  );
}
