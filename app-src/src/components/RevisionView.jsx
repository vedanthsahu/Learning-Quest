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
  const items = collectHighlights(data);

  return (
    <div className="view revision-view">
      <div className="revision-header">
        <h2>📌 Notes &amp; Diagrams</h2>
        <div className="book-view-sub">
          Everything you've highlighted with a note or a diagram, newest first — click a card to jump back to that chapter.
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-hint" style={{ marginTop: 20 }}>
          Nothing here yet — while reading, click any paragraph to highlight it, then use the 📝/🖼️ pin to
          add a note or sketch a diagram.
        </div>
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
                <img
                  src={`/${item.imagePath}`}
                  alt="Diagram"
                  className="revision-card-image"
                  onClick={() => setLightbox(item.imagePath)}
                />
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
          <motion.div
            className="lightbox-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.img
              src={`/${lightbox}`}
              alt="Diagram"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
