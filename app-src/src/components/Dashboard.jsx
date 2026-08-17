import { motion } from "framer-motion";
import Mascot from "./Mascot";
import ProgressRing from "./ProgressRing";
import { suggestNextTopic, rankTitle, formatMinutesShort } from "../utils/xp";
import { ACHIEVEMENTS } from "../data/achievements";

export default function Dashboard({ data, stats, onOpenReader, onNavigateView }) {
  const next = suggestNextTopic(data);
  const isSleepy = (data.meta.streak || 0) === 0;

  const recentUnlocks = Object.entries(data.achievementState)
    .filter(([, v]) => v.unlocked)
    .sort((a, b) => new Date(b[1].unlockedAt) - new Date(a[1].unlockedAt))
    .slice(0, 3)
    .map(([id, v]) => ({ ...ACHIEVEMENTS.find((a) => a.id === id), unlockedAt: v.unlockedAt }));

  return (
    <div className="view dashboard-view">
      <div className="dash-top-grid">
        <motion.div className="card level-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Mascot level={stats.levelNumber} mood={isSleepy ? "sleepy" : "idle"} size={110} />
          <div className="level-card-info">
            <div className="level-title">
              Level {stats.levelNumber} — {stats.level.emoji} {stats.level.title}
            </div>
            <div className="xp-bar-track">
              <motion.div
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, stats.levelProgressPct * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="xp-caption">
              {stats.nextLevel
                ? `${stats.xp} XP — ${stats.xpToNext} XP to Level ${stats.levelNumber + 1} (${stats.nextLevel.emoji} ${stats.nextLevel.title})`
                : `${stats.xp} XP — 🎉 Max level reached, you're a Legend!`}
            </div>
            <div className="dash-substats">
              <span className="streak-chip">🔥 {data.meta.streak || 0}-day streak</span>
              <span className="time-chip">⏱ {formatMinutesShort(stats.totalActiveSeconds)} learned</span>
              <span className="pct-chip">{Math.round(stats.pct * 100)}% overall</span>
            </div>
          </div>
        </motion.div>

        {next && (
          <motion.button
            className="card continue-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() =>
              onOpenReader({ scope: "book", bookId: next.bookId, partIndex: next.partIndex, topicIndex: next.topicIndex })
            }
          >
            <div className="continue-label">▶ Continue Your Quest</div>
            <div className="continue-title">
              §{next.topic.num} {next.topic.title}
            </div>
            <div className="continue-sub">
              {next.bookName} · {next.partName} · ~{next.topic.estMinutes} min
            </div>
          </motion.button>
        )}
      </div>

      <div className="dash-books-grid">
        {stats.perBook.map((b, i) => {
          const rank = rankTitle(b.pct);
          return (
            <motion.div
              key={b.id}
              className="card book-summary-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => onNavigateView({ view: "book", bookId: b.id })}
            >
              <ProgressRing pct={b.pct} color={b.color} size={84} />
              <div className="book-summary-info">
                <div className="book-summary-name" style={{ color: b.color }}>
                  {b.name}
                </div>
                <div className="book-summary-sub">{b.subtitle}</div>
                <div className="book-summary-rank">
                  {rank.emoji} {rank.title} · {b.done}/{b.total} chapters
                </div>
              </div>
            </motion.div>
          );
        })}

        <motion.div
          className="card book-summary-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => onNavigateView({ view: "challenges" })}
        >
          <ProgressRing pct={stats.ces.challenge.pct} color={data.challengeSeries.color} size={84} />
          <div className="book-summary-info">
            <div className="book-summary-name" style={{ color: data.challengeSeries.color }}>
              {data.challengeSeries.name}
            </div>
            <div className="book-summary-sub">{data.challengeSeries.subtitle}</div>
            <div className="book-summary-rank">
              ⚔️ {stats.ces.challenge.done}/{stats.ces.total} challenges · 🏗️ {stats.ces.solution.done}/{stats.ces.total} solutions
            </div>
          </div>
        </motion.div>
      </div>

      <div className="dash-bottom-grid">
        <motion.div className="card recent-achievements-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="card-header-row">
            <h3>🏅 Recent Achievements</h3>
            <button className="link-btn" onClick={() => onNavigateView({ view: "achievements" })}>
              View all →
            </button>
          </div>
          {recentUnlocks.length === 0 ? (
            <div className="empty-hint">Complete a chapter to earn your first badge!</div>
          ) : (
            <div className="recent-achievements-list">
              {recentUnlocks.map((a) => (
                <div key={a.id} className="recent-achievement-pill">
                  <span className="emoji">{a.emoji}</span> {a.name}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.button className="card profile-link-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} onClick={() => onNavigateView({ view: "profile" })}>
          <div className="profile-link-title">👤 Your Profile</div>
          <div className="profile-link-sub">Streaks, daily activity heatmap, and lifetime stats</div>
        </motion.button>
      </div>
    </div>
  );
}
