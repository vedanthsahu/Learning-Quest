import { motion, AnimatePresence } from "framer-motion";
import { useRandomGesture } from "../utils/useRandomGesture";

// A small, original, hand-drawn owl companion (pure SVG, no external assets/licensing
// concerns). Gets visibly more decorated as the learner levels up, and reacts to mood.

function Sparkles({ show }) {
  if (!show) return null;
  const positions = [
    [10, 20], [190, 30], [20, 160], [180, 150], [100, 5], [160, 90], [30, 90],
  ];
  return (
    <>
      {positions.map(([x, y], i) => (
        <motion.text
          key={i}
          x={x}
          y={y}
          fontSize="16"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1.2, 0.3], y: [y, y - 10, y - 20] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        >
          ✨
        </motion.text>
      ))}
    </>
  );
}

export default function Mascot({ level = 1, mood = "idle", size = 140 }) {
  const sleepy = mood === "sleepy";
  const happy = mood === "happy" || mood === "levelup";
  const levelup = mood === "levelup";
  const idle = !sleepy && !happy;
  const { tilt, glance } = useRandomGesture();

  const eyeState = sleepy
    ? { scaleY: 0.12, x: 0 }
    : { scaleY: [1, 1, 0.1, 1], x: idle ? glance : 0 };
  const eyeTransition = sleepy
    ? { duration: 0.3 }
    : { scaleY: { duration: 4.2, repeat: Infinity, times: [0, 0.88, 0.94, 1], ease: "easeInOut" }, x: { duration: 0.5, ease: "easeOut" } };

  return (
    <motion.div
      style={{ width: size, height: size, position: "relative", display: "inline-block" }}
      animate={
        levelup
          ? { y: [0, -18, 0], rotate: [0, -6, 6, 0] }
          : happy
          ? { y: [0, -8, 0], rotate: 0 }
          : { y: [0, -4, 0], rotate: tilt }
      }
      transition={{
        y: { duration: levelup ? 0.9 : happy ? 1.1 : 2.6, repeat: Infinity, ease: "easeInOut" },
        rotate: levelup ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5, ease: "easeOut" },
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <Sparkles show={levelup} />

        {/* Cape (level 7+) */}
        {level >= 7 && (
          <motion.path
            d="M 60 90 Q 100 220 140 90"
            fill="#7c3aed"
            opacity="0.85"
            animate={{ d: happy ? "M 55 90 Q 100 230 145 90" : "M 60 90 Q 100 220 140 90" }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
          />
        )}

        {/* Wings */}
        <motion.ellipse
          cx="52" cy="128" rx="16" ry="34" fill="#a9673c"
          animate={happy ? { rotate: [-10, -35, -10] } : { rotate: -10 }}
          transition={{ duration: 0.6, repeat: happy ? Infinity : 0 }}
          style={{ transformOrigin: "60px 105px" }}
        />
        <motion.ellipse
          cx="148" cy="128" rx="16" ry="34" fill="#a9673c"
          animate={happy ? { rotate: [10, 35, 10] } : { rotate: 10 }}
          transition={{ duration: 0.6, repeat: happy ? Infinity : 0 }}
          style={{ transformOrigin: "140px 105px" }}
        />

        {/* Feet */}
        <ellipse cx="82" cy="185" rx="10" ry="6" fill="#f59e0b" />
        <ellipse cx="118" cy="185" rx="10" ry="6" fill="#f59e0b" />

        {/* Body */}
        <ellipse cx="100" cy="120" rx="55" ry="62" fill="#d9a066" />
        <ellipse cx="100" cy="132" rx="34" ry="42" fill="#f3d9b1" />

        {/* Ear tufts */}
        <path d="M 62 70 L 55 40 L 78 62 Z" fill="#a9673c" />
        <path d="M 138 70 L 145 40 L 122 62 Z" fill="#a9673c" />

        {/* Eyes */}
        <circle cx="80" cy="100" r="20" fill="white" />
        <circle cx="120" cy="100" r="20" fill="white" />
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "80px 100px" }}>
          <circle cx="80" cy="100" r="9" fill="#2b2118" />
        </motion.g>
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "120px 100px" }}>
          <circle cx="120" cy="100" r="9" fill="#2b2118" />
        </motion.g>

        {/* Beak */}
        <path d="M 93 115 L 107 115 L 100 128 Z" fill="#f59e0b" />

        {/* Bow-tie (level 3+, hidden once cape takes over the chest at 7+) */}
        {level >= 3 && level < 7 && (
          <path d="M 85 150 L 100 143 L 115 150 L 100 157 Z M 85 150 L 90 158 L 100 157 Z M 115 150 L 110 158 L 100 157 Z"
            fill="#38bdf8" />
        )}

        {/* Graduate cap (level 5+) */}
        {level >= 5 && (
          <g>
            <rect x="68" y="38" width="64" height="8" rx="2" fill="#1f2937" transform="rotate(-4 100 42)" />
            <polygon points="60,44 140,40 132,58 68,60" fill="#111827" transform="rotate(-4 100 50)" />
            <circle cx="134" cy="40" r="3" fill="#facc15" />
            <line x1="134" y1="40" x2="140" y2="58" stroke="#facc15" strokeWidth="2" />
          </g>
        )}

        {/* Crown (level 9) */}
        {level >= 9 && (
          <path
            d="M 65 45 L 75 20 L 88 40 L 100 15 L 112 40 L 125 20 L 135 45 Z"
            fill="#facc15" stroke="#b8860b" strokeWidth="1.5"
          />
        )}

        {sleepy && (
          <AnimatePresence>
            <motion.text
              x="145" y="55" fontSize="20" fill="#94a3c4"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], y: -18 }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              z z Z
            </motion.text>
          </AnimatePresence>
        )}
      </svg>
    </motion.div>
  );
}
