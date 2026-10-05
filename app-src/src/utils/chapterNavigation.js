export const STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', done: 'Completed' };
export const STATUS_NEXT = { not_started: 'in_progress', in_progress: 'done', done: 'not_started' };

// Original indices are identities. Never renumber filtered chapters or use title as a key.
export function chapterEntries(bookId, parts) {
  return parts.flatMap(part => part.topics.map(topic => ({
    ...topic, partIndex: part.partIndex, partName: part.name,
    id: `${bookId}:${part.partIndex}:${topic.topicIndex}`,
    target: { scope: 'book', bookId, partIndex: part.partIndex, topicIndex: topic.topicIndex },
  })));
}

// Each section owns a latitude. Longitude retains its position even when filtered.
export function chapterPoint(partIndex, topicIndex, partCount, topicCount, radius = 1.7) {
  const latitude = partCount === 1 ? 0 : .98 - 1.96 * partIndex / (partCount - 1);
  const longitude = topicIndex / Math.max(1, topicCount) * Math.PI * 2 + partIndex * .37;
  return [radius * Math.cos(latitude) * Math.sin(longitude), radius * Math.sin(latitude), radius * Math.cos(latitude) * Math.cos(longitude)];
}

export function facingRotation([x, y, z]) {
  return [Math.atan2(y, Math.hypot(x, z)), -Math.atan2(x, z), 0];
}

export function scrollFraction(top, height, viewportHeight, scrollY, maxScroll) {
  const absoluteTop = top + scrollY;
  const start = Math.max(0, absoluteTop - viewportHeight * .85);
  const end = Math.min(maxScroll, absoluteTop + height - viewportHeight * .46);
  if (maxScroll <= 0) return 0;
  return Math.min(1, Math.max(0, (scrollY - Math.min(start, end)) / Math.max(1, end - start)));
}
