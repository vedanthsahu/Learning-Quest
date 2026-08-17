import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { uploadImage } from "../utils/api";

// A small on-demand editor attached to a highlighted block: a text note, and/or a pasted /
// uploaded diagram image. Tabs let you flip between the note and the image without losing
// either -- built for "highlight something, sketch what it means, come back to the picture
// later" style revision rather than long-form writing.
export default function HighlightPanel({ highlight, onSave, onRemove, onClose }) {
  const [note, setNote] = useState(highlight?.note || "");
  const [imagePath, setImagePath] = useState(highlight?.imagePath || null);
  const [tab, setTab] = useState(highlight?.imagePath ? "image" : "note");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const { path } = await uploadImage(file, file.name);
      setImagePath(path);
      setTab("image");
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e) {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
    if (item) {
      e.preventDefault();
      handleFile(item.getAsFile());
    }
  }

  function handleSave() {
    onSave({ ...highlight, note, imagePath });
    onClose();
  }

  return (
    <motion.div
      className="highlight-panel"
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      onClick={(e) => e.stopPropagation()}
      onPaste={handlePaste}
    >
      <div className="highlight-panel-tabs">
        <button className={tab === "note" ? "active" : ""} onClick={() => setTab("note")}>
          📝 Note
        </button>
        <button className={tab === "image" ? "active" : ""} onClick={() => setTab("image")}>
          🖼️ Diagram {imagePath ? "" : "(none)"}
        </button>
        <button className="highlight-panel-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {tab === "note" && (
        <textarea
          className="highlight-note-input"
          placeholder="Jot a note about why this matters, or what to remember…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
        />
      )}

      {tab === "image" && (
        <div className="highlight-image-area">
          {imagePath ? (
            <div className="highlight-image-preview">
              <img src={`/${imagePath}`} alt="Your diagram" />
              <button className="btn-mini" onClick={() => setImagePath(null)}>
                Remove image
              </button>
            </div>
          ) : (
            <div
              className="highlight-image-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files[0]);
              }}
            >
              {uploading ? "Uploading…" : "📎 Click to choose an image, drag one here, or paste (Ctrl+V)"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
          )}
        </div>
      )}

      <div className="highlight-panel-footer">
        <button className="btn-secondary" onClick={onRemove}>
          Remove Highlight
        </button>
        <button className="btn-primary" onClick={handleSave}>
          Save
        </button>
      </div>
    </motion.div>
  );
}
