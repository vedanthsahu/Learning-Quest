"""
Builds the shareable CCDV-F study kit: the handbook chapters + the 5 mock exams + answer keys
as a standalone folder that works by double-clicking index.html (no server, no Python).
Nothing personal goes in: no data.json, notes, highlights, progress or other books.

Source of truth stays here in Learning Quest; re-run this after editing chapters or questions
(run build_mock_exams.py first if the questions changed).

Usage:  python build_share_kit.py ["<output folder>"]     default: C:/Vedanth_Space/share test
"""
import json
import os
import re
import shutil
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
CCDVF = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(CCDVF))
TEMPLATE = os.path.join(HERE, "share_kit")
OUT = sys.argv[1] if len(sys.argv) > 1 else r"C:\Vedanth_Space\share test"
MARKER = ".ccdvf-share-kit"  # only folders carrying this marker are ever wiped and rebuilt
SETS = 5

# Lines written for the handbook's owner (their own earlier mock scores and misses) are
# reworded neutrally for a reader who didn't take those mocks. Everything else is verbatim.
NEUTRALIZE = {
    "front_matter.md": [
        ("that cost you marks on the mocks (81.1% and 75.5% before study).", "that cost marks on the exam."),
        ("Tier 1 (Parts 1–2) is where your misses were:", "Tier 1 (Parts 1–2) is where most marks are lost:"),
        ("Tier 2 (Part 3) is mostly your existing backend knowledge expressed in Claude terms.",
         "Tier 2 (Part 3) is mostly general backend knowledge expressed in Claude terms."),
    ],
    "ch09_claude_code.md": [("(your mock weakness)", "(a common weak spot)")],
    "ch15_deployment_patterns.md": [("Your Q52 miss lives here.", "A frequently missed exam topic lives here.")],
}

KIT_GUIDE_WAYS = """### Two ways to take a set

1. **Exam conditions (recommended).** Open *Mock Exam Set N* from the menu or the home page. You select answers, flag questions to revisit, move freely, and when you end the exam a review screen shows anything unanswered or flagged. Then you get a score report: an estimated scaled score out of 1000 (720 to pass), PASS/FAIL, and a performance rating for each domain, followed by every question with its explanation. Progress autosaves, so you can close the page and resume.
2. **On paper.** Open *Set N: Question Paper (printable)*, note your answers, then mark them with the matching *Answer Key* chapter, which has a quick key, a per-domain score sheet and an explanation for every question.

The exam page also has a **practice mode** with no timer and instant feedback per question. Use it for a second pass, not for your first attempt at a set.

"""


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def replace_once(text, old, new, where):
    if text.count(old) != 1:
        raise SystemExit(f"{where}: expected exactly one occurrence of {old!r}")
    return text.replace(old, new)


def chapter_md(rel):
    text = read(rel)
    for old, new in NEUTRALIZE.get(os.path.basename(rel), []):
        text = replace_once(text, old, new, rel)
    return text


def kit_guide():
    text = read("content/ccdvf/mock_exams_guide.md")
    text, n = re.subn(r"### Two ways to take a set\n.*?(?=### Suggested plan)", KIT_GUIDE_WAYS, text, flags=re.S)
    if n != 1:
        raise SystemExit("guide: 'Two ways to take a set' section not found")
    text = re.sub(r"\n### Regenerating the sets\n.*\Z", "\n", text, flags=re.S)
    return text


def kit_paper(n):
    text = read(f"content/ccdvf/mock_exam_set{n}_paper.md")
    text = replace_once(text, f"(/content/ccdvf/mock-exams/index.html?set={n})", f"(exam.html?set={n}&home=index.html)", "paper")
    text = replace_once(text, "(opens the exam runner in a new tab, with", "(opens the exam page, with", "paper")
    return text


def build_data():
    data = json.load(open(os.path.join(ROOT, "data.json"), encoding="utf-8"))
    book = next(b for b in data["books"] if b["id"] == "ccdvf")
    parts = []
    for part in book["parts"]:
        if "Mock Exams" in part["name"]:
            continue
        items = []
        for t in part["topics"]:
            cid = os.path.splitext(os.path.basename(t["contentFile"]))[0]
            items.append({"id": cid, "num": t["num"], "title": t["title"], "kind": "chapter", "md": chapter_md(t["contentFile"])})
        parts.append({"name": part["name"].replace(" -- ", " · "), "items": items})

    mock = [{"id": "mock_exams_guide", "num": "M0", "title": "Mock Exams: How to Use the Five Practice Sets", "kind": "chapter", "md": kit_guide()}]
    for n in range(1, SETS + 1):
        mock.append({"id": f"exam{n}", "num": f"M{n}", "title": f"Mock Exam Set {n}", "kind": "exam", "set": n})
        mock.append({"id": f"mock_exam_set{n}_paper", "num": f"M{n}P", "title": f"Set {n}: Question Paper (printable)", "kind": "chapter", "md": kit_paper(n)})
        mock.append({"id": f"mock_exam_set{n}_key", "num": f"M{n}K", "title": f"Set {n}: Answer Key and Explanations", "kind": "chapter",
                     "md": read(f"content/ccdvf/mock_exam_set{n}_key.md")})
    parts.append({"name": "PART 5 · Mock Exams (5 Practice Sets)", "items": mock})
    return {"title": "CCDV-F Study Kit", "subtitle": "Claude Certified Developer – Foundations · handbook + 5 mock exams", "parts": parts}


def main():
    if os.path.exists(OUT):
        if not os.path.exists(os.path.join(OUT, MARKER)):
            raise SystemExit(f"{OUT} exists and wasn't created by this script; refusing to overwrite it")
        shutil.rmtree(OUT)
    shutil.copytree(TEMPLATE, OUT)
    open(os.path.join(OUT, MARKER), "w").close()

    shutil.copyfile(os.path.join(HERE, "index.html"), os.path.join(OUT, "exam.html"))
    shutil.copytree(os.path.join(HERE, "sets"), os.path.join(OUT, "sets"))

    kit = build_data()
    os.makedirs(os.path.join(OUT, "data"), exist_ok=True)
    with open(os.path.join(OUT, "data", "handbook.js"), "w", encoding="utf-8") as f:
        f.write("// Generated by build_share_kit.py. Handbook, guide, papers and answer keys.\nwindow.KIT = ")
        json.dump(kit, f, ensure_ascii=False)
        f.write(";\n")

    zip_path = OUT.rstrip("\\/") + ".zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for folder, _, files in os.walk(OUT):
            for name in files:
                if name == MARKER:
                    continue
                full = os.path.join(folder, name)
                z.write(full, os.path.join(os.path.basename(OUT.rstrip("\\/")), os.path.relpath(full, OUT)))

    chapters = sum(1 for p in kit["parts"] for i in p["items"] if i["kind"] == "chapter")
    print(f"Built {OUT}: {chapters} readable chapters, {SETS} exams. Zip: {zip_path} ({os.path.getsize(zip_path) // 1024} KB)")


if __name__ == "__main__":
    main()
