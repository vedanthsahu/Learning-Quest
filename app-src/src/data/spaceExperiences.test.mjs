import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STATION_MODULES, initialLab, stepLab, savedReadingPercent, sectionRoute } from './spaceExperiences.js';
import { allTasks } from './incidentProject.js';

test('station modules link only to existing tasks and imported documents', async () => {
  const documents = JSON.parse(await readFile(new URL('./incidentDocuments.json', import.meta.url), 'utf8'));
  for (const module of STATION_MODULES) for (const id of module.tasks) {
    const task = allTasks.find(item => item.id === id);
    assert.ok(task, id);
    for (const path of task.docs) assert.ok(documents.some(doc => doc.path === path), path);
  }
});
test('simulation conserves every request under faults and recovery', () => {
  for (const cache of [true, false]) for (const connected of [true, false]) for (const burst of [true, false]) {
    let state = initialLab();
    for (let tick = 0; tick < 100; tick++) {
      state = stepLab(state, { cache, connected, burst });
      assert.equal(state.received, state.cached + state.completed + state.queued + state.dropped);
      assert.ok(state.queued >= 0 && state.queued <= 24);
    }
  }
});
test('a fault builds backlog; restoring cached normal traffic drains it', () => {
  let state = initialLab();
  for (let i = 0; i < 5; i++) state = stepLab(state, { cache: false, connected: false, burst: true });
  assert.equal(state.queued, 24);
  assert.ok(state.dropped > 0);
  for (let i = 0; i < 24; i++) state = stepLab(state, { cache: true, connected: true, burst: false });
  assert.equal(state.queued, 0);
  assert.equal(initialLab().received, 0);
});
test('saved reading is bounded and resilient to missing data', () => {
  assert.equal(savedReadingPercent({ scrollPct: .426 }), 43);
  assert.equal(savedReadingPercent({ scrollPct: 9 }), 100);
  assert.equal(savedReadingPercent({ scrollPct: -1 }), 0);
  assert.equal(savedReadingPercent({ scrollPct: 'not a number' }), 0);
  assert.equal(savedReadingPercent(), 0);
});
test('section routes preserve visible order and do not infer prerequisites', () => {
  const chapters = [{ id: 'a', partIndex: 0 }, { id: 'b', partIndex: 1 }, { id: 'c', partIndex: 0 }];
  assert.deepEqual(sectionRoute(chapters, chapters[0]).map(item => item.id), ['a', 'c']);
  assert.deepEqual(sectionRoute(chapters, null), []);
});
