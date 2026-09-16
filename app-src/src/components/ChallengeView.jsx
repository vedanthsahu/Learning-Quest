import PageHero from "./PageHero";
import { motion } from "framer-motion";
import Mascot from "./Mascot";

const STATUS_ICON = { not_started: "○", in_progress: "◐", done: "●" };
const STATUS_CYCLE = { not_started: "in_progress", in_progress: "done", done: "not_started" };

export default function ChallengeView({ series, onOpenReader, onCycleStatus }) {
  return (
    <div className="view challenge-view">
      <PageHero eyebrow="THE BUILD LAB" title="Turn understanding into craft." description={series.subtitle} accent={series.color}><Mascot mood="happy" size={170}/></PageHero>
      <div className="lab-summary"><div><strong>{series.projects.length}</strong><span>real-world projects</span></div><div><strong>{series.projects.filter(p => p.challengeStatus === "done").length}</strong><span>challenges completed</span></div><div><strong>{series.projects.filter(p => p.solutionStatus === "done").length}</strong><span>solutions explored</span></div></div>
      <div className="section-heading"><h2>{series.name}</h2><span>Try it. Build it. Understand it.</span></div>

      <div className="challenge-grid">
        {series.projects.map((p, index) => (
          <motion.div
            key={p.num}
            className="card challenge-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.3) }}
            style={{ "--node-color": series.color }}
          >
            <div className="challenge-card-num">EXPERIMENT / {String(p.num).padStart(2, "0")}<span aria-hidden="true">&lt;/&gt;</span></div>
            <div className="challenge-card-name">{p.name}</div>
            <div className="challenge-card-row">
              <button
                className={`challenge-side-btn status-${p.challengeStatus}`}
                onClick={() => onOpenReader({ scope: "challenge", projectIndex: index, side: "challenge" })}
              >
                <span className="dot">{STATUS_ICON[p.challengeStatus]}</span> Challenge
              </button>
              <button
                className="cycle-mini-btn"
                title="Cycle challenge status"
                onClick={() => onCycleStatus(index, "challengeStatus", STATUS_CYCLE[p.challengeStatus])}
              >
                ⟳
              </button>
            </div>
            <div className="challenge-card-row">
              <button
                className={`challenge-side-btn status-${p.solutionStatus}`}
                onClick={() => onOpenReader({ scope: "challenge", projectIndex: index, side: "solution" })}
              >
                <span className="dot">{STATUS_ICON[p.solutionStatus]}</span> Solution
              </button>
              <button
                className="cycle-mini-btn"
                title="Cycle solution status"
                onClick={() => onCycleStatus(index, "solutionStatus", STATUS_CYCLE[p.solutionStatus])}
              >
                ⟳
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
