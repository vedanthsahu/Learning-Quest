import { motion } from "framer-motion";
import { ACHIEVEMENTS } from "../data/achievements";

export default function AchievementsView({ data, stats }) {
  const unlockedCount = ACHIEVEMENTS.filter((a) => data.achievementState[a.id]?.unlocked).length;

  return (
    <div className="view achievements-view">
      <div className="achievements-header">
        <h2>🏅 Achievements</h2>
        <div className="achievements-count">
          {unlockedCount} / {ACHIEVEMENTS.length} unlocked
        </div>
      </div>

      <div className="achievements-grid">
        {ACHIEVEMENTS.map((a, i) => {
          const state = data.achievementState[a.id];
          const unlocked = !!state?.unlocked;
          return (
            <motion.div
              key={a.id}
              className={`card achievement-card ${unlocked ? "unlocked" : "locked"}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
            >
              <div className="achievement-emoji">{unlocked ? a.emoji : "🔒"}</div>
              <div className="achievement-name">{a.name}</div>
              <div className="achievement-desc">{a.description}</div>
              <div className="achievement-progress">{a.progress(stats, data)}</div>
              {unlocked && (
                <div className="achievement-date">
                  Unlocked {new Date(state.unlockedAt).toLocaleDateString()}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
