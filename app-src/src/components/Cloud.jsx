import { motion } from "framer-motion";
import { useRandomGesture } from "../utils/useRandomGesture";

// Companion for the Cloud Engineering Playbook -- drifts sideways instead of bobbing
// vertically (the other mascots bounce; a cloud floats), with a little signal bolt that
// blinks to hint at "always connected."
export default function Cloud({ level = 1, mood = "idle", size = 140 }) {
  const sleepy = mood === "sleepy";
  const happy = mood === "happy" || mood === "levelup";
  const levelup = mood === "levelup";
  const idle = !sleepy && !happy;
  const { tilt, glance } = useRandomGesture();

  const eyeState = sleepy ? { scaleY: 0.12, x: 0 } : { scaleY: [1, 1, 0.15, 1], x: idle ? glance : 0 };
  const eyeTransition = sleepy
    ? { duration: 0.3 }
    : { scaleY: { duration: 4.0, repeat: Infinity, times: [0, 0.9, 0.94, 1] }, x: { duration: 0.5 } };

  return (
    <motion.div
      style={{ width: size, height: size, position: "relative", display: "inline-block" }}
      animate={
        levelup
          ? { x: [0, -14, 14, 0], y: [0, -18, 0], rotate: [0, -6, 6, 0] }
          : happy
          ? { x: [0, -10, 10, 0], y: [0, -6, 0] }
          : { x: [0, -6, 6, 0], y: [0, -4, 0], rotate: tilt * 0.4 }
      }
      transition={{
        x: { duration: levelup ? 0.9 : happy ? 1.1 : 4.2, repeat: Infinity, ease: "easeInOut" },
        y: { duration: levelup ? 0.9 : happy ? 1.1 : 4.2, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 0.5, ease: "easeOut" },
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        {/* Cape (level 7+) */}
        {level >= 7 && <path d="M 68 130 Q 100 200 132 130" fill="#7c3aed" opacity="0.8" />}

        {/* Soft drop shadow puffs behind the main body, for depth */}
        <ellipse cx="62" cy="128" rx="30" ry="26" fill="#e8edf5" />
        <ellipse cx="140" cy="128" rx="32" ry="28" fill="#e8edf5" />

        {/* Main cloud body -- overlapping puffs */}
        <ellipse cx="100" cy="140" rx="62" ry="34" fill="#ffffff" stroke="#c7d2e3" strokeWidth="2" />
        <circle cx="62" cy="112" r="32" fill="#ffffff" stroke="#c7d2e3" strokeWidth="2" />
        <circle cx="100" cy="96" r="40" fill="#ffffff" stroke="#c7d2e3" strokeWidth="2" />
        <circle cx="140" cy="114" r="30" fill="#ffffff" stroke="#c7d2e3" strokeWidth="2" />
        {/* Cover the seams so it reads as one fluffy shape, not stacked circles */}
        <ellipse cx="100" cy="128" rx="66" ry="28" fill="#ffffff" />

        {/* Eyes */}
        <ellipse cx="82" cy="108" rx="7" ry="8" fill="white" stroke="#c7d2e3" />
        <ellipse cx="118" cy="108" rx="7" ry="8" fill="white" stroke="#c7d2e3" />
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "82px 108px" }}>
          <circle cx="82" cy="109" r="3.6" fill="#3a4a63" />
        </motion.g>
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "118px 108px" }}>
          <circle cx="118" cy="109" r="3.6" fill="#3a4a63" />
        </motion.g>

        {/* Blush + smile */}
        <circle cx="70" cy="122" r="6" fill="#B85C00" opacity="0.18" />
        <circle cx="130" cy="122" r="6" fill="#B85C00" opacity="0.18" />
        <path d="M 88 122 Q 100 130 112 122" stroke="#3a4a63" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Signal bolt antenna -- "always connected" (level 3+), blinks like a status light */}
        {level >= 3 && (
          <g>
            <line x1="100" y1="56" x2="100" y2="40" stroke="#8a94a8" strokeWidth="3" />
            <motion.path
              d="M 100 22 L 92 38 L 100 38 L 94 54 L 110 34 L 101 34 Z"
              fill="#B85C00"
              animate={{ opacity: idle ? [1, 0.35, 1] : 1 }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
          </g>
        )}

        {/* Sunglasses (level 5+) */}
        {level >= 5 && (
          <g stroke="#111827" strokeWidth="2.5" fill="#1c2534" fillOpacity="0.85">
            <rect x="72" y="100" width="20" height="14" rx="5" />
            <rect x="108" y="100" width="20" height="14" rx="5" />
            <line x1="92" y1="106" x2="108" y2="106" stroke="#111827" strokeWidth="2.5" />
          </g>
        )}

        {/* Crown (level 9) */}
        {level >= 9 && (
          <path d="M 72 66 L 82 40 L 92 60 L 100 33 L 108 60 L 118 40 L 128 66 Z" fill="#facc15" stroke="#b8860b" strokeWidth="1.5" />
        )}

        {sleepy && (
          <motion.text
            x="145" y="70" fontSize="18" fill="#94a3c4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], y: [70, 52] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            z z Z
          </motion.text>
        )}
      </svg>
    </motion.div>
  );
}
