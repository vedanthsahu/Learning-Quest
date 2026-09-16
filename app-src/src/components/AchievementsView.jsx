import Medal from "./Medal";
import { useState } from "react";
import PageHero from "./PageHero";
import ProgressRing from "./ProgressRing";
import { motion } from "framer-motion";
import { ACHIEVEMENTS } from "../data/achievements";

export default function AchievementsView({ data, stats }) {
  const [filter, setFilter] = useState("all");
  const unlockedCount = ACHIEVEMENTS.filter((a) => data.achievementState[a.id]?.unlocked).length;

  return (
    <div className="view achievements-view">
      <PageHero eyebrow="THE TROPHY ROOM" title="Curiosity deserves a little glory." description="A collection of small wins, big breakthroughs, and the habits that get you there." accent="#e4c588"><div className="trophy-orbit"><ProgressRing pct={unlockedCount / ACHIEVEMENTS.length} color="#e4c588" size={132} strokeWidth={5} label={`${unlockedCount} / ${ACHIEVEMENTS.length}`}/><span>BADGES EARNED</span></div></PageHero>
      <div className="collection-toolbar"><div className="filter-tabs">{["all", "unlocked", "locked"].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All milestones" : value === "unlocked" ? "Earned" : "Still to discover"}</button>)}</div><span className="collection-count" role="status">{unlockedCount} achievements unlocked</span></div>

      {filter === "unlocked" && unlockedCount === 0 && <div className="designed-empty"><h2>Your first milestone is ahead.</h2><p>Complete a chapter to start your collection.</p></div>}
      <div className="achievements-grid">
        {ACHIEVEMENTS.filter(a => filter === "all" || (filter === "unlocked") === !!data.achievementState[a.id]?.unlocked).map((a, i) => {
          const state = data.achievementState[a.id];
          const unlocked = !!state?.unlocked;
          return (
            <motion.div
              key={a.id}
              className={`card achievement-card ${unlocked ? "unlocked" : "locked"}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
            >
              <div className="medal-display"><Medal index={ACHIEVEMENTS.findIndex(item=>item.id===a.id)} locked={!unlocked}/></div>
              <div className="achievement-state-label">{unlocked ? "EARNED" : "IN YOUR FUTURE"}</div>
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
