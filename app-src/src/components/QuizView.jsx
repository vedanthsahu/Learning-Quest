import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { quizById } from "../data/quizzes";
import { playDing, playFanfare } from "../utils/sound";

export default function QuizView({ quizId, onClose, onFinish }) {
  const quiz = quizById(quizId);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  if (!quiz) return null;
  const question = quiz.questions[index];
  const isLast = index === quiz.questions.length - 1;

  function selectOption(i) {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    if (i === question.correct) playDing();
  }

  function next() {
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    setRevealed(false);
    if (isLast) {
      const correctCount = newAnswers.filter((a, i) => a === quiz.questions[i].correct).length;
      const scorePct = Math.round((correctCount / quiz.questions.length) * 100);
      setFinished(true);
      onFinish(quiz.id, scorePct);
      if (scorePct >= 80) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
        playFanfare();
      }
    } else {
      setIndex(index + 1);
    }
  }

  const correctCount = answers.filter((a, i) => a === quiz.questions[i].correct).length;
  const scorePct = quiz.questions.length ? Math.round((correctCount / quiz.questions.length) * 100) : 0;

  return (
    <motion.div className="reader-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="reader-panel quiz-panel"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="reader-header" style={{ borderColor: "#facc15" }}>
          <div className="reader-header-left">
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
            <div>
              <div className="reader-breadcrumb" style={{ color: "#facc15" }}>
                🧠 Quiz
              </div>
              <div className="reader-title">{quiz.partName}</div>
            </div>
          </div>
          {!finished && (
            <div className="reader-header-right">
              Question {index + 1} / {quiz.questions.length}
            </div>
          )}
        </div>

        <div className="reader-content quiz-content">
          {!finished ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="quiz-question-block"
              >
                <div className="quiz-question">{question.q}</div>
                <div className="quiz-options">
                  {question.options.map((opt, i) => {
                    let cls = "quiz-option";
                    if (revealed) {
                      if (i === question.correct) cls += " correct";
                      else if (i === selected) cls += " incorrect";
                    }
                    return (
                      <button key={i} className={cls} onClick={() => selectOption(i)} disabled={revealed}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {revealed && (
                  <motion.div className="quiz-explain" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <strong>{selected === question.correct ? "✅ Correct — " : "❌ Not quite — "}</strong>
                    {question.explain}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <motion.div className="quiz-results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="quiz-score-emoji">{scorePct >= 80 ? "🏆" : scorePct >= 50 ? "👍" : "📖"}</div>
              <div className="quiz-score-text">{scorePct}%</div>
              <div className="quiz-score-sub">
                {correctCount} / {quiz.questions.length} correct
                {scorePct >= 80 ? " — great recall!" : scorePct >= 50 ? " — solid, worth another pass" : " — maybe revisit this part"}
              </div>
            </motion.div>
          )}
        </div>

        {!finished && (
          <div className="reader-footer">
            <span className="quiz-progress-hint">
              {revealed ? "Read the explanation, then continue" : "Choose an answer"}
            </span>
            <button className="btn-primary" onClick={next} disabled={!revealed}>
              {isLast ? "Finish Quiz" : "Next Question →"}
            </button>
          </div>
        )}
        {finished && (
          <div className="reader-footer">
            <span />
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
