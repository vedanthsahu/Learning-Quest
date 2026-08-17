import { motion } from "framer-motion";
import { useRandomGesture } from "../utils/useRandomGesture";

// Companion for the DSA Engineering Handbook -- methodical and a little fidgety, always
// holding onto an acorn (data, neatly stored away). The bushy tail flicks independently of
// the idle bob, the same "not everything moves in lockstep" trick the other mascots use.
export default function Squirrel({ level = 1, mood = "idle", size = 140 }) {
  const sleepy = mood === "sleepy";
  const happy = mood === "happy" || mood === "levelup";
  const levelup = mood === "levelup";
  const idle = !sleepy && !happy;
  const { tilt, glance } = useRandomGesture();

  const eyeState = sleepy ? { scaleY: 0.12, x: 0 } : { scaleY: [1, 1, 0.15, 1], x: idle ? glance : 0 };
  const eyeTransition = sleepy
    ? { duration: 0.3 }
    : { scaleY: { duration: 3.2, repeat: Infinity, times: [0, 0.9, 0.94, 1] }, x: { duration: 0.5 } };

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
        y: { duration: levelup ? 0.9 : happy ? 1.0 : 2.1, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 0.5, ease: "easeOut" },
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        {/* Cape (level 7+) */}
        {level >= 7 && <path d="M 64 100 Q 100 210 136 100" fill="#7c3aed" opacity="0.85" />}

        {/* Bushy tail, curls up behind -- flicks on its own rhythm */}
        <motion.g
          style={{ transformOrigin: "148px 130px" }}
          animate={{ rotate: happy ? [6, 26, 6] : [2, 12, 2] }}
          transition={{ duration: happy ? 0.5 : 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M 148 130 Q 190 120 182 70 Q 172 40 140 45 Q 172 55 176 78 Q 178 108 148 118 Z"
            fill="#a8602f"
          />
          <path
            d="M 156 122 Q 182 112 176 76"
            fill="none"
            stroke="#6b3f1f"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.5"
          />
        </motion.g>

        {/* Ears */}
        <motion.path d="M 74 68 Q 66 44 84 40 Q 78 56 84 68 Z" fill="#a8602f" animate={{ rotate: idle ? tilt * 0.6 : 0 }} style={{ transformOrigin: "78px 60px" }} />
        <motion.path d="M 126 68 Q 134 44 116 40 Q 122 56 116 68 Z" fill="#a8602f" animate={{ rotate: idle ? tilt * 0.6 : 0 }} style={{ transformOrigin: "122px 60px" }} />

        {/* Body / head */}
        <ellipse cx="100" cy="130" rx="46" ry="48" fill="#c17b3f" />
        <ellipse cx="100" cy="140" rx="30" ry="30" fill="#f2e2c8" />

        {/* Face */}
        <ellipse cx="100" cy="95" rx="38" ry="34" fill="#c17b3f" />
        <ellipse cx="100" cy="104" rx="24" ry="20" fill="#f2e2c8" />

        {/* Eyes */}
        <ellipse cx="84" cy="94" rx="7.5" ry="8.5" fill="white" />
        <ellipse cx="116" cy="94" rx="7.5" ry="8.5" fill="white" />
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "84px 94px" }}>
          <circle cx="84" cy="95" r="3.8" fill="#2b1b0f" />
        </motion.g>
        <motion.g animate={eyeState} transition={eyeTransition} style={{ transformOrigin: "116px 94px" }}>
          <circle cx="116" cy="95" r="3.8" fill="#2b1b0f" />
        </motion.g>

        {/* Nose + whiskers */}
        <ellipse cx="100" cy="112" rx="5" ry="4" fill="#2b1b0f" />
        <line x1="66" y1="108" x2="86" y2="112" stroke="#5a3a20" strokeWidth="1" />
        <line x1="66" y1="116" x2="86" y2="116" stroke="#5a3a20" strokeWidth="1" />
        <line x1="134" y1="108" x2="114" y2="112" stroke="#5a3a20" strokeWidth="1" />
        <line x1="134" y1="116" x2="114" y2="116" stroke="#5a3a20" strokeWidth="1" />

        {/* Acorn held in paws (data, neatly stored) */}
        <g transform="translate(86 148)">
          <ellipse cx="14" cy="14" rx="10" ry="9" fill="#8a5a2b" />
          <path d="M 4 8 Q 14 -2 24 8 Q 14 4 4 8 Z" fill="#5a3a20" />
          <rect x="12" y="-2" width="4" height="5" fill="#3f2a18" />
        </g>
        <ellipse cx="78" cy="158" rx="9" ry="7" fill="#c17b3f" />
        <ellipse cx="122" cy="158" rx="9" ry="7" fill="#c17b3f" />

        {/* Glasses (level 5+ -- studious) */}
        {level >= 5 && (
          <g stroke="#111827" strokeWidth="2.5" fill="none">
            <circle cx="84" cy="94" r="12" />
            <circle cx="116" cy="94" r="12" />
            <line x1="96" y1="94" x2="104" y2="94" />
          </g>
        )}

        {/* Bandana (level 3+, hidden once cape takes over at 7+) */}
        {level >= 3 && level < 7 && (
          <path d="M 76 128 L 100 120 L 124 128 L 100 138 Z M 76 128 L 82 137 L 100 138 Z M 124 128 L 118 137 L 100 138 Z" fill="#4C2A85" />
        )}

        {/* Crown (level 9) */}
        {level >= 9 && (
          <path d="M 70 58 L 80 32 L 92 52 L 100 25 L 108 52 L 120 32 L 130 58 Z" fill="#facc15" stroke="#b8860b" strokeWidth="1.5" />
        )}

        {sleepy && (
          <motion.text
            x="140" y="56" fontSize="18" fill="#94a3c4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0], y: [56, 38] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            z z Z
          </motion.text>
        )}
      </svg>
    </motion.div>
  );
}
