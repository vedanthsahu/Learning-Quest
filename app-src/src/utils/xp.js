// Pure functions computing derived game stats from the raw save-file shape.
// Nothing here mutates `data` -- every view recomputes from the source of truth.

export function bookStats(book, xpRules) {
  let total = 0, done = 0, inProgress = 0, activeSeconds = 0;
  for (const part of book.parts) {
    for (const t of part.topics) {
      total += 1;
      activeSeconds += t.activeSeconds || 0;
      if (t.status === "done") done += 1;
      else if (t.status === "in_progress") inProgress += 1;
    }
  }
  const notStarted = total - done - inProgress;
  const pct = total === 0 ? 0 : done / total;
  const xp = done * xpRules.done + inProgress * xpRules.inProgress;
  return { total, done, inProgress, notStarted, pct, xp, activeSeconds };
}

export function challengeStats(series) {
  const total = series.projects.length;
  let challengeDone = 0, challengeInProgress = 0, solutionDone = 0, solutionInProgress = 0, activeSeconds = 0;
  for (const p of series.projects) {
    activeSeconds += (p.challengeActiveSeconds || 0) + (p.solutionActiveSeconds || 0);
    if (p.challengeStatus === "done") challengeDone += 1;
    else if (p.challengeStatus === "in_progress") challengeInProgress += 1;
    if (p.solutionStatus === "done") solutionDone += 1;
    else if (p.solutionStatus === "in_progress") solutionInProgress += 1;
  }
  return {
    total,
    activeSeconds,
    challenge: { done: challengeDone, inProgress: challengeInProgress, notStarted: total - challengeDone - challengeInProgress, pct: total ? challengeDone / total : 0 },
    solution: { done: solutionDone, inProgress: solutionInProgress, notStarted: total - solutionDone - solutionInProgress, pct: total ? solutionDone / total : 0 },
  };
}

export function rankTitle(pct) {
  if (pct >= 1) return { title: "Legend", emoji: "👑" };
  if (pct >= 0.8) return { title: "Master", emoji: "🏆" };
  if (pct >= 0.6) return { title: "Expert", emoji: "🚀" };
  if (pct >= 0.4) return { title: "Adept", emoji: "⚡" };
  if (pct >= 0.2) return { title: "Apprentice", emoji: "📘" };
  return { title: "Novice", emoji: "🌱" };
}

export function computeOverallStats(data) {
  const perBook = data.books.map((b) => ({ id: b.id, name: b.name, color: b.color, subtitle: b.subtitle, ...bookStats(b, data.xpRules) }));
  const ces = challengeStats(data.challengeSeries);

  const totalTopics = perBook.reduce((s, b) => s + b.total, 0) + ces.total * 2; // challenge + solution tracked separately
  const totalDone = perBook.reduce((s, b) => s + b.done, 0) + ces.challenge.done + ces.solution.done;
  const totalInProgress = perBook.reduce((s, b) => s + b.inProgress, 0) + ces.challenge.inProgress + ces.solution.inProgress;
  const totalNotStarted = totalTopics - totalDone - totalInProgress;
  const pct = totalTopics === 0 ? 0 : totalDone / totalTopics;
  const totalActiveSeconds = perBook.reduce((s, b) => s + b.activeSeconds, 0) + ces.activeSeconds;

  const xp = totalDone * data.xpRules.done + totalInProgress * data.xpRules.inProgress;
  const maxXp = totalTopics * data.xpRules.done;

  const levels = data.levels;
  let levelIndex = 0;
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].xp) levelIndex = i;
  }
  const level = levels[levelIndex];
  const nextLevel = levels[levelIndex + 1] || null;
  const xpToNext = nextLevel ? nextLevel.xp - xp : 0;
  const levelProgressPct = nextLevel
    ? (xp - level.xp) / (nextLevel.xp - level.xp)
    : 1;

  const favoriteBook = perBook.reduce(
    (best, b) => (!best || b.activeSeconds > best.activeSeconds ? b : best),
    null
  );

  return {
    perBook,
    ces,
    totalTopics,
    totalDone,
    totalInProgress,
    totalNotStarted,
    pct,
    xp,
    maxXp,
    levelIndex,
    levelNumber: levelIndex + 1,
    level,
    nextLevel,
    xpToNext,
    levelProgressPct,
    totalActiveSeconds,
    favoriteBook,
  };
}

// Finds the single "next" topic to suggest continuing with -- first not-started/in-progress
// topic in reading order across the three books (in_progress preferred over not_started).
export function suggestNextTopic(data) {
  let candidate = null;
  for (const book of data.books) {
    for (let partIndex = 0; partIndex < book.parts.length; partIndex++) {
      const part = book.parts[partIndex];
      for (let topicIndex = 0; topicIndex < part.topics.length; topicIndex++) {
        const t = part.topics[topicIndex];
        if (t.status === "in_progress") {
          return { bookId: book.id, bookName: book.name, partName: part.name, partIndex, topicIndex, topic: t };
        }
        if (t.status === "not_started" && !candidate) {
          candidate = { bookId: book.id, bookName: book.name, partName: part.name, partIndex, topicIndex, topic: t };
        }
      }
    }
  }
  return candidate;
}

export function formatDuration(totalSeconds) {
  const s = Math.round(totalSeconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatMinutesShort(totalSeconds) {
  const m = Math.round((totalSeconds || 0) / 60);
  if (m < 1) return "<1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}
