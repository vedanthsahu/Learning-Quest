"""
Generates data.seed.json from the real data.json: strips every personal/progress
field (status, notes, highlights, scroll position, active-seconds, dateCompleted,
achievements, streaks, quiz results) down to a fresh/empty default, keeping only
catalog structure (book/part/topic names, content file paths, est. minutes, colors).

This is the file committed to git and shipped in the static (GitHub Pages) build --
it must never contain real progress/notes. Re-run this after adding or editing books
so the public seed's catalog (titles, chapter counts, file paths) stays in sync.

Usage: python scripts/make_seed.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data.json")
DEST = os.path.join(ROOT, "data.seed.json")

RESET_RULES = [
    (lambda k: "status" in k.lower(), "not_started"),
    (lambda k: "scrollpct" in k.lower(), 0),
    (lambda k: "activeseconds" in k.lower(), 0),
    (lambda k: "highlights" in k.lower(), []),
    (lambda k: k == "notes", ""),
    (lambda k: k == "dateCompleted", None),
]


def strip_record(record: dict) -> dict:
    out = {}
    for key, value in record.items():
        reset = False
        for matches, fresh_value in RESET_RULES:
            if matches(key):
                out[key] = fresh_value
                reset = True
                break
        if not reset:
            out[key] = value
    return out


def main():
    with open(SRC, "r", encoding="utf-8") as f:
        data = json.load(f)

    seed = {
        "meta": {
            "createdAt": None,
            "lastActiveDate": None,
            "streak": 0,
            "longestStreak": 0,
            "totalActiveSeconds": 0,
            "dailyLog": {},
        },
        "quizResults": {},
        "xpRules": data["xpRules"],
        "levels": data["levels"],
        "achievementState": {},
        "books": [],
    }

    for book in data["books"]:
        new_book = {k: v for k, v in book.items() if k != "parts"}
        new_book["parts"] = []
        for part in book["parts"]:
            new_part = {k: v for k, v in part.items() if k != "topics"}
            new_part["topics"] = [strip_record(t) for t in part["topics"]]
            new_book["parts"].append(new_part)
        seed["books"].append(new_book)

    if "challengeSeries" in data:
        cs = {k: v for k, v in data["challengeSeries"].items() if k != "projects"}
        cs["projects"] = [strip_record(p) for p in data["challengeSeries"]["projects"]]
        seed["challengeSeries"] = cs

    with open(DEST, "w", encoding="utf-8") as f:
        json.dump(seed, f, indent=2, ensure_ascii=False)

    print(f"Wrote {DEST}")


if __name__ == "__main__":
    main()
