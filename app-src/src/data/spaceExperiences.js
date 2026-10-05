// Conceptual subsystem locations on the station, not physical ISS telemetry.
export const STATION_MODULES = [
  { id: 'workspace', name: 'React workspace', color: '#a8d6c1', position: [-1.8, .5, .45], description: 'The operator sees evidence, reviews a proposed action and follows recovery.', tasks: ['local-startup', 'notifications', 'traces', 'handoff'] },
  { id: 'control', name: 'Spring Boot control', color: '#9dd8ef', position: [.05, .3, .7], description: 'Identity, incident state and human approval stay in the backend. Models cannot bypass this boundary.', tasks: ['authorization', 'approval', 'recovery'] },
  { id: 'intelligence', name: 'Python intelligence', color: '#bbc0ed', position: [1.8, .5, .45], description: 'Gather grounded evidence, compare installed Ollama models and qualify an explicit free provider route.', tasks: ['grounding', 'ollama-inventory', 'openrouter', 'provider-failures', 'model-comparison', 'adaptive-routing', 'concurrent-evidence', 'retrieval'] },
  { id: 'testbed', name: 'Simulator & data', color: '#f4a077', position: [.05, -.85, .7], description: 'Reproduce failures, persist incident state and evaluate outcomes against recorded evidence.', tasks: ['persistence', 'scenario-baseline', 'scenarios', 'evaluation'] },
];

export const initialLab = () => ({ tick: 0, received: 0, cached: 0, completed: 0, queued: 0, dropped: 0, last: null });
// Illustrative units per tick, not measurements or production capacity estimates.
export function stepLab(state, { cache = true, connected = true, burst = false }) {
  const incoming = burst ? 18 : 6;
  const hits = cache ? Math.floor(incoming / 2) : 0;
  const waiting = state.queued + incoming - hits;
  const processed = connected ? Math.min(4, waiting) : 0;
  const queued = Math.min(24, waiting - processed);
  const dropped = Math.max(0, waiting - processed - queued);
  return { tick: state.tick + 1, received: state.received + incoming, cached: state.cached + hits,
    completed: state.completed + processed, queued, dropped: state.dropped + dropped,
    last: { incoming, hits, processed, dropped } };
}

export function savedReadingPercent(topic) {
  const value = Number(topic?.scrollPct);
  return Number.isFinite(value) ? Math.round(Math.min(1, Math.max(0, value)) * 100) : 0;
}

export function sectionRoute(chapters, selected) {
  if (!selected) return [];
  return chapters.filter(chapter => chapter.partIndex === selected.partIndex);
}
