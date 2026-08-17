import { motion } from "framer-motion";
import ProgressRing from "./ProgressRing";
import { bookStats, rankTitle } from "../utils/xp";
import { mascotForBook } from "../utils/mascots";
import { quizForPart, quizResultFor } from "../data/quizzes";

const STATUS_CYCLE = { not_started: "in_progress", in_progress: "done", done: "not_started" };
const STATUS_ICON = { not_started: "○", in_progress: "◐", done: "●" };

export default function BookView({ book, xpRules, quizResults, onOpenReader, onCycleStatus, onOpenQuiz, onBack }) {
  const stats = bookStats(book, xpRules);
  const rank = rankTitle(stats.pct);
  const Companion = mascotForBook(book.id);
  const bookMood = stats.pct >= 1 ? "happy" : "idle";

  return (
    <div className="view book-view">
      <div className="book-view-header">
        <button className="icon-btn" onClick={onBack}>
          ← Back
        </button>
        <Companion level={1} mood={bookMood} size={80} />
        <ProgressRing pct={stats.pct} color={book.color} size={72} />
        <div>
          <h2 style={{ color: book.color }}>{book.name}</h2>
          <div className="book-view-sub">{book.subtitle}</div>
          <div className="book-view-rank">
            {rank.emoji} {rank.title} · {stats.done}/{stats.total} chapters done
          </div>
        </div>
      </div>

      {book.parts.map((part, partIndex) => {
        const quiz = quizForPart(book.id, partIndex);
        const result = quiz ? quizResultFor(quizResults, quiz.id) : null;
        return (
        <div key={part.name} className="quest-part">
          <div className="quest-part-title-row">
            <div className="quest-part-title">{part.name}</div>
            {quiz && (
              <button className="quiz-btn" onClick={() => onOpenQuiz(quiz.id)}>
                🧠 {result ? `Retake Quiz (${result.bestScore}%)` : "Take Quiz"}
              </button>
            )}
          </div>
          <div className="quest-node-grid">
            {part.topics.map((t, topicIndex) => (
              <motion.div
                key={t.num}
                className={`quest-node status-${t.status}`}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenReader({ scope: "book", bookId: book.id, partIndex, topicIndex })}
                style={{ "--node-color": book.color }}
              >
                <button
                  className="quest-node-status-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCycleStatus(book.id, partIndex, topicIndex, STATUS_CYCLE[t.status]);
                  }}
                  title="Click to cycle status"
                >
                  {STATUS_ICON[t.status]}
                </button>
                <div className="quest-node-num">§{t.num}</div>
                <div className="quest-node-title">{t.title}</div>
                <div className="quest-node-meta">
                  ~{t.estMinutes} min
                  {t.scrollPct > 0 && t.status !== "done" && (
                    <span className="quest-node-scroll"> · {Math.round(t.scrollPct * 100)}% read</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}
