"""
Adds "PART 5 -- Mock Exams" (guide + 5 question papers + 5 answer keys) to the CCDV-F book in
Learning Quest's data.json.

Merge-forward and idempotent: never rewrites existing parts or topics, only appends what is
missing (matched by contentFile), so reading progress, notes and highlights are preserved.
Backs up data.json to backups/manual_pre_ccdvf_mocks_<stamp>.json first.

Stop the Learning Quest server (and close the app's browser tab) before running this. The app
saves its whole in-memory copy of data.json, so a stale open tab could overwrite the new part.

Usage:  python add_to_learning_quest.py
"""
import json
import os
import shutil
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
DATA_FILE = os.path.join(ROOT, "data.json")
BACKUP_DIR = os.path.join(ROOT, "backups")
BOOK_ID = "ccdvf"
PART_NAME = "PART 5 -- Mock Exams (5 Practice Sets)"
SETS = 5


def topic(num, title, content_file, minutes):
    return {
        "num": num, "title": title, "status": "not_started", "notes": "", "dateCompleted": None,
        "contentFile": content_file, "estMinutes": minutes, "scrollPct": 0, "activeSeconds": 0, "highlights": [],
    }


def wanted_topics():
    topics = [topic("M0", "Mock Exams: How to Use the Five Practice Sets", "content/ccdvf/mock_exams_guide.md", 4)]
    for n in range(1, SETS + 1):
        exam = topic(f"M{n}", f"Mock Exam Set {n}: Timed Exam", f"content/ccdvf/mock_exam_set{n}_paper.md", 120)
        # The Reader shows this interactive page instead of the markdown paper.
        exam["embedUrl"] = f"content/ccdvf/mock-exams/index.html?set={n}"
        topics.append(exam)
        topics.append(topic(f"M{n}K", f"Mock Exam Set {n}: Answer Key and Explanations", f"content/ccdvf/mock_exam_set{n}_key.md", 35))
    return topics


def upgrade_existing(book):
    """Give already-ingested paper topics the interactive exam (embedUrl + title) without
    touching their status, notes, highlights or reading time."""
    wanted = {t["contentFile"]: t for t in wanted_topics() if "embedUrl" in t}
    changed = 0
    for part in book["parts"]:
        for t in part["topics"]:
            w = wanted.get(t["contentFile"])
            if w and (t.get("embedUrl") != w["embedUrl"] or t["title"] != w["title"]):
                t["embedUrl"], t["title"] = w["embedUrl"], w["title"]
                changed += 1
    return changed


def main():
    for t in wanted_topics():
        path = os.path.join(ROOT, t["contentFile"])
        if not os.path.isfile(path):
            raise SystemExit(f"missing {t['contentFile']}; run build_mock_exams.py first")

    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)
    book = next((b for b in data["books"] if b["id"] == BOOK_ID), None)
    if book is None:
        raise SystemExit(f"book '{BOOK_ID}' not found in data.json")

    part = next((p for p in book["parts"] if p["name"] == PART_NAME), None)
    existing = {t["contentFile"] for p in book["parts"] for t in p["topics"]}
    missing = [t for t in wanted_topics() if t["contentFile"] not in existing]

    os.makedirs(BACKUP_DIR, exist_ok=True)
    backup = os.path.join(BACKUP_DIR, f"manual_pre_ccdvf_mocks_{time.strftime('%Y%m%d_%H%M%S')}.json")
    shutil.copyfile(DATA_FILE, backup)

    upgraded = upgrade_existing(book)
    if not missing and not upgraded:
        os.remove(backup)
        print("Nothing to change; the mock exam part is already up to date.")
        return

    if missing and part is None:
        part = {"name": PART_NAME, "topics": []}
        book["parts"].append(part)
    if missing:
        part["topics"].extend(missing)

    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DATA_FILE)
    print(f"Added {len(missing)} topic(s), upgraded {upgraded} to the interactive exam. "
          f"Backup: {os.path.relpath(backup, ROOT)}")


if __name__ == "__main__":
    main()
