import { motion } from "framer-motion";
import Mascot from "./Mascot";

const STATUS_ICON = { not_started: "○", in_progress: "◐", done: "●" };
const STATUS_CYCLE = { not_started: "in_progress", in_progress: "done", done: "not_started" };

export default function ChallengeView({ series, onOpenReader, onCycleStatus }) {
  return (
    <div className="view challenge-view">
      <div className="challenge-view-header">
        <Mascot level={1} mood="idle" size={72} />
        <div>
          <h2 style={{ color: series.color }}>{series.name}</h2>
          <div className="book-view-sub">{series.subtitle}</div>
        </div>
      </div>

      <div className="challenge-grid">
        {series.projects.map((p, index) => (
          <motion.div
            key={p.num}
            className="card challenge-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            style={{ "--node-color": series.color }}
          >
            <div className="challenge-card-num">#{p.num}</div>
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
