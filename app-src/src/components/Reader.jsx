import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { buildTopicIndex, linkifyReferences, headingAnchorId, nextTopicRef } from "../utils/crossref";
import { useActiveTimer } from "../utils/useActiveTimer";
import { formatDuration } from "../utils/xp";
import { playPageTurn } from "../utils/sound";
import HighlightPanel from "./HighlightPanel";
import CodeBlock from "./CodeBlock";

function resolveRef(data, target) {
  if (target.scope === "book") {
    const book = data.books.find((b) => b.id === target.bookId);
    const part = book.parts[target.partIndex];
    const topic = part.topics[target.topicIndex];
    return {
      title: topic.title,
      num: topic.num,
      status: topic.status,
      contentFile: topic.contentFile,
      estMinutes: topic.estMinutes,
      scrollPct: topic.scrollPct || 0,
      highlights: topic.highlights || [],
      activeSeconds: topic.activeSeconds || 0,
      color: book.color,
      bookName: book.name,
      partName: part.name,
    };
  }
  const project = data.challengeSeries.projects[target.projectIndex];
  const side = target.side;
  const label = side === "challenge" ? "Challenge" : "Solution Guide";
  return {
    title: `${label}: ${project.name}`,
    num: project.num,
    status: project[`${side}Status`],
    contentFile: project[`${side}File`],
    estMinutes: project[`${side}EstMinutes`],
    scrollPct: project[`${side}ScrollPct`] || 0,
    highlights: project[`${side}Highlights`] || [],
    activeSeconds: project[`${side}ActiveSeconds`] || 0,
    color: data.challengeSeries.color,
    bookName: data.challengeSeries.name,
    partName: side === "challenge" ? "Challenge Guide" : "Solution Guide",
  };
}

