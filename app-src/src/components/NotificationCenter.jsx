import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import Mascot from "./Mascot";
import { playFanfare, playUnlock, playDing, playComplete } from "../utils/sound";

export default function NotificationCenter({ events, dismissEvent }) {
  // Celebrate the action first, then its level/achievement milestones. Display
  // one at a time so simultaneous unlocks never obscure the reading controls.
  const activeId = useRef(null);
  const current = events.find(e => e.id === activeId.current) || events.find(e => e.type === "complete") || events[0];
  activeId.current = current?.id;
  return <div className="celebration-stack" aria-live="polite" aria-atomic="true">
    <AnimatePresence mode="wait">
      {current && <Celebration key={current.id} event={current} remaining={events.length - 1} onDismiss={() => dismissEvent(current.id)}/>}
    </AnimatePresence>
  </div>;
}

function Celebration({ event, remaining, onDismiss }) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const played = useRef(false);
  const timeLeft = useRef(6500);
  const paused = hovered || focused || hidden;
  const levelup = event.type === "levelup";
  const achievement = event.type === "achievement";
  const complete = event.type === "complete";
  const title = levelup ? `Hello, Level ${event.levelNumber}.` : achievement ? "A new milestone, earned." : complete ? "One step further." : "Time well invested.";
  const detail = levelup ? event.level.title : achievement ? event.achievement.name : event.title;
  const label = levelup ? "LEVEL UP" : achievement ? "ACHIEVEMENT UNLOCKED" : complete ? (event.label || "Chapter complete").toUpperCase() : `${event.minutes} MIN READING SESSION`;

  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    if (!reduceMotion && (complete || achievement || levelup)) {
      confetti({ disableForReducedMotion: true, particleCount: levelup ? 85 : 42, spread: 65, startVelocity: 24, gravity: .85, ticks: 160, colors: ["#bde993", "#e4c588", "#c3b0ec"], origin: { x: .75, y: .75 }, zIndex: 120 });
    }
    if (levelup) playFanfare(); else if (achievement) playUnlock(); else if (complete) playComplete(); else playDing();
  }, [reduceMotion, complete, achievement, levelup]);
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(() => dismissRef.current(), timeLeft.current);
    return () => { clearTimeout(timer); timeLeft.current = Math.max(0, timeLeft.current - (Date.now() - started)); };
  }, [paused]);

  return <motion.section className={`celebration-card ${levelup || achievement ? "celebration-gold" : ""}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 30, scale: reduceMotion ? 1 : .94 }} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:reduceMotion ? 0 : 15}} transition={{type:"spring",damping:24,stiffness:280}}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
    <button className="celebration-dismiss" aria-label="Dismiss notification" onClick={onDismiss}>&times;</button>
    <div className="celebration-art" aria-hidden="true">{levelup ? <Mascot mood="levelup" level={event.levelNumber} size={100}/> : <div className="completion-seal"><svg viewBox="0 0 64 64" fill="none"><circle className="completion-circle" cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5"/>{achievement ? <path className="completion-check" d="m32 15 5 11 12 2-9 9 2 12-10-6-10 6 2-12-9-9 12-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/> : <path className="completion-check" d="m19 33 9 9 18-21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}</svg><i/><i/><i/></div>}</div>
    <div className="celebration-copy"><div className="eyebrow">{label}</div><h2>{title}</h2><p>{detail}</p><div className="celebration-meta">{complete && event.xp > 0 && <span className="xp-reward">+{event.xp} XP</span>}<span>{remaining ? `${remaining} more milestone${remaining === 1 ? "" : "s"}` : complete ? "Keep that curiosity going." : "Progress worth celebrating."}</span></div></div>
    <div className="celebration-time" style={{animationPlayState:paused ? "paused" : "running"}}/>
  </motion.section>;
}
