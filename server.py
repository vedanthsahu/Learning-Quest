"""
LearningQuest local server -- pure Python standard library, no installs required to run.

Serves:
  - the built React app from ./dist
  - the actual chapter markdown from ./content (so the app reads the real handbooks)
  - a tiny JSON API (GET/POST /api/data) backed by ./data.json -- your entire save file,
    a plain, human-readable JSON file you can open, edit, or back up by hand.

Usage:
    python server.py
Then open http://localhost:8642 (a browser tab opens automatically).

Copy this whole LearningQuest folder to any other PC and run the same command --
everything (app, content, and your progress) travels together.
"""
import base64
import http.server
import json
import os
import re
import shutil
import socketserver
import sys
import threading
import time
import uuid
import webbrowser

PORT = 8642
ROOT = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT, "dist")
DATA_FILE = os.path.join(ROOT, "data.json")
BACKUP_DIR = os.path.join(ROOT, "backups")
UPLOADS_DIR = os.path.join(ROOT, "uploads")
MAX_BACKUPS = 20
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB, generous for a hand-drawn diagram screenshot

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


def guess_type(path):
    _, ext = os.path.splitext(path)
    return MIME_TYPES.get(ext, "application/octet-stream")


def backup_data_file():
    if not os.path.exists(DATA_FILE):
        return
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = time.strftime("%Y%m%d_%H%M%S")
    dest = os.path.join(BACKUP_DIR, f"data_{stamp}.json")
    try:
        shutil.copyfile(DATA_FILE, dest)
    except OSError:
        return
    backups = sorted(
        (f for f in os.listdir(BACKUP_DIR) if f.startswith("data_") and f.endswith(".json"))
    )
    while len(backups) > MAX_BACKUPS:
        os.remove(os.path.join(BACKUP_DIR, backups.pop(0)))


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # keep the console clean; errors still surface via do_* exceptions

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path):
        if not os.path.isfile(path):
            self.send_error(404, "Not found")
            return
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", guess_type(path))
        self.send_header("Content-Length", str(len(body)))
        if path.endswith(".md"):
            self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/data":
            if not os.path.exists(DATA_FILE):
                self._send_json(404, {"error": "data.json not found"})
                return
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                self._send_json(200, json.load(f))
            return

        # static assets: dist/ for the app shell, content/ for chapter markdown
        rel = self.path.lstrip("/").split("?")[0]
        if rel == "" or rel == "index.html":
            self._send_file(os.path.join(DIST_DIR, "index.html"))
            return
        if rel.startswith("content/") or rel.startswith("uploads/"):
            self._send_file(os.path.join(ROOT, rel))
            return
        if rel.startswith("assets/"):
            self._send_file(os.path.join(DIST_DIR, rel))
            return

        # client-side routing fallback (no real router in use today, but harmless to keep)
        candidate = os.path.join(DIST_DIR, rel)
        if os.path.isfile(candidate):
            self._send_file(candidate)
        else:
            self._send_file(os.path.join(DIST_DIR, "index.html"))

    def do_POST(self):
        if self.path == "/api/data":
            self._handle_save_data()
        elif self.path == "/api/upload":
            self._handle_upload()
        else:
            self.send_error(404, "Not found")

    def _handle_save_data(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "invalid JSON"})
            return

        backup_data_file()
        tmp_path = DATA_FILE + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, DATA_FILE)  # atomic on both Windows and POSIX
        self._send_json(200, {"ok": True})

    def _handle_upload(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_UPLOAD_BYTES * 2:  # base64 inflates size ~33%; leave headroom
            self._send_json(413, {"error": "image too large"})
            return
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw)
            data_url = payload["dataUrl"]
        except (json.JSONDecodeError, KeyError):
            self._send_json(400, {"error": "invalid upload payload"})
            return

        match = re.match(r"^data:image/(\w+);base64,(.+)$", data_url, re.DOTALL)
        if not match:
            self._send_json(400, {"error": "expected a base64 image data URL"})
            return
        ext = match.group(1).lower().replace("jpeg", "jpg")
        if ext not in ("png", "jpg", "gif", "webp"):
            ext = "png"
        try:
            image_bytes = base64.b64decode(match.group(2))
        except (base64.binascii.Error, ValueError):
            self._send_json(400, {"error": "could not decode image data"})
            return
        if len(image_bytes) > MAX_UPLOAD_BYTES:
            self._send_json(413, {"error": "image too large"})
            return

        os.makedirs(UPLOADS_DIR, exist_ok=True)
        filename = f"{uuid.uuid4().hex}.{ext}"
        with open(os.path.join(UPLOADS_DIR, filename), "wb") as f:
            f.write(image_bytes)
        self._send_json(200, {"path": f"uploads/{filename}"})


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


def main():
    if not os.path.exists(DATA_FILE):
        print(f"ERROR: {DATA_FILE} not found. Nothing to serve.")
        sys.exit(1)
    if not os.path.isdir(DIST_DIR):
        print(f"ERROR: {DIST_DIR} not found. Build the app first (see app-src/README).")
        sys.exit(1)

    server = ThreadingServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}"
    print(f"Learning Quest is running at {url}")
    print("Press Ctrl+C to stop.")
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Learning Quest. See you next session!")
        server.shutdown()


if __name__ == "__main__":
    main()
