// Cross-reference resolution for "§X.Y" mentions inside chapter markdown.
// Rule: a reference to an EARLIER point in the SAME book becomes a clickable jump
// (straight to the right subsection heading, if one exists); a reference to something
// AHEAD of where you currently are is left as plain, unclickable text (no spoilers /
// no routing into content you haven't reached yet). References to a companion
// handbook are always clickable, since a different book has no "ahead/behind" of its own.
// Orientation/front-matter content (Part 0) is exempt from the ahead/behind rule --
// it exists specifically to preview the whole book, so it may always link forward.

// Note: uses \s+ (not literal spaces) between words, because markdown source wraps long lines --
// a book name can end up split across a line break ("companion AI\nSystems Handbook's section
// 15"), and a literal space in the pattern would fail to match the newline, silently falling
// through to bare-section-number same-book resolution instead of the intended companion-book link.
const BOOK_NAME_MAP = [
  [/Software\s+Systems(?:\s+Engineering)?\s+Handbook/i, "ssh"],
  [/AI\s+Systems(?:\s+Engineering)?\s+Handbook/i, "ai"],
  [/Python\s+Backend(?:\s+Engineering)?\s+Handbook/i, "pbh"],
  [/Cloud\s+Engineering\s+Playbook/i, "cep"],
  [/DSA\s+Engineering\s+Handbook/i, "dsa"],
];

function resolveBookName(name) {
  if (!name) return null;
  for (const [re, id] of BOOK_NAME_MAP) if (re.test(name)) return id;
  return null;
}

// Builds, per book, a map from topic "num" (e.g. "72", "91.A", "0.1", "A") to its
// location + reading-order position ("flatIndex"), used for the ahead/behind check.
export function buildTopicIndex(data) {
  const perBook = {};
  for (const book of data.books) {
    const byNum = new Map();
    const byFlatIndex = [];
    let flat = 0;
    for (let partIndex = 0; partIndex < book.parts.length; partIndex++) {
      const part = book.parts[partIndex];
      for (let topicIndex = 0; topicIndex < part.topics.length; topicIndex++) {
        const t = part.topics[topicIndex];
        const entry = { partIndex, topicIndex, flatIndex: flat, num: t.num, title: t.title };
        byNum.set(t.num, entry);
        byFlatIndex.push(entry);
        flat += 1;
      }
    }
    perBook[book.id] = { byNum, byFlatIndex };
  }
  return perBook;
}

export function nextTopicRef(topicIndex, bookId, currentFlatIndex) {
  const bookIndex = topicIndex[bookId];
  if (!bookIndex) return null;
  return bookIndex.byFlatIndex[currentFlatIndex + 1] || null;
}

function finalize(entry, anchor, targetBookId, currentBookId, currentFlatIndex, exemptFromOrdering) {
  if (
    targetBookId === currentBookId &&
    !exemptFromOrdering &&
    currentFlatIndex != null &&
    entry.flatIndex > currentFlatIndex
  ) {
    return null; // forward reference within the same book -- deliberately not linked
  }
  return {
    bookId: targetBookId,
    partIndex: entry.partIndex,
    topicIndex: entry.topicIndex,
    anchor,
    num: entry.num,
    title: entry.title,
  };
}

export function resolveReference({ topicIndex, refNum, bookNameHint, currentBookId, currentFlatIndex, exemptFromOrdering }) {
  const targetBookId = resolveBookName(bookNameHint) || currentBookId;
  const bookIndex = topicIndex[targetBookId];
  if (!bookIndex) return null;

  // Try the reference as a topic num directly, then progressively drop trailing
  // ".segment" pieces until a real chapter-level topic is found. This correctly handles
  // every numbering shape we use: "26" (chapter), "91.A" (chapter-level, letter suffix),
  // "72.6" (chapter 72, subsection 6), and "0.1.2" (topic "0.1", subsection 2 within it).
  const segments = refNum.split(".");
  for (let len = segments.length; len >= 1; len--) {
    const candidate = segments.slice(0, len).join(".");
    if (bookIndex.byNum.has(candidate)) {
      const entry = bookIndex.byNum.get(candidate);
      const anchor = len === segments.length ? null : "sec-" + refNum.replace(/\./g, "-");
      return finalize(entry, anchor, targetBookId, currentBookId, currentFlatIndex, exemptFromOrdering);
    }
  }
  return null;
}

