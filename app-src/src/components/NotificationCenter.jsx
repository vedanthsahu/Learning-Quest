import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import Mascot from "./Mascot";
import { playFanfare, playUnlock, playDing, playComplete } from "../utils/sound";

export default function NotificationCenter({ events, dismissEvent }) {
  const handledRef = useRef(new Set());

  useEffect(() => {
    for (const e of events) {
      if (handledRef.current.has(e.id)) continue;
      handledRef.current.add(e.id);
      if (e.type === "levelup") {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.55 } });
        playFanfare();
        setTimeout(() => dismissEvent(e.id), 4500);
      } else if (e.type === "achievement") {
        confetti({ particleCount: 50, spread: 60, origin: { x: 0.92, y: 0.08 } });
        playUnlock();
        setTimeout(() => dismissEvent(e.id), 5000);
      } else if (e.type === "session") {
        playDing();
        setTimeout(() => dismissEvent(e.id), 4000);
      } else if (e.type === "complete") {
        confetti({ particleCount: 60, spread: 65, origin: { y: 0.65 } });
        playComplete();
        setTimeout(() => dismissEvent(e.id), 3800);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const levelUps = events.filter((e) => e.type === "levelup");
  const toasts = events.filter((e) => e.type !== "levelup");

  return (
    <>
      <AnimatePresence>
        {levelUps.map((e) => (
          <motion.div
            key={e.id}
            className="levelup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dismissEvent(e.id)}
          >
            <motion.div
              className="levelup-modal"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", damping: 16 }}
            >
              <Mascot level={e.levelNumber} mood="levelup" size={160} />
              <div className="levelup-text">LEVEL UP!</div>
              <div className="levelup-level">
                Level {e.levelNumber} — {e.level.emoji} {e.level.title}
              </div>
              <div className="levelup-hint">Click anywhere to continue</div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="toast-stack">
        <AnimatePresence>
          {toasts.map((e) => (
            <motion.div
              key={e.id}
              className={`toast toast-${e.type}`}
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              layout
              onClick={() => dismissEvent(e.id)}
            >
              {e.type === "achievement" && (
                <>
                  <span className="toast-emoji">{e.achievement.emoji}</span>
                  <div>
                    <div className="toast-title">Achievement Unlocked!</div>
                    <div className="toast-sub">{e.achievement.name}</div>
                  </div>
                </>
              )}
              {e.type === "session" && (
                <>
                  <span className="toast-emoji">📖</span>
                  <div>
                    <div className="toast-title">{e.minutes} min today</div>
                    <div className="toast-sub">{e.title}</div>
                  </div>
                </>
              )}
              {e.type === "complete" && (
                <>
                  <span className="toast-emoji">✅</span>
                  <div>
                    <div className="toast-title">Chapter Complete!</div>
                    <div className="toast-sub">{e.title}</div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
