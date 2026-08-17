// Tiny synthesized sound effects via the Web Audio API -- no audio files needed,
// keeps the whole app self-contained in plain JS/JSON.

let ctx = null;
function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone({ freq, start, duration, type = "sine", gain = 0.15, slideTo = null }) {
  const audioCtx = getCtx();
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

let soundEnabled = true;
export function setSoundEnabled(v) {
  soundEnabled = v;
}
export function isSoundEnabled() {
  return soundEnabled;
}

export function playDing() {
  if (!soundEnabled) return;
  try {
    const t = getCtx().currentTime;
    tone({ freq: 880, start: t, duration: 0.12, type: "sine", gain: 0.12 });
    tone({ freq: 1318.5, start: t + 0.06, duration: 0.16, type: "sine", gain: 0.1 });
  } catch (e) { /* audio unavailable, fail silently */ }
}

export function playUndo() {
  if (!soundEnabled) return;
  try {
    const t = getCtx().currentTime;
    tone({ freq: 440, start: t, duration: 0.1, type: "sine", gain: 0.08, slideTo: 300 });
  } catch (e) {}
}

export function playFanfare() {
  if (!soundEnabled) return;
  try {
    const t = getCtx().currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, i) => {
      tone({ freq: f, start: t + i * 0.11, duration: 0.28, type: "triangle", gain: 0.14 });
    });
    tone({ freq: 1046.5, start: t + 0.44, duration: 0.5, type: "sine", gain: 0.1 });
  } catch (e) {}
}

export function playUnlock() {
  if (!soundEnabled) return;
  try {
    const t = getCtx().currentTime;
    tone({ freq: 660, start: t, duration: 0.1, type: "square", gain: 0.06 });
    tone({ freq: 990, start: t + 0.08, duration: 0.22, type: "sine", gain: 0.12 });
  } catch (e) {}
}

// A satisfying but modest "checkmark" chime for marking a single chapter complete --
// deliberately smaller than playFanfare (reserved for level-ups) so the everyday, most
// frequent reward in the app still feels good without competing with the bigger moments.
export function playComplete() {
  if (!soundEnabled) return;
  try {
    const t = getCtx().currentTime;
    tone({ freq: 587.33, start: t, duration: 0.1, type: "sine", gain: 0.11 }); // D5
    tone({ freq: 880, start: t + 0.07, duration: 0.24, type: "sine", gain: 0.13 }); // A5
  } catch (e) {}
}

// A soft, low "page turn" swish -- used when moving to the next chapter, deliberately
// different in character from every other sound here (a single downward-sliding tone
// rather than a chord), so it reads as transition rather than reward.
export function playPageTurn() {
  if (!soundEnabled) return;
  try {
    const t = getCtx().currentTime;
    tone({ freq: 320, start: t, duration: 0.16, type: "triangle", gain: 0.05, slideTo: 180 });
  } catch (e) {}
}
