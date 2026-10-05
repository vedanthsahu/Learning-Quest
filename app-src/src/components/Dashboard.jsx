import WorldArt from "./WorldArt";
import { useState } from 'react';
import OrbitalLibrary from './OrbitalLibrary';
import { motion } from "framer-motion";
import Mascot from "./Mascot";
import ProgressRing from "./ProgressRing";
import { suggestNextTopic, rankTitle, formatMinutesShort } from "../utils/xp";
import { ACHIEVEMENTS } from "../data/achievements";
import { projectSummary } from "../data/incidentProject";

export default function Dashboard({ data, stats, onOpenReader, onNavigateView }) {
  const [libraryView, setLibraryView] = useState('shelf');
  const next = suggestNextTopic(data);
  const isSleepy = (data.meta.streak || 0) === 0;
  const build = projectSummary(data.buildProjects?.['incident-command']);

  const recentUnlocks = Object.entries(data.achievementState)
    .filter(([, v]) => v.unlocked)
    .sort((a, b) => new Date(b[1].unlockedAt) - new Date(a[1].unlockedAt))
    .slice(0, 3)
    .map(([id, v]) => ({ ...ACHIEVEMENTS.find((a) => a.id === id), unlockedAt: v.unlockedAt }));

  return (
    <div className="view dashboard-view">
      <header className="dashboard-heading">
        <div><div className="eyebrow">YOUR PERSONAL LEARNING SPACE</div><h1>A little curiosity.<br /><span>A whole new horizon.</span></h1><p>Build your knowledge, one chapter at a time.</p></div>
        <div className="today-label"><span className="status-dot" />{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", weekday: "short" }).format(new Date())}</div>
      </header>
      <button className="build-dashboard-entry" onClick={() => onNavigateView({ view: 'incident-project' })}>
        <span><small>YOUR BUILD WORKSPACE</small><strong>Incident Command AI</strong><span>{build.next ? `Next: ${build.next.title}` : 'Core journey complete · review your evidence'}</span></span>
        <span><strong>{build.done}/{build.total}</strong><span>core steps verified ↗</span></span>
      </button>
      <section className="quest-hero">
        <div className="hero-copy">
          <div className="eyebrow">✦ YOUR NEXT ADVENTURE</div>
          <h2>{next ? next.topic.title : "Every chapter is a new possibility."}</h2>
          <p>{next ? `${next.bookName} · ${next.partName}` : "Explore your handbooks and keep your curiosity alive."}</p>
          <div className="hero-actions"><button className="quest-primary" onClick={() => next ? onOpenReader({ scope: "book", bookId: next.bookId, partIndex: next.partIndex, topicIndex: next.topicIndex }) : onNavigateView({ view: "challenges" })}>{next ? "Continue learning" : "Explore challenges"}<span aria-hidden="true">↗</span></button>{next && <span className="hero-duration">◷ About {next.topic.estMinutes} min</span>}</div>
        </div>
        <div className="dashboard-flight-window"><div className="dashboard-globe" aria-hidden="true"/><button onClick={() => onNavigateView({view:'journey'})}>Return to the flight ↗</button></div>
      </section>
      <div className="section-heading"><h2>Your momentum</h2><span>Small steps. Lasting progress.</span></div>
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

          </div>
        </motion.div>

        <div className="momentum-stats card">
          <div><span className="stat-symbol">↗</span><strong>{data.meta.streak || 0}<small> days</small></strong><span>Current streak</span></div>
          <div><span className="stat-symbol">◷</span><strong>{formatMinutesShort(stats.totalActiveSeconds)}</strong><span>Time invested</span></div>
          <div><span className="stat-symbol">◎</span><strong>{Math.round(stats.pct * 100)}<small>%</small></strong><span>Journey complete</span></div>
        </div>
      </div>

      <div className="section-heading"><div><div className="eyebrow">CHOOSE YOUR PATH</div><h2>Your learning library</h2></div><span>{stats.perBook.length + 1} paths to explore</span></div>
      <div className="library-view-controls"><div className="filter-tabs" role="group" aria-label="Library view"><button aria-pressed={libraryView === 'shelf'} onClick={() => setLibraryView('shelf')}>Bookshelf</button><button aria-pressed={libraryView === 'orbit'} onClick={() => setLibraryView('orbit')}>Orbital library</button></div></div>
      {libraryView === 'orbit' && <OrbitalLibrary books={stats.perBook} onNavigateView={onNavigateView} />}
      <div className="dash-books-grid">
        {libraryView === 'shelf' && stats.perBook.map((b, i) => {
          const rank = rankTitle(b.pct);
          return (
            <motion.button
              type="button"
              key={b.id}
              className="card book-summary-card tactile-book"
              style={{ "--book-accent": b.color }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => onNavigateView({ view: "book", bookId: b.id })}
            >
              <div className="book-cover" aria-hidden="true"><WorldArt bookId={b.id}/><span className="cover-number">FIELD GUIDE / {String(i + 1).padStart(2, "0")}</span><span className="cover-glyph">{["{ }", "✳", "⌘", "λ"][i % 4]}</span><span className="cover-caption">LEARNING QUEST <span>↗</span></span></div><div className="book-progress">{b.pct > 0 && b.pct < 1 && <span className="reading-bookmark">READING</span>}<ProgressRing pct={b.pct} color={b.color} size={42} strokeWidth={3} /><span>{b.done} of {b.total} chapters</span></div>
              <div className="book-summary-info">
                <div className="book-summary-name" style={{ color: b.color }}>
                  {b.name}
                </div>
                <div className="book-summary-sub">{b.subtitle}</div>
                <div className="book-summary-rank">
                  {rank.emoji} {rank.title} · {b.done}/{b.total} chapters
                </div>
              </div>
            </motion.button>
          );
        })}

        <motion.button
          type="button"
          style={{ "--book-accent": data.challengeSeries.color }}
          className="card book-summary-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => onNavigateView({ view: "challenges" })}
        >
          <div className="book-cover challenge-cover" aria-hidden="true"><span className="cover-number">THE PRACTICE LAB</span><span className="cover-glyph">⚒</span><span className="cover-caption">BUILD SOMETHING GREAT <span>↗</span></span></div><div className="book-progress"><ProgressRing pct={stats.ces.challenge.pct} color={data.challengeSeries.color} size={42} strokeWidth={3} /><span>{stats.ces.challenge.done} of {stats.ces.total} challenges</span></div>
          <div className="book-summary-info">
            <div className="book-summary-name" style={{ color: data.challengeSeries.color }}>
              {data.challengeSeries.name}
            </div>
            <div className="book-summary-sub">{data.challengeSeries.subtitle}</div>
            <div className="book-summary-rank">
              ⚔️ {stats.ces.challenge.done}/{stats.ces.total} challenges · 🏗️ {stats.ces.solution.done}/{stats.ces.total} solutions
            </div>
          </div>
        </motion.button>
      </div>

      <div className="dash-bottom-grid dashboard-collection">
        <section className="card recent-achievements-card">
          <div className="card-header-row"><div><div className="eyebrow">THE LITTLE WINS</div><h3>Milestones worth keeping.</h3></div><button className="collection-arrow" aria-label="View all achievements" onClick={() => onNavigateView({ view: "achievements" })}>&#8599;</button></div>
          {recentUnlocks.length === 0 ? <div className="milestone-empty"><span aria-hidden="true">&#10023;</span><p>Your first milestone is ahead.<small>Finish a chapter to start your collection.</small></p></div> : <div className="recent-achievements-list">{recentUnlocks.map((a, i) => <motion.button key={a.id} className="milestone-row" whileHover={{ x: 3 }} onClick={() => onNavigateView({ view: "achievements" })}><span className="milestone-medal" aria-hidden="true"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="12" cy="9" r="6"/><path d="m8 14-2 8 6-3 6 3-2-8m-7-5 2 2 4-4"/></svg></span><span className="milestone-copy"><strong>{a.name}</strong><small>{new Date(a.unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} &middot; Earned</small></span><span className="milestone-number">{String(i + 1).padStart(2, "0")}</span></motion.button>)}</div>}
        </section>
        <motion.button className="card profile-link-card profile-journey-card" whileHover={{ y: -3 }} onClick={() => onNavigateView({ view: "profile" })}>
          <div className="profile-card-top"><span className="eyebrow">YOUR LEARNING STORY</span><span className="collection-arrow" aria-hidden="true">&#8599;</span></div>
          <div className="profile-card-art" aria-hidden="true"><span/><span/><span/><svg viewBox="0 0 240 60" fill="none"><path d="M0 52C30 52 30 35 60 35S95 48 125 26 160 32 190 14 225 16 240 3" stroke="currentColor" strokeWidth="2"/></svg></div>
          <div className="profile-link-title">Small steps.<br/>A remarkable journey.</div><div className="profile-link-sub">Discover the habits behind your progress.</div>
          <div className="profile-card-stats"><span><strong>{data.meta.streak || 0}</strong> day streak</span><span><strong>{stats.totalDone}</strong> chapters complete</span></div>
        </motion.button>
      </div>
    </div>
  );
}
