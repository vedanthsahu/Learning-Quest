import { useState } from "react";
import { setSoundEnabled, isSoundEnabled } from "../utils/sound";

export default function Nav({ view, data, onNavigate, saveStatus }) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }

  const saveLabel = { idle: "", saving: "Saving…", saved: "✓ Saved", error: "⚠ Save failed" }[saveStatus];

  return (
    <nav className="nav-sidebar">
      <div className="nav-logo">
        <span className="nav-logo-icon">🎮</span> Learning Quest
      </div>

      <button className={`nav-item ${view.view === "dashboard" ? "active" : ""}`} onClick={() => onNavigate({ view: "dashboard" })}>
        🏠 Dashboard
      </button>

      <div className="nav-section-label">Handbooks</div>
      {data.books.map((b) => (
        <button
          key={b.id}
          className={`nav-item ${view.view === "book" && view.bookId === b.id ? "active" : ""}`}
          style={{ "--nav-color": b.color }}
          onClick={() => onNavigate({ view: "book", bookId: b.id })}
        >
          {b.name}
        </button>
      ))}

      <div className="nav-section-label">Practice</div>
      <button
        className={`nav-item ${view.view === "challenges" ? "active" : ""}`}
        style={{ "--nav-color": data.challengeSeries.color }}
        onClick={() => onNavigate({ view: "challenges" })}
      >
        ⚔️ Challenge Series
      </button>

      <div className="nav-section-label">You</div>
      <button className={`nav-item ${view.view === "revision" ? "active" : ""}`} onClick={() => onNavigate({ view: "revision" })}>
        📌 Notes &amp; Diagrams
      </button>
      <button className={`nav-item ${view.view === "achievements" ? "active" : ""}`} onClick={() => onNavigate({ view: "achievements" })}>
        🏅 Achievements
      </button>
      <button className={`nav-item ${view.view === "profile" ? "active" : ""}`} onClick={() => onNavigate({ view: "profile" })}>
        👤 Profile
      </button>

      <div className="nav-footer">
        <button className="sound-toggle" onClick={toggleSound}>
          {soundOn ? "🔊" : "🔇"}
        </button>
        <span className={`save-indicator save-${saveStatus}`}>{saveLabel}</span>
      </div>
    </nav>
  );
}
