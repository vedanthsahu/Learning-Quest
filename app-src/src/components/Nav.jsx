import { useState } from "react";
import { setSoundEnabled, isSoundEnabled } from "../utils/sound";

const ICONS = {
  home: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  book: <><path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/></>,
  code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/></>,
  notes: <><path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M14 3l7 7h-7Z"/><path d="M7 13h8m-8 4h6"/></>,
  award: <><circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  volume: <><path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  mute: <><path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
};
function Icon({ name }) { return <svg className="nav-line-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name] || ICONS.book}</svg>; }

export default function Nav({ view, data, onNavigate, saveStatus }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  function navigate(target) { setMenuOpen(false); onNavigate(target); }
  function toggleSound() { const next = !soundOn; setSoundOn(next); setSoundEnabled(next); }
  const saveLabel = { idle: "Ready to explore", saving: "Saving progress...", saved: "Progress saved", error: "Save failed" }[saveStatus];
  function item(label, icon, target, color, badge) {
    const active = view.view === target.view && (target.view !== "book" || view.bookId === target.bookId);
    return <button key={target.bookId || target.view} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} style={{"--nav-color": color || "#bcf588"}} onClick={() => navigate(target)}>
      <span className="nav-item-icon"><Icon name={icon}/></span><span className="nav-item-label">{label}</span>{badge && <span className="nav-item-badge" aria-hidden="true">{badge}</span>}
    </button>;
  }
  return <nav className={`nav-sidebar ${menuOpen ? "menu-open" : ""}`} aria-label="Main navigation">
    <div className="nav-logo">
      <span className="nav-logo-icon" aria-hidden="true"><svg viewBox="0 0 32 32" width="28" height="28" fill="none"><path d="m16 3 3.8 9.2L29 16l-9.2 3.8L16 29l-3.8-9.2L3 16l9.2-3.8Z" fill="currentColor"/><circle cx="16" cy="16" r="3" fill="#bcf588"/></svg></span><span>Learning Quest<small>A SPACE TO GROW</small></span>
      <button className="mobile-menu-toggle" aria-expanded={menuOpen} aria-controls="nav-links" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"}/></button>
    </div>
    <div className="nav-links" id="nav-links">
      {item("Dashboard", "home", {view:"dashboard"})}
      <div className="nav-section-label">Your library<span>{data.books.length}</span></div>
      {data.books.map((book, i) => item(book.name, "book", {view:"book",bookId:book.id}, book.color, String(i + 1).padStart(2,"0")))}
      <div className="nav-section-label">Put it into practice</div>
      {item("Challenge Series", "code", {view:"challenges"}, data.challengeSeries.color)}
      <div className="nav-section-label">Your collection</div>
      {item("Notes & Diagrams", "notes", {view:"revision"})}
      {item("Achievements", "award", {view:"achievements"})}
      {item("Profile", "user", {view:"profile"})}
    </div>
    <div className="nav-footer">
      <button className="sound-toggle" onClick={toggleSound} aria-label={soundOn ? "Mute sound effects" : "Enable sound effects"} aria-pressed={soundOn} title={soundOn ? "Mute sound effects" : "Enable sound effects"}><Icon name={soundOn ? "volume" : "mute"}/></button>
      <div><span className="nav-footer-label">YOUR LEARNING SPACE</span><span role="status" className={`save-indicator save-${saveStatus}`}><i/>{saveLabel}</span></div>
    </div>
  </nav>;
}
