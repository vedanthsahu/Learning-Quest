import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePreferences } from '../utils/preferences';
import { chapterEntries, chapterPoint, STATUS_LABEL, STATUS_NEXT, scrollFraction } from '../utils/chapterNavigation';
import { quizForPart, quizResultFor } from '../data/quizzes';
import { sectionRoute } from '../data/spaceExperiences';

const LearningScene = lazy(() => import('./LearningScene'));

function StatusButton({ chapter, bookId, onCycleStatus }) {
  return <button className={`chapter-state state-${chapter.status}`} aria-label={`${chapter.title}: ${STATUS_LABEL[chapter.status]}. Change to ${STATUS_LABEL[STATUS_NEXT[chapter.status]]}`}
    onClick={() => onCycleStatus(bookId, chapter.partIndex, chapter.topicIndex, STATUS_NEXT[chapter.status])}>
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7" />{chapter.status === 'done' ? <path d="m6 10 3 3 5-6" /> : chapter.status === 'in_progress' ? <path d="M10 3a7 7 0 0 1 0 14Z" fill="currentColor" /> : null}</svg>
    <span>{STATUS_LABEL[chapter.status]}</span>
  </button>;
}

function SectionQuiz({ bookId, partIndex, quizResults, onOpenQuiz }) {
  const quiz = quizForPart(bookId, partIndex);
  const result = quiz && quizResultFor(quizResults, quiz.id);
  return quiz && <button className="quiz-btn" onClick={() => onOpenQuiz(quiz.id)}>{result ? `Retake quiz (${result.bestScore}%)` : 'Test your knowledge'} &rarr;</button>;
}