export default function Reader({
  data,
  target,
  initialAnchor,
  initialDirection,
  onClose,
  onNavigate,
  updateTopic,
  updateChallengeProject,
  logActiveTime,
  updateScrollPct,
  toggleHighlight,
  saveHighlightDetails,
  removeHighlight,
  pushEvent,
}) {
  const [rawContent, setRawContent] = useState(null);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const containerRef = useRef(null);
  const blockCounterRef = useRef(0);
  const restoredScrollRef = useRef(false);
  const scrollSaveTimer = useRef(null);

  const info = resolveRef(data, target);
  const topicIndex = useMemo(() => buildTopicIndex(data), [data]);

  const currentBookId = target.scope === "book" ? target.bookId : "ces";
  const currentFlatIndex =
    target.scope === "book" ? topicIndex[target.bookId].byNum.get(info.num)?.flatIndex ?? null : null;

  // Lock background scrolling while the reader is open (also stops scroll-chaining into
  // the page behind it at the top/bottom of the chapter).
  useEffect(() => {
    document.body.classList.add("reader-open");
    return () => document.body.classList.remove("reader-open");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRawContent(null);
    setEditingBlockId(null);
    restoredScrollRef.current = false;
    fetch(`/${info.contentFile}`)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setRawContent(text);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.contentFile]);

  // Auto: opening a not-started chapter marks it in_progress.
  useEffect(() => {
    if (info.status === "not_started") {
      if (target.scope === "book") {
        updateTopic(target.bookId, target.partIndex, target.topicIndex, { status: "in_progress" });
      } else {
        updateChallengeProject(target.projectIndex, { [`${target.side}Status`]: "in_progress" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.bookId, target.partIndex, target.topicIndex, target.projectIndex, target.side]);

  // Restore scroll position (or jump to an incoming cross-reference anchor) once content lays out.
  useEffect(() => {
    if (rawContent === null || restoredScrollRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (initialAnchor) {
          const anchorEl = el.querySelector(`#${CSS.escape(initialAnchor)}`);
          if (anchorEl) {
            anchorEl.scrollIntoView({ block: "start" });
            restoredScrollRef.current = true;
            return;
          }
        }
        const scrollable = el.scrollHeight - el.clientHeight;
        if (scrollable > 0 && info.scrollPct > 0) {
          el.scrollTop = info.scrollPct * scrollable;
        }
        restoredScrollRef.current = true;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawContent, initialAnchor]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    const pct = scrollable > 0 ? Math.min(1, Math.max(0, el.scrollTop / scrollable)) : 0;
    if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
    scrollSaveTimer.current = setTimeout(() => {
      if (target.scope === "book") {
        updateScrollPct("book", { bookId: target.bookId, partIndex: target.partIndex, topicIndex: target.topicIndex }, pct);
      } else {
        updateScrollPct("challenge", { projectIndex: target.projectIndex, side: target.side }, pct);
      }
    }, 500);

    // Cheap "which section am I in" scan for the outline's active-item highlight -- at
    // most a handful of headings per chapter, so a direct DOM read on every scroll tick
    // is fine (no IntersectionObserver plumbing needed for a list this small).
    const ids = outlineIdsRef.current;
    if (ids.length) {
      let current = ids[0];
      for (const id of ids) {
        const headingEl = el.querySelector(`#${CSS.escape(id)}`);
        if (headingEl && headingEl.offsetTop - el.offsetTop <= el.scrollTop + 40) {
          current = id;
        } else {
          break;
        }
      }
      setActiveHeadingId(current);
    }
  }, [target, updateScrollPct]);

  // Active-time tracking (idle + tab-visibility aware, see useActiveTimer).
  const { elapsedSeconds } = useActiveTimer((delta) => {
    if (target.scope === "book") {
      logActiveTime({
        scope: "book",
        bookId: target.bookId,
        partIndex: target.partIndex,
        topicIndex: target.topicIndex,
        title: info.title,
        deltaSeconds: delta,
      });
    } else {
      logActiveTime({
        scope: "challenge",
        projectIndex: target.projectIndex,
        side: target.side,
        title: info.title,
        deltaSeconds: delta,
      });
    }
  });

  function handleClose() {
    if (elapsedSeconds >= 30) {
      pushEvent({ type: "session", minutes: Math.round(elapsedSeconds / 60), title: info.title });
    }
    onClose();
  }

  function handleMarkComplete() {
    if (info.status === "done") return; // already celebrated once; button is disabled anyway
    if (target.scope === "book") {
      updateTopic(target.bookId, target.partIndex, target.topicIndex, { status: "done" });
    } else {
      updateChallengeProject(target.projectIndex, { [`${target.side}Status`]: "done" });
    }
    pushEvent({ type: "complete", title: info.title });
  }
  function handleResetStatus() {
    if (target.scope === "book") {
      updateTopic(target.bookId, target.partIndex, target.topicIndex, { status: "not_started" });
    } else {
      updateChallengeProject(target.projectIndex, { [`${target.side}Status`]: "not_started" });
    }
  }

  const highlightRef = useMemo(
    () =>
      target.scope === "book"
        ? { bookId: target.bookId, partIndex: target.partIndex, topicIndex: target.topicIndex }
        : { projectIndex: target.projectIndex, side: target.side },
    [target.scope, target.bookId, target.partIndex, target.topicIndex, target.projectIndex, target.side]
  );

  // Ref-wrapped "latest callback" pattern (same trick useActiveTimer already uses for
  // onFlushRef): every value these closures need gets stashed in a ref and updated on
  // every render, so the FUNCTIONS handed to `components` below (see the big comment
  // there) never need to change identity. Without this, `components` would still
  // recompute -- and remount the whole chapter -- on every background data save (the
  // 15s active-timer flush, a debounced scroll save, anything), because useGameData
  // hands out brand-new toggleHighlight/saveHighlightDetails/removeHighlight function
  // references on every save, not just when something reader-visible changes.
  const latest = useRef({});
  latest.current = {
    highlights: info.highlights,
    toggleHighlight,
    saveHighlightDetails,
    removeHighlight,
    scope: target.scope,
    highlightRef,
  };

  const handleToggleHighlight = useCallback((blockId) => {
    const l = latest.current;
    l.toggleHighlight(l.scope, l.highlightRef, blockId);
  }, []);
  const handleSaveHighlight = useCallback((entry) => {
    const l = latest.current;
    l.saveHighlightDetails(l.scope, l.highlightRef, entry.blockId, { note: entry.note, imagePath: entry.imagePath });
  }, []);
  const handleRemoveHighlight = useCallback((blockId) => {
    const l = latest.current;
    l.removeHighlight(l.scope, l.highlightRef, blockId);
    setEditingBlockId(null);
  }, []);

  // "Continue to next" -- only meaningful within a single book's reading order for now.
  // The "forward" direction is threaded through onNavigate so the freshly-mounted Reader
  // for the next chapter knows to slide in from the right (a page-turn feel) instead of
  // using its normal pop-up entrance -- see the `initialDirection` prop below.
  const nextEntry = target.scope === "book" ? nextTopicRef(topicIndex, target.bookId, currentFlatIndex) : null;
  function handleNext() {
    playPageTurn();
    if (target.scope === "book" && nextEntry) {
      onNavigate({ scope: "book", bookId: target.bookId, partIndex: nextEntry.partIndex, topicIndex: nextEntry.topicIndex }, null, "forward");
    } else if (target.scope === "challenge" && target.side === "challenge") {
      onNavigate({ scope: "challenge", projectIndex: target.projectIndex, side: "solution" }, null, "forward");
    }
  }
  const showNext =
    (target.scope === "book" && nextEntry) || (target.scope === "challenge" && target.side === "challenge");

  const currentPartIndex = target.scope === "book" ? target.partIndex : null;
  const processedMarkdown = useMemo(() => {
    if (rawContent == null) return "";
    return linkifyReferences(rawContent, { topicIndex, currentBookId, currentFlatIndex, currentPartIndex });
  }, [rawContent, topicIndex, currentBookId, currentFlatIndex, currentPartIndex]);

  // "On this page" outline: pulled from the chapter's own numbered subheadings ("1. The
  // Vocabulary", "2. Where It Sits", ...) so the wide-viewport side margin does something
  // useful (jump navigation) instead of sitting empty. The un-numbered chapter title itself
  // (headingAnchorId requires a leading digit) is deliberately excluded.
  const outline = useMemo(() => {
    if (!rawContent) return [];
    const items = [];
    for (const line of rawContent.split("\n")) {
      const m = /^(#{2,3})\s+(.*)/.exec(line.trim());
      if (!m) continue;
      const text = m[2].trim();
      const id = headingAnchorId(text);
      if (!id) continue;
      items.push({ level: m[1].length, text, id });
    }
    return items;
  }, [rawContent]);

  const [activeHeadingId, setActiveHeadingId] = useState(null);
  const outlineIdsRef = useRef([]);
  outlineIdsRef.current = outline.map((o) => o.id);
  useEffect(() => {
    setActiveHeadingId(outline[0]?.id ?? null);
  }, [outline]);

  function handleOutlineClick(id) {
    const el = containerRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const totalActiveForNudge = info.activeSeconds + elapsedSeconds;
  const showNudge =
    info.status !== "done" && info.estMinutes && totalActiveForNudge >= info.estMinutes * 60 * 0.7;

  blockCounterRef.current = 0;

  // Memoized deliberately: `components` (and everything it closes over) must NOT change
  // identity on every Reader render, or react-markdown treats each entry as a brand-new
  // component type and unmounts/remounts the ENTIRE rendered chapter -- including any open
  // HighlightPanel's in-progress note text, and (more subtly) the <a> cross-reference links,
  // whose fresh DOM nodes can lose an in-flight click before the browser processes it,
  // falling through to a real page navigation. `editingBlockId` is the ONLY thing allowed
  // to force a remount here -- it's a deliberate user action (open/close a note panel), not
  // a background tick. Everything else this closure needs (highlights, handlers) comes from
  // the `latest` ref above specifically so a background save (the 15s active-timer flush, a
  // debounced scroll save, elapsedSeconds ticking every second) can never trigger it.
  const components = useMemo(() => {
    function BlockWrapper({ tag: Tag, children, ...rest }) {
      const id = blockCounterRef.current++;
      const highlight = latest.current.highlights.find((h) => h.blockId === id);
      return (
        <div className="rd-block-wrap">
          <Tag
            {...rest}
            onClick={(e) => {
              if (e.target.closest("a")) return;
              handleToggleHighlight(id);
            }}
            className={`rd-block${highlight ? " rd-highlighted" : ""}`}
            title="Click to highlight"
          >
            {children}
          </Tag>
          {highlight && (
            <button
              className={`rd-highlight-pin${highlight.note || highlight.imagePath ? " has-content" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setEditingBlockId(id);
              }}
              title="Add a note or diagram"
            >
              {highlight.imagePath ? "🖼️" : highlight.note ? "📝" : "➕"}
            </button>
          )}
          <AnimatePresence>
            {editingBlockId === id && (
              <HighlightPanel
                highlight={highlight}
                onSave={handleSaveHighlight}
                onRemove={() => handleRemoveHighlight(id)}
                onClose={() => setEditingBlockId(null)}
              />
            )}
          </AnimatePresence>
        </div>
      );
    }

    return {
      h1: ({ children }) => <h1 id={headingAnchorId(String(children))}>{children}</h1>,
      h2: ({ children }) => <h2 id={headingAnchorId(String(children))}>{children}</h2>,
      h3: ({ children }) => <h3 id={headingAnchorId(String(children))}>{children}</h3>,
      h4: ({ children }) => <h4 id={headingAnchorId(String(children))}>{children}</h4>,
      p: ({ children }) => <BlockWrapper tag="p">{children}</BlockWrapper>,
      li: ({ children }) => <BlockWrapper tag="li">{children}</BlockWrapper>,
      blockquote: ({ children }) => <BlockWrapper tag="blockquote">{children}</BlockWrapper>,
      pre: ({ children }) => <BlockWrapper tag="pre">{children}</BlockWrapper>,
      code: ({ inline, className, children }) =>
        inline ? (
          <code className="rd-inline-code">{children}</code>
        ) : (
          <CodeBlock className={className}>{children}</CodeBlock>
        ),
      // Every link -- cross-reference or external -- opens in a new tab. For a cross-
      // reference specifically, that's the whole point: jumping to an earlier chapter to
      // check something shouldn't cost you your scroll position in the one you're reading.
      // href is a real, browser-navigable hash URL (see crossref.js), so plain target="_blank"
      // is all that's needed -- no click interception, no manual navigation call.
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      ),
      table: ({ children }) => (
        <div className="rd-table-wrap">
          <table>{children}</table>
        </div>
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBlockId]);

  return (
    <motion.div className="reader-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="reader-panel"
        // "Continue to Next" arrives as a page-turn slide from the right; every other way
        // of opening the reader (dashboard, nav, a cross-reference in a new tab) keeps the
        // original pop-up-from-below entrance.
        initial={initialDirection === "forward" ? { x: 60, opacity: 0 } : { y: 24, opacity: 0 }}
        animate={initialDirection === "forward" ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="reader-header" style={{ borderColor: info.color }}>
          <div className="reader-header-left">
            <button className="icon-btn" onClick={handleClose} aria-label="Close">
              ✕
            </button>
            <div>
              <div className="reader-breadcrumb" style={{ color: info.color }}>
                {info.bookName} · {info.partName}
              </div>
              <div className="reader-title">
                §{info.num} {info.title}
              </div>
            </div>
          </div>
          <div className="reader-header-right">
            <span className={`reader-timer ${elapsedSeconds > 0 ? "ticking" : ""}`}>
              ⏱ {formatDuration(elapsedSeconds)}
            </span>
            <span className="reader-est">~{info.estMinutes} min read</span>
            <StatusPill status={info.status} />
          </div>
        </div>

        {showNudge && (
          <motion.div className="reader-nudge" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
            ⏳ You've spent a good while here — ready to mark this complete?
            <button className="btn-mini" onClick={handleMarkComplete}>
              ✅ Mark Complete
            </button>
          </motion.div>
        )}

        <div className="reader-body">
          <div className="reader-content" ref={containerRef} onScroll={handleScroll}>
            {rawContent === null ? (
              <div className="reader-loading">Loading chapter…</div>
            ) : (
              <motion.div key={info.contentFile} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                  {processedMarkdown}
                </ReactMarkdown>
              </motion.div>
            )}
          </div>

          {outline.length > 0 && (
            <nav className="reader-outline" aria-label="On this page">
              <div className="reader-outline-label">On this page</div>
              {outline.map((item) => (
                <button
                  key={item.id}
                  className={`reader-outline-item lvl-${item.level}${activeHeadingId === item.id ? " active" : ""}`}
                  onClick={() => handleOutlineClick(item.id)}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          )}
        </div>

        <button className="jump-top-btn" onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}>
          ↑ Top
        </button>

        <div className="reader-footer">
          <button className="btn-secondary" onClick={handleResetStatus}>
            Reset to Not Started
          </button>
          <div className="reader-footer-right">
            <motion.button
              className="btn-primary"
              onClick={handleMarkComplete}
              disabled={info.status === "done"}
              whileTap={info.status === "done" ? undefined : { scale: 0.9 }}
            >
              {info.status === "done" ? "✅ Completed" : "✅ Mark Complete"}
            </motion.button>
            {showNext && (
              <button className="btn-next" onClick={handleNext}>
                Continue to Next →
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatusPill({ status }) {
  const map = {
    done: { label: "Done", cls: "pill-done" },
    in_progress: { label: "In Progress", cls: "pill-inprogress" },
    not_started: { label: "Not Started", cls: "pill-notstarted" },
  };
  const s = map[status] || map.not_started;
  return <span className={`status-pill ${s.cls}`}>{s.label}</span>;
}
