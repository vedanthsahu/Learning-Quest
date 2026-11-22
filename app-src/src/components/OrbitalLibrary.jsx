import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePreferences } from '../utils/preferences';

const LearningScene = lazy(() => import('./LearningScene'));

export default function OrbitalLibrary({ books, onNavigateView }) {
  const { reduced } = usePreferences();
  const region = useRef(null);
  const viewportAnchor = useRef(null);
  const [position, setPosition] = useState(0);
  const [follow, setFollow] = useState(true);
  const index = Math.min(books.length - 1, Math.round(position));
  const book = books[index];
  const nodes = useMemo(() => books.map((item, i) => ({ id: item.id, color: item.color,
    position: [Math.sin(i / books.length * Math.PI * 2) * 2.25, .12, Math.cos(i / books.length * Math.PI * 2) * 2.25],
  })), [books]);
  useEffect(() => {
    if (!follow || reduced || !books.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = region.current.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (110 - rect.top) / Math.max(1, rect.height - Math.min(650, window.innerHeight * .8))));
      setPosition(progress * (books.length - 1));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule); update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [follow, reduced, books.length]);
  function pause() {
    if (follow) viewportAnchor.current = region.current.querySelector('.orbit-library-stage').getBoundingClientRect().top;
    setFollow(false);
  }
  // Collapsing the scroll runway must not move the book the user just selected.
  useLayoutEffect(() => {
    if (viewportAnchor.current === null) return;
    const offset = region.current.querySelector('.orbit-library-stage').getBoundingClientRect().top - viewportAnchor.current;
    viewportAnchor.current = null;
    if (Math.abs(offset) > 1) window.scrollBy({ top: offset, behavior: 'instant' });
  }, [follow]);
  function select(next) { pause(); setPosition(next); }
  if (!book) return <p>Your books will appear here when added to the library.</p>;
  return <section className={`orbital-library ${follow && !reduced ? 'follows-scroll' : ''}`} ref={region} aria-label="Orbital book library">
    <div className="orbit-library-stage">
      <div className="orbit-library-visual"><Suspense fallback={<div className="learning-scene-fallback" role="status">Loading orbital library…</div>}>
        <LearningScene orbit nodes={nodes} selectedId={book.id} angle={-position / books.length * Math.PI * 2} onSelect={id => select(books.findIndex(item => item.id === id))} />
      </Suspense><p className="scene-instruction">{reduced ? 'Choose a book with the controls.' : follow ? 'Scroll to turn the rings and discover your books.' : 'Orbit paused. Choose another book or resume scroll.'}</p></div>
      <div className="orbit-library-detail">
        <label className="explorer-select">Choose a book<select value={book.id} onChange={event => select(books.findIndex(item => item.id === event.target.value))}>{books.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="orbit-book-copy"><h3>{book.name}</h3><p>{book.subtitle}</p><p>{book.done} of {book.total} chapters completed</p></div>
        <button className="btn-primary" onClick={() => onNavigateView({ view: 'book', bookId: book.id })}>Explore this book &rarr;</button>
        <div className="explorer-stepper"><button disabled={index === 0} onClick={() => select(index - 1)}>Previous</button><span>{index + 1} / {books.length}</span><button disabled={index === books.length - 1} onClick={() => select(index + 1)}>Next</button></div>
        {!reduced && <button className="orbit-follow" aria-pressed={follow} onClick={() => follow ? pause() : setFollow(true)}>{follow ? 'Pause scroll browsing' : 'Resume scroll browsing'}</button>}
      </div>
    </div>
  </section>;
}
