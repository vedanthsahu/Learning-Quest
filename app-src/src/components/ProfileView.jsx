import { motion } from "framer-motion";
import Mascot from "./Mascot";
import ActivityHeatmap from "./ActivityHeatmap";
import { formatDuration, formatMinutesShort } from "../utils/xp";

export default function ProfileView({ data, stats }) {
  const joinDate = new Date(data.meta.createdAt);
  const daysSinceJoin = Math.max(1, Math.round((Date.now() - joinDate.getTime()) / 86400000));

  return (
    <div className="view profile-view">
      <div className="profile-hero card">
        <Mascot level={stats.levelNumber} mood="idle" size={130} />
        <div>
          <div className="profile-level">
            Level {stats.levelNumber} — {stats.level.emoji} {stats.level.title}
          </div>
          <div className="profile-since">
            Learning since {joinDate.toLocaleDateString()} ({daysSinceJoin} day{daysSinceJoin === 1 ? "" : "s"} ago)
          </div>
        </div>
      </div>

      <div className="profile-stats-grid">
        <StatCard emoji="🔥" label="Current Streak" value={`${data.meta.streak || 0} days`} />
        <StatCard emoji="🏆" label="Longest Streak" value={`${data.meta.longestStreak || 0} days`} />
        <StatCard emoji="⏱" label="Total Active Time" value={formatDuration(stats.totalActiveSeconds)} />
        <StatCard emoji="📖" label="Chapters Completed" value={`${stats.totalDone} / ${stats.totalTopics}`} />
        <StatCard emoji="✨" label="Total XP" value={stats.xp} />
        {stats.favoriteBook && stats.favoriteBook.activeSeconds > 0 && (
          <StatCard emoji="💛" label="Favorite Book" value={stats.favoriteBook.name} sub={formatMinutesShort(stats.favoriteBook.activeSeconds)} />
        )}
      </div>

      <motion.div className="card heatmap-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3>📅 Daily Activity</h3>
        <ActivityHeatmap dailyLog={data.meta.dailyLog} />
      </motion.div>
    </div>
  );
}

function StatCard({ emoji, label, value, sub }) {
  return (
    <motion.div className="card stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="stat-emoji">{emoji}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </motion.div>
  );
}
