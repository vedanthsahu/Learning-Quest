// Achievement definitions: pure functions of computed stats. `unlockedState` persistence
// (which badges have ever been earned, and when) lives in data.achievementState so a badge,
// once earned, is never revoked even if stats later change.

export const ACHIEVEMENTS = [
  {
    id: "first_steps",
    name: "First Steps",
    emoji: "🐣",
    description: "Complete your first topic in any book",
    progress: (s) => `${s.totalDone} / 1`,
    check: (s) => s.totalDone >= 1,
  },
  {
    id: "bookworm",
    name: "Bookworm",
    emoji: "📖",
    description: "Complete 25 topics total",
    progress: (s) => `${s.totalDone} / 25`,
    check: (s) => s.totalDone >= 25,
  },
  {
    id: "century_club",
    name: "Century Club",
    emoji: "💯",
    description: "Complete 100 topics total",
    progress: (s) => `${s.totalDone} / 100`,
    check: (s) => s.totalDone >= 100,
  },
  {
    id: "halfway_hero",
    name: "Halfway Hero",
    emoji: "🎯",
    description: "Reach 50% overall completion",
    progress: (s) => `${Math.round(s.pct * 100)}% / 50%`,
    check: (s) => s.pct >= 0.5,
  },
  {
    id: "systems_sensei",
    name: "Systems Sensei",
    emoji: "🧙",
    description: "Finish the Software Systems Handbook (100%)",
    progress: (s) => bookPctText(s, "ssh"),
    check: (s) => bookPct(s, "ssh") >= 1,
  },
  {
    id: "ai_whisperer",
    name: "AI Whisperer",
    emoji: "🤖",
    description: "Finish the AI Systems Handbook (100%)",
    progress: (s) => bookPctText(s, "ai"),
    check: (s) => bookPct(s, "ai") >= 1,
  },
  {
    id: "backend_master",
    name: "Backend Master",
    emoji: "🐍",
    description: "Finish the Python Backend Handbook (100%)",
    progress: (s) => bookPctText(s, "pbh"),
    check: (s) => bookPct(s, "pbh") >= 1,
  },
  {
    id: "cloud_architect",
    name: "Cloud Architect",
    emoji: "☁️",
    description: "Finish the Cloud Engineering Playbook (100%)",
    progress: (s) => bookPctText(s, "cep"),
    check: (s) => bookPct(s, "cep") >= 1,
  },
  {
    id: "algorithm_ace",
    name: "Algorithm Ace",
    emoji: "🧮",
    description: "Finish the DSA Engineering Handbook (100%)",
    progress: (s) => bookPctText(s, "dsa"),
    check: (s) => bookPct(s, "dsa") >= 1,
  },
  {
    id: "field_ready",
    name: "Field Ready",
    emoji: "🧭",
    description: "Finish the Practical Engineering Field Guide (100%)",
    progress: (s) => bookPctText(s, "peg"),
    check: (s) => bookPct(s, "peg") >= 1,
  },
  {
    id: "challenge_accepted",
    name: "Challenge Accepted",
    emoji: "⚔️",
    description: "Complete all 18 Engineering Challenges",
    progress: (s) => `${s.ces.challenge.done} / ${s.ces.total}`,
    check: (s) => s.ces.challenge.done >= s.ces.total,
  },
  {
    id: "solution_architect",
    name: "Solution Architect",
    emoji: "🏗️",
    description: "Review all 18 Solution Guides",
    progress: (s) => `${s.ces.solution.done} / ${s.ces.total}`,
    check: (s) => s.ces.solution.done >= s.ces.total,
  },
  {
    id: "on_a_roll",
    name: "On a Roll",
    emoji: "🔥",
    description: "Have 5+ topics In Progress at once",
    progress: (s) => `${s.totalInProgress} / 5`,
    check: (s) => s.totalInProgress >= 5,
  },
  {
    id: "note_taker",
    name: "Note Taker",
    emoji: "📝",
    description: "Write notes on at least 10 topics",
    progress: (s, data) => `${countNotes(data)} / 10`,
    check: (s, data) => countNotes(data) >= 10,
  },
  {
    id: "grandmaster",
    name: "Grandmaster",
    emoji: "👑",
    description: "Reach Level 8 (Grandmaster) or higher",
    progress: (s) => `Level ${s.levelNumber} / 8`,
    check: (s) => s.levelNumber >= 8,
  },
  {
    id: "legend",
    name: "Legend",
    emoji: "🌟",
    description: "Reach the max level -- Legend",
    progress: (s) => `Level ${s.levelNumber} / 9`,
    check: (s) => s.levelNumber >= 9,
  },
  {
    id: "streak_3",
    name: "Building Momentum",
    emoji: "🔥",
    description: "Reach a 3-day learning streak",
    progress: (s, data) => `${data.meta.streak} / 3 days`,
    check: (s, data) => data.meta.streak >= 3,
  },
  {
    id: "streak_7",
    name: "Unstoppable",
    emoji: "⚡",
    description: "Reach a 7-day learning streak",
    progress: (s, data) => `${data.meta.streak} / 7 days`,
    check: (s, data) => data.meta.streak >= 7,
  },
  {
    id: "marathon_reader",
    name: "Marathon Reader",
    emoji: "📚",
    description: "Spend 60+ active minutes reading in a single day",
    progress: (s, data) => `${Math.round(bestDaySeconds(data) / 60)} / 60 min`,
    check: (s, data) => bestDaySeconds(data) >= 3600,
  },
  {
    id: "dedicated",
    name: "Dedicated",
    emoji: "⏳",
    description: "Accumulate 7 total hours of active reading",
    progress: (s) => `${(s.totalActiveSeconds / 3600).toFixed(1)} / 7 hrs`,
    check: (s) => s.totalActiveSeconds >= 7 * 3600,
  },
  {
    id: "quiz_whiz",
    name: "Quiz Whiz",
    emoji: "🧠",
    description: "Score 100% on any quiz",
    progress: (s, data) => `${bestQuizScore(data)}% / 100%`,
    check: (s, data) => bestQuizScore(data) >= 100,
  },
  {
    id: "know_it_all",
    name: "Know-It-All",
    emoji: "🎓",
    description: "Complete 5 different quizzes",
    progress: (s, data) => `${Object.keys(data.quizResults || {}).length} / 5`,
    check: (s, data) => Object.keys(data.quizResults || {}).length >= 5,
  },
  {
    id: "full_stack_completionist",
    name: "Full Stack Completionist",
    emoji: "🎓",
    description: "100% across every book and every project",
    progress: (s) => `${s.totalDone} / ${s.totalTopics}`,
    check: (s) => s.totalDone >= s.totalTopics,
  },
];

function bookPct(stats, bookId) {
  const b = stats.perBook.find((x) => x.id === bookId);
  return b ? b.pct : 0;
}
function bookPctText(stats, bookId) {
  return `${Math.round(bookPct(stats, bookId) * 100)}% / 100%`;
}
function bestQuizScore(data) {
  const results = data.quizResults || {};
  return Object.values(results).reduce((best, r) => Math.max(best, r.bestScore || 0), 0);
}
function bestDaySeconds(data) {
  const log = data.meta.dailyLog || {};
  let best = 0;
  for (const day of Object.values(log)) {
    if ((day.seconds || 0) > best) best = day.seconds;
  }
  return best;
}
function countNotes(data) {
  let n = 0;
  for (const book of data.books) {
    for (const part of book.parts) {
      for (const t of part.topics) {
        n += (t.highlights || []).filter((h) => h.note && h.note.trim().length > 0).length;
      }
    }
  }
  for (const p of data.challengeSeries.projects) {
    n += (p.challengeHighlights || []).filter((h) => h.note && h.note.trim().length > 0).length;
    n += (p.solutionHighlights || []).filter((h) => h.note && h.note.trim().length > 0).length;
  }
  return n;
}