function RocketTrack({ container, reduced, paused, revision }) {
  const path = useRef(null), rocket = useRef(null);
  const [geometry, setGeometry] = useState({ d: '', height: 0 });
  useEffect(() => {
    const region = container.current;
    if (!region) return;
    const measure = () => {
      const top = region.getBoundingClientRect().top;
      const points = [...region.querySelectorAll('.chapter-line')].map((row, i) => ({ x: i % 2 ? 43 : 25, y: row.getBoundingClientRect().top - top + row.offsetHeight / 2 }));
      const d = points.map((p, i) => i ? `C ${points[i - 1].x} ${(points[i - 1].y + p.y) / 2}, ${p.x} ${(points[i - 1].y + p.y) / 2}, ${p.x} ${p.y}` : `M ${p.x} ${p.y}`).join(' ');
      setGeometry({ d, height: region.offsetHeight });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(region); measure();
    return () => observer.disconnect();
  }, [container, revision]);
  useEffect(() => {
    if (!geometry.d || !path.current || !rocket.current) return;
    let frame = 0, timeout = 0, previous = 0;
    const update = () => {
      frame = 0;
      const length = path.current.getTotalLength();
      const rect = container.current.getBoundingClientRect();
      const amount = reduced ? 0 : scrollFraction(rect.top, rect.height, window.innerHeight, window.scrollY, document.documentElement.scrollHeight - window.innerHeight);
      const point = path.current.getPointAtLength(amount * length);
      const next = path.current.getPointAtLength(Math.min(length, amount * length + 2));
      const moving = !reduced && Math.abs(amount - previous) > .0001;
      const heading = next.y === point.y && next.x === point.x ? 180 : Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI + 90;
      rocket.current.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${heading})`);
      rocket.current.dataset.moving = String(moving);
      previous = amount;
      clearTimeout(timeout);
      timeout = setTimeout(() => { if (rocket.current) rocket.current.dataset.moving = 'false'; }, 160);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    if (!reduced && !paused) { window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule); }
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [geometry, container, reduced, paused]);
  return <svg className="rocket-track" width="68" height={geometry.height} aria-hidden="true">
    <path ref={path} d={geometry.d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 7" />
    <g ref={rocket} className="route-rocket">
      <path className="route-exhaust" d="M-4 12Q-5 24 0 34Q5 24 4 12" fill="#f4a077" />
      <path d="M-4 12Q-1 22 0 25Q1 22 4 12" fill="#c8eeff" className="route-exhaust" />
      <path d="M-6 4 -11 13 -4 11M6 4 11 13 4 11" fill="#7fb4ce" />
      <path d="M0-17C-7-10-8 5-4 13H4C8 5 7-10 0-17Z" fill="#edf4f6" stroke="#83a7bf" />
      <circle cy="-4" r="3" fill="#226281" />
    </g>
  </svg>;
}

export default function ChapterExplorer({ book, parts, mode, quizResults, onOpenReader, onCycleStatus, onOpenQuiz, paused }) {
  const { reduced } = usePreferences();
  const chapters = useMemo(() => chapterEntries(book.id, parts), [book.id, parts]);
  const [selection, setSelection] = useState(null);
  const [showRoute, setShowRoute] = useState(true);
  const region = useRef(null);
  const selected = chapters.find(chapter => chapter.id === selection) || chapters.find(chapter => chapter.status !== 'done') || chapters[0];
  const index = chapters.indexOf(selected);
  const nodes = useMemo(() => chapters.map(chapter => ({
    id: chapter.id, status: chapter.status, partIndex: chapter.partIndex,
    position: chapterPoint(chapter.partIndex, chapter.topicIndex, book.parts.length, book.parts[chapter.partIndex].topics.length),
    color: chapter.status === 'done' ? '#abd9bd' : chapter.status === 'in_progress' ? '#f4a077' : '#7db9d4',
  })), [chapters, book.parts]);
  if (!selected) return null;
  const route = sectionRoute(chapters, selected);
  const routeIds = showRoute ? route.map(chapter => chapter.id) : [];
  if (mode === 'globe') return <section className="chapter-globe" aria-label="Chapter globe explorer">
    <div className="globe-visual">
      <div className="globe-region-heading"><strong>{selected.partName}</strong><span>{route.length} visible chapters in this region</span></div>
      <Suspense fallback={<div className="learning-scene-fallback" role="status">Loading chapter globe…</div>}>
        <LearningScene nodes={nodes} selectedId={selected.id} onSelect={setSelection} routeIds={routeIds} />
      </Suspense>
      <p className="scene-instruction">Drag to rotate. Select a node to inspect a chapter.</p>
      <div className="globe-legend"><span><i className="node-unread" />Not started</span><span><i className="node-reading" />In progress</span><span><i className="node-done" />Completed</span></div>
    </div>
    <div className="globe-detail">
      <label className="explorer-select">Explore a section region<select value={selected.partIndex} onChange={event => { const first = chapters.find(chapter => chapter.partIndex === Number(event.target.value)); if (first) setSelection(first.id); }}>{parts.filter(part => chapters.some(chapter => chapter.partIndex === part.partIndex)).map(part => <option key={part.partIndex} value={part.partIndex}>{part.name}</option>)}</select></label>
      <label className="explorer-select">Choose a chapter<select value={selected.id} onChange={event => setSelection(event.target.value)}>{parts.map(part => <optgroup key={part.partIndex} label={part.name}>{chapters.filter(chapter => chapter.partIndex === part.partIndex).map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.num} · {chapter.title}</option>)}</optgroup>)}</select></label>
      <div className="globe-selection" aria-live="polite"><p>{selected.partName}</p><h2>{selected.title}</h2><p>Chapter {selected.num} &middot; {selected.estMinutes} min read</p></div>
      <StatusButton chapter={selected} bookId={book.id} onCycleStatus={onCycleStatus} />
      <button className="btn-primary" onClick={() => onOpenReader(selected.target)}>Read chapter &rarr;</button>
      <div className="explorer-stepper"><button disabled={index === 0} onClick={() => setSelection(chapters[index - 1].id)}>Previous</button><span>{index + 1} / {chapters.length}</span><button disabled={index === chapters.length - 1} onClick={() => setSelection(chapters[index + 1].id)}>Next</button></div>
      <SectionQuiz bookId={book.id} partIndex={selected.partIndex} quizResults={quizResults} onOpenQuiz={onOpenQuiz} />
      <div className="chapter-relationships"><label><input type="checkbox" checked={showRoute} onChange={event => setShowRoute(event.target.checked)} />Show section reading route</label><p>Connections follow the visible chapters in this section’s reading order. They are not prerequisites.</p><ol>{route.slice(Math.max(0, route.indexOf(selected) - 1), route.indexOf(selected) + 3).map(chapter => <li key={chapter.id}><button aria-current={chapter.id === selected.id ? 'step' : undefined} onClick={() => setSelection(chapter.id)}>{chapter.num} · {chapter.title}</button></li>)}</ol></div>
    </div>
  </section>;
  return <div className={`chapter-explorer ${mode === 'rocket' ? 'has-rocket' : ''}`}>
    {mode === 'rocket' && <p className="route-instruction">{reduced ? 'Quiet mode: the rocket stays parked. Every chapter is directly selectable.' : 'Scroll to fly the route. Stop at any chapter to read; flight does not change completion.'}</p>}
    <div className="chapter-route-content" ref={region}>
      {mode === 'rocket' && <RocketTrack container={region} reduced={reduced} paused={paused} revision={chapters.map(chapter => chapter.id).join(',')} />}
      {parts.map(part => <section className="chapter-list-section" key={part.partIndex}>
        <div className="quest-part-title-row"><h2>{part.name}</h2><SectionQuiz bookId={book.id} partIndex={part.partIndex} quizResults={quizResults} onOpenQuiz={onOpenQuiz} /></div>
        <ol className="chapter-lines">{chapters.filter(chapter => chapter.partIndex === part.partIndex).map(chapter => <li className={`chapter-line status-${chapter.status}`} key={chapter.id}>
          <button className="chapter-line-open" onClick={() => onOpenReader(chapter.target)}><span className="chapter-line-number">{chapter.num}</span><span className="chapter-line-title">{chapter.title}<small>{chapter.estMinutes} min read{chapter.scrollPct > 0 && ` · ${Math.round(Math.min(1, Math.max(0, chapter.scrollPct)) * 100)}% read`}</small></span><span aria-hidden="true">↗</span></button>
          <StatusButton chapter={chapter} bookId={book.id} onCycleStatus={onCycleStatus} />
        </li>)}</ol>
      </section>)}
    </div>
  </div>;
}
