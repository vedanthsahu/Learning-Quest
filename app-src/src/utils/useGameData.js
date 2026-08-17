import { useState, useEffect, useRef } from "react";
import { fetchData, saveData } from "./api";
import { computeOverallStats } from "./xp";
import { ACHIEVEMENTS } from "../data/achievements";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayStr() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `evt-${Date.now()}-${idCounter}`;
}

export function useGameData() {
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const saveTimer = useRef(null);
  const dataRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await fetchData();
      const stats = computeOverallStats(raw);
      // Silent achievement backfill at load (no toasts -- these are historical, not "just now")
      for (const ach of ACHIEVEMENTS) {
        if (!raw.achievementState[ach.id]?.unlocked && ach.check(stats, raw)) {
          raw.achievementState[ach.id] = { unlocked: true, unlockedAt: new Date().toISOString() };
        }
      }
      if (cancelled) return;
      dataRef.current = raw;
      setData(raw);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addEvent(e) {
    setEvents((prev) => [...prev, { ...e, id: nextId() }]);
  }
  function dismissEvent(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function scheduleSave(next, immediate) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const doSave = async () => {
      setSaveStatus("saving");
      try {
        await saveData(next);
        setSaveStatus("saved");
      } catch (e) {
        setSaveStatus("error");
      }
    };
    if (immediate) doSave();
    else saveTimer.current = setTimeout(doSave, 600);
  }

  // Full pipeline: mutate -> diff achievements/level -> emit events -> save.
  function applyDataChange(next) {
    const prev = dataRef.current;
    const prevStats = computeOverallStats(prev);
    const nextStats = computeOverallStats(next);

    const newlyUnlocked = [];
    for (const ach of ACHIEVEMENTS) {
      const wasUnlocked = prev.achievementState[ach.id]?.unlocked;
      if (!wasUnlocked && ach.check(nextStats, next)) {
        next.achievementState[ach.id] = { unlocked: true, unlockedAt: new Date().toISOString() };
        newlyUnlocked.push(ach);
      }
    }

    dataRef.current = next;
    setData(next);

    if (nextStats.levelNumber > prevStats.levelNumber) {
      addEvent({ type: "levelup", level: nextStats.level, levelNumber: nextStats.levelNumber });
    }
    newlyUnlocked.forEach((ach) => addEvent({ type: "achievement", achievement: ach }));

    scheduleSave(next, false);
    return { prevStats, nextStats, leveledUp: nextStats.levelNumber > prevStats.levelNumber, newlyUnlocked };
  }

  // Lightweight pipeline for high-frequency, low-stakes patches (scroll position) --
  // no achievement diffing, just persist.
  function applyLightweightChange(next) {
    dataRef.current = next;
    setData(next);
    scheduleSave(next, false);
  }

  function updateTopic(bookId, partIndex, topicIndex, patch) {
    const next = structuredClone(dataRef.current);
    const book = next.books.find((b) => b.id === bookId);
    const topic = book.parts[partIndex].topics[topicIndex];
    Object.assign(topic, patch);
    if (patch.status === "done" && !topic.dateCompleted) {
      topic.dateCompleted = todayStr();
    }
    if (patch.status && patch.status !== "done") {
      topic.dateCompleted = null;
    }
    return applyDataChange(next);
  }

  function updateChallengeProject(index, patch) {
    const next = structuredClone(dataRef.current);
    const project = next.challengeSeries.projects[index];
    Object.assign(project, patch);
    if (
      project.challengeStatus === "done" &&
      project.solutionStatus === "done" &&
      !project.dateCompleted
    ) {
      project.dateCompleted = todayStr();
    }
    return applyDataChange(next);
  }

  // Records active reading seconds against a topic (scope "book") or a challenge/solution
  // side (scope "challenge"), rolls it into today's daily log, and advances the streak the
  // first time (and only the first time) real reading happens on a new day.
  function logActiveTime({ scope, bookId, partIndex, topicIndex, projectIndex, side, title, deltaSeconds }) {
    if (!deltaSeconds || deltaSeconds <= 0) return;
    const next = structuredClone(dataRef.current);

    if (scope === "book") {
      const book = next.books.find((b) => b.id === bookId);
      const topic = book.parts[partIndex].topics[topicIndex];
      topic.activeSeconds = (topic.activeSeconds || 0) + deltaSeconds;
    } else if (scope === "challenge") {
      const project = next.challengeSeries.projects[projectIndex];
      const key = `${side}ActiveSeconds`;
      project[key] = (project[key] || 0) + deltaSeconds;
    }

    next.meta.totalActiveSeconds = (next.meta.totalActiveSeconds || 0) + deltaSeconds;

    const today = todayStr();
    const log = next.meta.dailyLog[today] || { seconds: 0, chapters: [] };
    log.seconds += deltaSeconds;
    if (title && !log.chapters.includes(title)) log.chapters.push(title);
    next.meta.dailyLog[today] = log;

    if (next.meta.lastActiveDate !== today) {
      const yest = yesterdayStr();
      next.meta.streak = next.meta.lastActiveDate === yest ? (next.meta.streak || 0) + 1 : 1;
      next.meta.lastActiveDate = today;
      next.meta.longestStreak = Math.max(next.meta.longestStreak || 0, next.meta.streak);
    }

    return applyDataChange(next);
  }

  function updateScrollPct(scope, ref, pct) {
    const next = structuredClone(dataRef.current);
    if (scope === "book") {
      const book = next.books.find((b) => b.id === ref.bookId);
      book.parts[ref.partIndex].topics[ref.topicIndex].scrollPct = pct;
    } else if (scope === "challenge") {
      next.challengeSeries.projects[ref.projectIndex][`${ref.side}ScrollPct`] = pct;
    }
    applyLightweightChange(next);
  }

  // Highlights are objects: { blockId, note, imagePath, updatedAt } -- a highlight can
  // carry a written note and/or a pasted/uploaded diagram image for quick later revision.
  function getHighlightArray(dataObj, scope, ref) {
    if (scope === "book") {
      const book = dataObj.books.find((b) => b.id === ref.bookId);
      const topic = book.parts[ref.partIndex].topics[ref.topicIndex];
      topic.highlights = topic.highlights || [];
      return topic.highlights;
    }
    const project = dataObj.challengeSeries.projects[ref.projectIndex];
    const key = `${ref.side}Highlights`;
    project[key] = project[key] || [];
    return project[key];
  }

  function toggleHighlight(scope, ref, blockId) {
    const next = structuredClone(dataRef.current);
    const arr = getHighlightArray(next, scope, ref);
    const idx = arr.findIndex((h) => h.blockId === blockId);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push({ blockId, note: "", imagePath: null, updatedAt: new Date().toISOString() });
    applyLightweightChange(next);
  }

  function saveHighlightDetails(scope, ref, blockId, { note, imagePath }) {
    const next = structuredClone(dataRef.current);
    const arr = getHighlightArray(next, scope, ref);
    const idx = arr.findIndex((h) => h.blockId === blockId);
    const entry = { blockId, note, imagePath, updatedAt: new Date().toISOString() };
    if (idx >= 0) arr[idx] = entry;
    else arr.push(entry);
    applyLightweightChange(next);
  }

  function removeHighlight(scope, ref, blockId) {
    const next = structuredClone(dataRef.current);
    const arr = getHighlightArray(next, scope, ref);
    const idx = arr.findIndex((h) => h.blockId === blockId);
    if (idx >= 0) arr.splice(idx, 1);
    applyLightweightChange(next);
  }

  function recordQuizResult(quizId, scorePct) {
    const next = structuredClone(dataRef.current);
    const prev = next.quizResults[quizId] || { bestScore: 0, attempts: 0, lastAttemptAt: null };
    next.quizResults[quizId] = {
      bestScore: Math.max(prev.bestScore, scorePct),
      attempts: prev.attempts + 1,
      lastAttemptAt: new Date().toISOString(),
    };
    return applyDataChange(next);
  }

  const stats = data ? computeOverallStats(data) : null;

  return {
    data,
    stats,
    loading: !data,
    events,
    dismissEvent,
    pushEvent: addEvent,
    updateTopic,
    updateChallengeProject,
    logActiveTime,
    updateScrollPct,
    toggleHighlight,
    saveHighlightDetails,
    removeHighlight,
    recordQuizResult,
    saveStatus,
  };
}
