import PageHero from "./PageHero";
import { useDialog } from "../utils/useDialog";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function collectHighlights(data) {
  const items = [];
  for (const book of data.books) {
    for (let partIndex = 0; partIndex < book.parts.length; partIndex++) {
      const part = book.parts[partIndex];
      for (let topicIndex = 0; topicIndex < part.topics.length; topicIndex++) {
        const t = part.topics[topicIndex];
        for (const h of t.highlights || []) {
          if (h.note || h.imagePath) {
            items.push({
              ...h,
              bookName: book.name,
              bookColor: book.color,
              topicTitle: `§${t.num} ${t.title}`,
              target: { scope: "book", bookId: book.id, partIndex, topicIndex },
            });
          }
        }
      }
    }
  }
  const ces = data.challengeSeries;
  ces.projects.forEach((p, projectIndex) => {
    for (const side of ["challenge", "solution"]) {
      for (const h of p[`${side}Highlights`] || []) {
        if (h.note || h.imagePath) {
          items.push({
            ...h,
            bookName: ces.name,
            bookColor: ces.color,
            topicTitle: `${side === "challenge" ? "Challenge" : "Solution"}: ${p.name}`,
            target: { scope: "challenge", projectIndex, side },
          });
        }
      }
    }
  });
  items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return items;
}

export default function RevisionView({ data, onOpenReader }) {
  const [lightbox, setLightbox] = useState(null);
  const [query, setQuery] = useState("");
  const allItems = collectHighlights(data);
  const items = allItems.filter(item => `${item.note || ""} ${item.topicTitle} ${item.bookName}`.toLowerCase().includes(query.toLowerCase().trim()));

  return (
    <div className="view revision-view">
      <PageHero eyebrow="YOUR SECOND BRAIN" title="Keep the ideas that stay with you." description="Notes, sketches, and connections. A little collection of everything that clicked." accent="#c3b0ec"><div className="note-art" aria-hidden="true"><div className="paper-back"/><div className="paper-front"><span>FIELD NOTES</span><i/><i/><i/><b>&#10022;</b></div></div></PageHero>
      <div className="collection-toolbar"><label className="search-field"><span aria-hidden="true">&#8981;</span><input type="search" aria-label="Search notes" placeholder="Search notes, chapters, or handbooks..." value={query} onChange={e => setQuery(e.target.value)}/></label><span className="collection-count" role="status">{items.length} saved ideas</span></div>

      {items.length === 0 ? (
        <div className="designed-empty"><span className="empty-orbit" aria-hidden="true">&#9998;</span><h2>{query ? "No matching ideas yet." : "Make room for your next lightbulb moment."}</h2><p>{query ? "Try a different keyword or handbook name." : "Open a chapter, click a paragraph to highlight it, then use its pin to save a note or upload a diagram."}</p>{query && <button className="btn-secondary" onClick={() => setQuery("")}>Clear search</button>}</div>
      ) : (
        <div className="revision-grid">
          {items.map((item, i) => (
            <motion.div
              key={i}
              className="card revision-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
            >
              <div className="revision-card-book" style={{ color: item.bookColor }}>
                {item.bookName}
              </div>
              <div className="revision-card-title">{item.topicTitle}</div>

              {item.imagePath && (
                <button className="diagram-preview-button" aria-label={`Enlarge diagram for ${item.topicTitle}`} onClick={() => setLightbox(item.imagePath)}><img
                  src={`/${item.imagePath}`}
                  alt="Diagram"
                  className="revision-card-image"
                /></button>
              )}
              {item.note && <div className="revision-card-note">{item.note}</div>}

              <button className="link-btn" onClick={() => onOpenReader(item.target)}>
                Open chapter →
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightbox && (
          <DiagramLightbox path={lightbox} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function DiagramLightbox({ path, onClose }) {
  const ref = useDialog(onClose);
  return <motion.div ref={ref} role="dialog" aria-modal="true" aria-label="Diagram preview" tabIndex={-1} className="lightbox-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><button className="lightbox-close icon-btn" onClick={onClose} aria-label="Close diagram">Close &times;</button><img src={`/${path}`} alt="Saved diagram" onClick={e => e.stopPropagation()} /></motion.div>;
}
