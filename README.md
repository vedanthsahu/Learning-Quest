# Learning Quest

A self-contained, gamified reader + progress tracker for the Software Systems Handbook,
AI Systems Handbook, Python Backend Handbook, and the Engineering Challenge Series — the
actual chapter content lives inside this folder, so reading and tracking are the same action.

## Running it

Double-click **`run.bat`** (or run `python server.py` from this folder). Your browser opens
automatically to `http://localhost:8642`. Close the console window (or press Ctrl+C in it) to
stop the server.

Requires only **Python 3** — nothing else to install. If double-clicking does nothing, install
Python from [python.org/downloads](https://python.org/downloads) once, then try again.

## Moving to another PC

Copy this **entire `LearningQuest` folder** (USB drive, cloud sync, wherever) to the other
machine and run `run.bat` there. Everything — the app, every chapter's content, and your
progress — travels together in this one folder. There is nothing to install or configure.

## Where your progress lives

**`data.json`** is your save file — a plain, human-readable JSON file. Every checkbox, note,
highlight, reading-time log, streak, and unlocked achievement is in there. You can open it in
any text editor if you're ever curious, though there's no need to touch it by hand.

Every time you save, the server keeps a timestamped backup in **`backups/`** (the last 20 are
kept automatically) — so an accidental bad edit or a corrupted save is always recoverable.

## Folder contents

- `server.py` — the local server (Python standard library only, no installs needed to run it)
- `data.json` — your save file
- `backups/` — automatic rotating backups of `data.json`
- `content/` — the actual chapter markdown for all three handbooks and the challenge series
- `dist/` — the built app (HTML/CSS/JS) — generated, don't hand-edit
- `app-src/` — the React source code, if you ever want to change how the app looks or behaves
- `run.bat` — double-click to start

## Changing the app itself (optional)

The app is a normal Vite + React project in `app-src/`. If you want to tweak it:

```
cd app-src
npm install
npm run build
```

`npm run build` writes straight into `../dist`, which is what `server.py` serves — no other
wiring needed. You only need Node.js installed for this step; running the finished app never
requires it.

## If something looks broken

Your data is never at risk of being silently lost — worst case, restore the newest file from
`backups/` by copying it over `data.json` (the server is not running while you do this).
