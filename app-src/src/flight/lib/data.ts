import { milestones, taskComplete, projectSummary } from "../../data/incidentProject";
import { ACHIEVEMENTS } from "../../data/achievements";
import { formatDuration, suggestNextTopic } from "../../utils/xp";

/**
 * LearningQuest content for the flight. The scene (adapted from Jordan
 * Perez's space-portfolio) was authored around six skill modules and seven
 * orbiting project cards; LearningQuest fills those slots with six real
 * momentum readouts and the seven Incident Command milestones. Everything
 * here is derived from the saved progress — nothing is invented.
 */

export type Skill = {
  /** HUD module number, "01".."06" */
  num: string;
  name: string;
  items: string;
};

export type Project = {
  id: string;
  title: string;
  meta: string;
  tagline: string;
  description: string;
  tags: string[];
  colorA: string;
  colorB: string;
  link: string | null;
  linkLabel?: string;
  featured?: boolean;
  optional?: boolean;
  done: number;
  total: number;
  tasks: { id: string; title: string; done: boolean }[];
};

export type FlightBook = {
  id: string;
  name: string;
  color: string;
  pct: number;
  done: number;
  total: number;
};

export const SKILL_COUNT = 6;
export const PROJECT_COUNT = milestones.length;

const MILESTONE_COLORS: [string, string][] = [
  ["#38bdf8", "#6366f1"],
  ["#f59e0b", "#f97316"],
  ["#14b8a6", "#6366f1"],
  ["#ec4899", "#8b5cf6"],
  ["#06b6d4", "#3b82f6"],
  ["#d97757", "#7c3aed"],
  ["#64748b", "#0ea5e9"],
];

export const SECTION_LABELS = {
  hero: "Home",
  launch: "Launch",
  about: "Library",
  experience: "Practice",
  skills: "Momentum",
  projects: "Build",
  contact: "Arrive",
} as const;

export const SCENE_LABELS = {
  about: "LIBRARY",
  projects: "BUILD",
  contact: "NEXT BUILD",
  workLog: "PRACTICE LAB",
  featured: "★ NEXT UP",
};

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

export function buildFlightContent(data: AnyData, stats: AnyData) {
  const progress = data.buildProjects?.["incident-command"] || {};
  const build = projectSummary(progress);
  const next = suggestNextTopic(data);
  const ces = stats.ces;
  const unlocked = Object.values(data.achievementState || {}).filter(
    (a: AnyData) => a?.unlocked
  ).length;
  const level = stats.level;

  const skills: Skill[] = [
    {
      num: "01",
      name: `Level ${stats.levelNumber}`,
      items: stats.nextLevel
        ? `${level.title} · ${stats.xp} XP · ${stats.xpToNext} to go`
        : `${level.title} · ${stats.xp} XP`,
    },
    {
      num: "02",
      name: "Chapters",
      items: `${stats.totalDone} of ${stats.totalTopics} done · ${Math.round(stats.pct * 100)}%`,
    },
    {
      num: "03",
      name: "Streak",
      items: `${data.meta.streak || 0} days · best ${data.meta.longestStreak || 0}`,
    },
    {
      num: "04",
      name: "Focus time",
      items: `${formatDuration(stats.totalActiveSeconds)} reading`,
    },
    {
      num: "05",
      name: "Challenges",
      items: `${ces.challenge.done}/${ces.total} built · ${ces.solution.done} reviewed`,
    },
    {
      num: "06",
      name: "Badges",
      items: `${unlocked} of ${ACHIEVEMENTS.length} unlocked`,
    },
  ];

  const projects: Project[] = milestones.map((m, i) => {
    const tasks = m.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      done: taskComplete(t, progress[t.id]),
    }));
    const done = tasks.filter((t) => t.done).length;
    const [colorA, colorB] = MILESTONE_COLORS[i % MILESTONE_COLORS.length];
    const containsNext = !!build.next && m.tasks.some((t) => t.id === build.next.id);
    return {
      id: m.id,
      title: m.title,
      meta: `Stage ${String(i + 1).padStart(2, "0")} · ${done}/${tasks.length} steps${m.optional ? " · optional" : ""}`,
      tagline: m.subtitle,
      description: m.subtitle,
      tags: tasks.map((t) => t.title.split(" ").slice(0, 2).join(" ")).slice(0, 3),
      colorA,
      colorB,
      link: null,
      featured: containsNext,
      optional: !!m.optional,
      done,
      total: tasks.length,
      tasks,
    };
  });

  const books: FlightBook[] = stats.perBook.map((b: AnyData) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    pct: b.pct,
    done: b.done,
    total: b.total,
  }));

  return {
    skills,
    projects,
    books,
    next,
    build,
    practice: {
      total: ces.total,
      challengeDone: ces.challenge.done,
      challengeInProgress: ces.challenge.inProgress,
      solutionDone: ces.solution.done,
      seriesName: data.challengeSeries.name as string,
      nextChallengeIndex: data.challengeSeries.projects.findIndex(
        (p: AnyData) => p.challengeStatus !== "done"
      ),
      nextChallenge:
        (data.challengeSeries.projects.find(
          (p: AnyData) => p.challengeStatus !== "done"
        ) as { num: string; name: string } | undefined) || null,
    },
    level: { number: stats.levelNumber, title: level.title, xp: stats.xp },
  };
}

export type FlightContent = ReturnType<typeof buildFlightContent>;
