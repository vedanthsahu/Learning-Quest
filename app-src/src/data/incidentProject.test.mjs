import test from 'node:test';
import assert from 'node:assert/strict';
import { allTasks, milestones, taskComplete, projectSummary } from './incidentProject.js';
import { readFileSync, existsSync } from 'node:fs';
const docs = JSON.parse(readFileSync(new URL('./incidentDocuments.json', import.meta.url)));

test('every task has a unique stable ID, real documents and acceptance criteria', () => {
  assert.equal(new Set(allTasks.map(t => t.id)).size, allTasks.length);
  for (const task of allTasks) {
    assert.ok(task.checks.length > 0);
    for (const path of task.docs) assert.ok(docs.some(d => d.path === path), path);
  }
  for (const doc of docs) assert.ok(existsSync(new URL(`../../../content/incident-command/${doc.path}`, import.meta.url)), doc.path);
});
test('reading or status alone cannot imply verified implementation', () => {
  const task = allTasks[0];
  assert.equal(taskComplete(task), false);
  assert.equal(taskComplete(task, { status: 'done' }), false);
  const checks = Object.fromEntries(task.checks.map((_, i) => [i, true]));
  assert.equal(taskComplete(task, { status: 'active', checks }), false);
  assert.equal(taskComplete(task, { status: 'done', checks }), true);
  assert.equal(taskComplete(task, { status: 'done', checks: { ...checks, 0: false } }), false);
});
test('optional AWS does not change the core completion percentage', () => {
  const saved = Object.fromEntries(allTasks.map(t => [t.id, { status: 'done', checks: Object.fromEntries(t.checks.map((_, i) => [i, true])) }]));
  for (const task of milestones.find(m => m.optional).tasks) delete saved[task.id];
  const summary = projectSummary(saved);
  assert.equal(summary.percent, 100);
  assert.equal(summary.next, undefined);
  delete saved[allTasks[2].id];
  assert.equal(projectSummary(saved).next.id, allTasks[2].id);
});
