import { motion } from "framer-motion";
import { useRandomGesture } from "../utils/useRandomGesture";

// Companion for the Python Backend Handbook -- floats on its back with a little book on
// its belly, the classic otter pose, reimagined as "always reading."
export default function Otter({ level = 1, mood = "idle", size = 140 }) {
  const sleepy = mood === "sleepy";
  const happy = mood === "happy" || mood === "levelup";
  const levelup = mood === "levelup";
  const idle = !sleepy && !happy;
  const { tilt, glance } = useRandomGesture();

  const eyeState = sleepy ? { scaleY: 0.12, x: 0 } : { scaleY: [1, 1, 0.15, 1], x: idle ? glance : 0 };
  const eyeTransition = sleepy
    ? { duration: 0.3 }
    : { scaleY: { duration: 4.6, repeat: Infinity, times: [0, 0.9, 0.94, 1] }, x: { duration: 0.5 } };

  return (
    <motion.div
      style={{ width: size, height: size, position: "relative", display: "inline-block" }}
      animate={
        levelup
          ? { y: [0, -18, 0], rotate: [0, -6, 6, 0] }
          : happy
          ? { rotate: [-6, 6, -6], y: [0, -6, 0] }
          : { rotate: [-4 + tilt * 0.3, 4 + tilt * 0.3, -4 + tilt * 0.3], y: [0, -3, 0] }
      }
      transition={{
        rotate: { duration: levelup ? 0.9 : happy ? 0.9 : 3.4, repeat: Infinity, ease: "easeInOut" },
        y: { duration: levelup ? 0.9 : happy ? 0.9 : 3.4, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        {/* Cape (level 7+, spread out beneath since the otter floats on its back) */}
        {level >= 7 && <ellipse cx="100" cy="150" rx="70" ry="20" fill="#7c3aed" opacity="0.7" />}

        {/* Water ripple */}
        <ellipse cx="100" cy="168" rx="66" ry="10" fill="#38bdf8" opacity="0.25" />

        {/* Body floating on back */}
        <ellipse cx="100" cy="130" rx="58" ry="42" fill="#8b6b4a" />
        <ellipse cx="100" cy="138" rx="38" ry="28" fill="#d9c3a3" />

        {/* Paws holding the little book */}
        <ellipse cx="72" cy="118" rx="10" ry="8" fill="#8b6b4a" />
        <ellipse cx="128" cy="118" rx="10" ry="8" fill="#8b6b4a" />

        {/* The little book (always reading) */}
        <g transform="translate(84 108)">
          <rect x="0" y="0" width="32" height="22" rx="2" fill="#f5f5f5" stroke="#c9c9c9" />
          <line x1="16" y1="2" x2="16" y2="20" stroke="#c9c9c9" />
          <motion.line
            x1="4" y1="6" x2="14" y2="6" stroke="#a3a3a3" strokeWidth="1.5"
            animate={{ opacity: idle ? [1, 0.4, 1] : 1 }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <line x1="4" y1="11" x2="14" y2="11" stroke="#a3a3a3" strokeWidth="1.5" />
          <line x1="18" y1="6" x2="28" y2="6" stroke="#a3a3a3" strokeWidth="1.5" />
          <line x1="18" y1="11" x2="28" y2="11" stroke="#a3a3a3" strokeWidth="1.5" />
        </g>

        {/* Head */}
        <ellipse cx="100" cy="82" rx="34" ry="30" fill="#8b6b4a" />
        <ellipse cx="100" cy="90" rx="20" ry="16" fill="#d9c3a3" />

        {/* Ears */}
        <circle cx="76" cy="60" r="9" fill="#8b6b4a" />
        <circle cx="124" cy="60" r="9" fill="#8b6b4a" />

        {/* Eyes */}
        <circle cx="88" cy="80" r="7" fill="white" />
        <circle cx="112" cy="80" r="7" fill="white" />
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "88px 80px" }}>
          <circle cx="88" cy="81" r="3.4" fill="#2b2118" />
        </motion.g>
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "112px 80px" }}>
          <circle cx="112" cy="81" r="3.4" fill="#2b2118" />
        </motion.g>

        {/* Nose + whiskers */}
        <ellipse cx="100" cy="93" rx="4.5" ry="3.5" fill="#2b2118" />
        <line x1="70" y1="90" x2="88" y2="93" stroke="#3f2f22" strokeWidth="1" />
        <line x1="70" y1="97" x2="88" y2="97" stroke="#3f2f22" strokeWidth="1" />
        <line x1="130" y1="90" x2="112" y2="93" stroke="#3f2f22" strokeWidth="1" />
        <line x1="130" y1="97" x2="112" y2="97" stroke="#3f2f22" strokeWidth="1" />

        {/* Reading glasses (level 5+) */}
        {level >= 5 && (
          <g stroke="#111827" strokeWidth="2" fill="none">
            <circle cx="88" cy="80" r="10" />
            <circle cx="112" cy="80" r="10" />
            <line x1="98" y1="80" x2="102" y2="80" />
          </g>
        )}

        {/* Bandana (level 3+, hidden once cape takes over at 7+) */}
        {level >= 3 && level < 7 && (
          <path d="M 82 55 L 100 47 L 118 55 L 100 62 Z" fill="#34d399" />
        )}

        {/* Crown (level 9) */}
        {level >= 9 && (
          <path d="M 74 55 L 82 32 L 92 50 L 100 25 L 108 50 L 118 32 L 126 55 Z" fill="#facc15" stroke="#b8860b" strokeWidth="1.5" />
        )}

        {sleepy && (
          <motion.text
            x="140" y="50" fontSize="18" fill="#94a3c4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], y: [50, 32] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            z z Z
          </motion.text>
        )}
      </svg>
    </motion.div>
  );
}
