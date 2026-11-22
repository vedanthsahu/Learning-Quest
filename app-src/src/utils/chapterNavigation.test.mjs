import test from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Vector3 } from 'three';
import { chapterEntries, chapterPoint, facingRotation, scrollFraction } from './chapterNavigation.js';

test('filtered chapters keep source identities and reader targets', () => {
  const entries = chapterEntries('book', [{ partIndex: 3, name: 'Part', topics: [{ topicIndex: 8, num: '3.9', title: 'Same title' }, { topicIndex: 12, num: '3.13', title: 'Same title' }] }]);
  assert.equal(new Set(entries.map(item => item.id)).size, 2);
  assert.deepEqual(entries[1].target, { scope: 'book', bookId: 'book', partIndex: 3, topicIndex: 12 });
});
test('globe nodes lie on a sphere and the selected node rotates to face the reader', () => {
  for (let section = 0; section < 10; section++) for (let chapter = 0; chapter < 20; chapter++) {
    const point = chapterPoint(section, chapter, 10, 20);
    assert.ok(Math.abs(Math.hypot(...point) - 1.7) < 1e-9);
    const transformed = new Vector3(...point).applyEuler(new Euler(...facingRotation(point)));
    assert.ok(Math.abs(transformed.x) < 1e-9);
    assert.ok(Math.abs(transformed.y) < 1e-9);
    assert.ok(transformed.z > 1.69);
  }
});
test('a one-chapter globe and empty section avoid NaN', () => {
  assert.ok(chapterPoint(0, 0, 1, 0).every(Number.isFinite));
});
test('native scroll travel clamps in either direction', () => {
  assert.equal(scrollFraction(800, 2000, 1000, 0, 2000), 0);
  assert.equal(scrollFraction(-1200, 2000, 1000, 2000, 2000), 1);
  assert.equal(scrollFraction(-200, 2000, 1000, 1000, 2000), .5);
  assert.equal(scrollFraction(712, 383, 1000, 0, 190), 0);
  assert.equal(scrollFraction(522, 383, 1000, 190, 190), 1);
  assert.equal(scrollFraction(0, 0, 800, 0, 0), 0);
});