const REF_PATTERN =
  /(companion\s+(?:the\s+)?(Software\s+Systems(?:\s+Engineering)?\s+Handbook|AI\s+Systems(?:\s+Engineering)?\s+Handbook|Python\s+Backend(?:\s+Engineering)?\s+Handbook|Cloud\s+Engineering\s+Playbook|DSA\s+Engineering\s+Handbook)(?:'s)?\s*)?§\s*(\d+(?:\.(?:\d+|[A-Za-z]))*)/g;

// Rewrites raw chapter markdown so resolvable "§X.Y" mentions become internal links, while
// unresolvable / forward references pass through untouched.
//
// These are real, browser-navigable URLs (a hash route: #/reader/book/part/topic/anchor),
// not a custom unloadable scheme -- deliberately, so a plain `target="_blank"` on the
// rendered <a> just works via native browser new-tab behavior, with no click-interception
// JS needed at all. Opening cross-references in a new tab (rather than replacing the reader
// you're currently in) is the whole point: jumping to an earlier chapter shouldn't cost you
// your place in the one you were reading.
//
// History note: this used to be a custom pipe-delimited scheme ("internal|book|...") that
// Reader.jsx intercepted with preventDefault()+manual navigation. That broke outright once
// markdown parsing (micromark's normalizeUri, upstream of react-markdown's own urlTransform)
// started percent-encoding `|` to `%7C` -- every internal href silently mismatched the
// startsWith() checks meant to recognize it. Real hash URLs sidestep that class of bug
// entirely: there's nothing for a URL sanitizer to "break", because it's not a fake scheme.
export function linkifyReferences(rawMarkdown, { topicIndex, currentBookId, currentFlatIndex, currentPartIndex }) {
  const exemptFromOrdering = currentPartIndex === 0; // orientation content previews the whole book
  return rawMarkdown.replace(REF_PATTERN, (whole, _prefix, bookName, refNum) => {
    const target = resolveReference({
      topicIndex,
      refNum,
      bookNameHint: bookName,
      currentBookId,
      currentFlatIndex,
      exemptFromOrdering,
    });
    if (!target) return whole;
    const url = `#/reader/${target.bookId}/${target.partIndex}/${target.topicIndex}/${target.anchor || ""}`;
    return `[${whole}](${url})`;
  });
}

// Parses a `#/reader/book/part/topic/anchor` hash (from window.location.hash, or an <a href>
// pointing at one) back into a reader target. Returns null for anything else, including a
// plain empty hash.
export function parseReaderHash(hash) {
  if (!hash) return null;
  const cleaned = hash.replace(/^#/, "");
  const m = /^\/reader\/([^/]+)\/(\d+)\/(\d+)\/([^/]*)$/.exec(cleaned);
  if (!m) return null;
  const [, bookId, partIndex, topicIndex, anchor] = m;
  return { bookId, partIndex: Number(partIndex), topicIndex: Number(topicIndex), anchor: anchor || null };
}

// Extracts a leading chapter/subsection number from a heading's raw text so we can give
// the rendered heading a stable id ("sec-72-6") for the linkifier above to jump to.
export function headingAnchorId(rawText) {
  const m = /^(\d+(?:\.(?:\d+|[A-Za-z]))*)\.?\s+/.exec(rawText.trim());
  if (!m) return null;
  return "sec-" + m[1].replace(/\./g, "-");
}
