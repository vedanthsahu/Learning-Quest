// Read Aloud, built on the browser's own SpeechSynthesis API -- chosen deliberately over a
// paid cloud TTS provider: zero setup, zero API key, works offline, and on Edge specifically
// the bundled "Online (Natural)" voices already sound close to human. Pace, pitch, and voice
// are all fully user-configurable (see the ChapterReader options and the settings persisted
// below), which was the actual ask -- realism was a secondary want this already covers well
// enough for most voices, with no cost or account required.

const PREF_KEY = "lq_tts_prefs_v1";

export function loadTtsPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { voiceURI: null, rate: 1, pitch: 1, ...parsed };
  } catch {
    return { voiceURI: null, rate: 1, pitch: 1 };
  }
}

export function saveTtsPrefs(prefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    // Private browsing / storage disabled: voice+pace just won't be remembered next time,
    // not worth surfacing an error for.
  }
}

export function isTtsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Voice lists load asynchronously in most browsers -- calling getVoices() once, synchronously,
// on first mount very often returns an empty array before the OS has actually enumerated them.
export function getVoicesAsync() {
  return new Promise((resolve) => {
    if (!isTtsSupported()) {
      resolve([]);
      return;
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    // Fallback for browsers that never fire the event for an empty-then-populated list.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

// Whether the current browser can draw a live per-word highlight via the CSS Custom
// Highlight API (Chrome/Edge 105+; not universal yet). Word-level highlighting is a
// nice-to-have layered on top of the block-level "now reading" highlight, which always
// works regardless -- so callers should just skip word highlighting when this is false
// rather than treating it as an error.
export function isWordHighlightSupported() {
  return typeof window !== "undefined" && typeof window.Highlight === "function" && "highlights" in CSS;
}

// Maps a plain-text character range -- as reported by SpeechSynthesisUtterance's `boundary`
// event, computed against `el.textContent` -- back to a DOM Range inside `el`. Deliberately
// NOT done by wrapping the word in a new <span>: the rendered chapter text has bold/italic/
// links/inline-code mixed in, and a word boundary can fall in the middle of one of those
// (or straddle two), so mutating the DOM per word risks corrupting that markup. A Range can
// point into the middle of existing nodes without touching them at all.
export function rangeFromCharOffset(el, start, end) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  let pos = 0;
  let startNode = null;
  let startOffset = 0;
  let endNode = null;
  let endOffset = 0;
  while ((node = walker.nextNode())) {
    const len = node.textContent.length;
    if (startNode === null && pos + len >= start) {
      startNode = node;
      startOffset = Math.max(0, start - pos);
    }
    if (pos + len >= end) {
      endNode = node;
      endOffset = Math.max(0, Math.min(len, end - pos));
      break;
    }
    pos += len;
  }
  if (!startNode || !endNode) return null;
  try {
    const range = new Range();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  } catch {
    return null; // e.g. a stale offset from a block that changed shape mid-utterance
  }
}

// Many browsers' `boundary` events don't reliably report `charLength` for the word that just
// started -- fall back to scanning forward from charIndex to the next whitespace/punctuation.
export function guessWordLength(text, start) {
  const m = /^\S+/.exec(text.slice(start));
  return m ? m[0].length : 1;
}

// Speaks an ordered list of {text} blocks one at a time (rather than one giant utterance for
// the whole chapter), so playback can report which block is currently being read -- for
// auto-scroll and a "now reading" highlight -- and so a long chapter doesn't hit the ~15s
// single-utterance cutoff some Chromium versions have.
export class ChapterReader {
  constructor({ onBlockStart, onWordBoundary, onDone } = {}) {
    this.voice = null;
    this.rate = 1;
    this.pitch = 1;
    this.onBlockStart = onBlockStart;
    this.onWordBoundary = onWordBoundary;
    this.onDone = onDone;
    this.blocks = [];
    this.stopped = true;
  }

  setVoice(voice) {
    this.voice = voice;
  }
  setRate(rate) {
    this.rate = rate;
  }

  playFrom(blocks, startIndex = 0) {
    window.speechSynthesis.cancel();
    this.blocks = blocks;
    this.stopped = false;
    this._speakIndex(startIndex);
  }

  _speakIndex(i) {
    if (this.stopped || i >= this.blocks.length) {
      this.stopped = true;
      this.onDone?.();
      return;
    }
    const block = this.blocks[i];
    const utter = new SpeechSynthesisUtterance(block.text);
    if (this.voice) utter.voice = this.voice;
    utter.rate = this.rate;
    utter.pitch = this.pitch;
    utter.onstart = () => this.onBlockStart?.(block, i);
    utter.onboundary = (event) => {
      // Some voices only ever fire "sentence" boundaries, not "word" -- word highlighting
      // just won't animate for those; the block-level highlight still covers it.
      if (event.name && event.name !== "word") return;
      this.onWordBoundary?.(block, event.charIndex, event.charLength);
    };
    utter.onend = () => {
      if (!this.stopped) this._speakIndex(i + 1);
    };
    utter.onerror = () => {
      // A block that fails to speak (empty text, an unsupported character run) shouldn't
      // silently stall the whole chapter -- move on to the next one.
      if (!this.stopped) this._speakIndex(i + 1);
    };
    window.speechSynthesis.speak(utter);
  }

  pause() {
    window.speechSynthesis.pause();
  }
  resume() {
    window.speechSynthesis.resume();
  }
  stop() {
    this.stopped = true;
    window.speechSynthesis.cancel();
  }
  get isStopped() {
    return this.stopped;
  }
}
