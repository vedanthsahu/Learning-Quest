"""
Builds the CCDV-F mock exams from the plain-text sources in src/setN.txt.

Outputs (all regenerated on every run, so edit src/ and re-run this, never the outputs):
  sets/setN.js                         -> question data for the timed exam runner (index.html)
  ../mock_exam_setN_paper.md           -> question paper, readable in the Learning Quest Reader
  ../mock_exam_setN_key.md             -> answer key with explanations

Source format (one block per question):
  @@ SLOT | objective      SLOT prefix picks the domain (A, M, W, P, T, S, C, E)
  stem lines...            fenced ``` code blocks allowed
  - wrong option
  + correct option         two or more "+" lines make it a multiple-response item
  > explanation lines

Usage:  python build_mock_exams.py
"""
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "src")
SETS_DIR = os.path.join(HERE, "sets")
CONTENT_DIR = os.path.dirname(HERE)

DOMAINS = {
    "A": "Applications and Integration",
    "M": "Model Selection and Optimization",
    "W": "Agents and Workflows",
    "P": "Prompt and Context Engineering",
    "T": "Tools and MCPs",
    "S": "Security and Safety",
    "C": "Claude Code",
    "E": "Eval, Testing, and Debugging",
}
# Questions per domain in a 53-item paper, following the official CCDV-F weights.
EXPECTED = {"A": 17, "M": 9, "W": 8, "P": 6, "T": 6, "S": 4, "C": 2, "E": 1}
TOTAL = sum(EXPECTED.values())
LETTERS = "ABCDEFGH"
PASS_PCT = 72
MAX_LENGTH_GIVEAWAY = 0.35
MINUTES = 120


def parse(path):
    questions, cur, in_code = [], None, False
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    for raw in lines:
        line = raw.rstrip()
        if line.startswith("#") and cur is None:
            continue
        if line.startswith("@@ "):
            slot, _, objective = line[3:].partition("|")
            cur = {"slot": slot.strip(), "objective": objective.strip(), "stem": [], "options": [], "explain": []}
            questions.append(cur)
            in_code = False
            continue
        if cur is None:
            continue
        if line.startswith("```"):
            in_code = not in_code
            cur["stem"].append(line)
            continue
        if in_code:
            cur["stem"].append(line)
        elif line.startswith("+ ") or line.startswith("- "):
            cur["options"].append({"text": line[2:].strip(), "correct": line.startswith("+")})
        elif line.startswith(">"):
            cur["explain"].append(line[1:].strip())
        elif line.strip() and not cur["options"]:
            cur["stem"].append(line)
        elif line.strip():
            raise ValueError(f"{path}: stray line after options in {cur['slot']}: {line!r}")
    return questions


def validate(set_no, questions):
    errors = []
    slots = [q["slot"] for q in questions]
    dupes = {s for s in slots if slots.count(s) > 1}
    if dupes:
        errors.append(f"duplicate slots {sorted(dupes)}")
    counts = {k: 0 for k in DOMAINS}
    for q in questions:
        prefix = q["slot"][0]
        if prefix not in DOMAINS:
            errors.append(f"{q['slot']}: unknown domain prefix")
            continue
        counts[prefix] += 1
        n_correct = sum(o["correct"] for o in q["options"])
        if not q["stem"] or not q["explain"]:
            errors.append(f"{q['slot']}: missing stem or explanation")
        if n_correct == 0:
            errors.append(f"{q['slot']}: no correct option")
        if n_correct == 1 and len(q["options"]) != 4:
            errors.append(f"{q['slot']}: single-answer item needs 4 options, has {len(q['options'])}")
        if n_correct > 1:
            words = {2: "TWO", 3: "THREE"}
            marker = f"(Choose {words.get(n_correct, n_correct)}.)"
            if marker not in " ".join(q["stem"]):
                errors.append(f"{q['slot']}: {n_correct} correct options but stem lacks '{marker}'")
    for k, want in EXPECTED.items():
        if counts[k] != want:
            errors.append(f"domain {k} ({DOMAINS[k]}): {counts[k]} questions, expected {want}")
    if len(questions) != TOTAL:
        errors.append(f"{len(questions)} questions, expected {TOTAL}")
    # Neither "pick the longest" nor "pick the shortest" may be a winning strategy (chance is 25%).
    singles = [q for q in questions if sum(o["correct"] for o in q["options"]) == 1]
    for label, pick in (("longest", max), ("shortest", min)):
        hits = [q["slot"] for q in singles if pick(q["options"], key=lambda o: len(o["text"]))["correct"]]
        if len(hits) > MAX_LENGTH_GIVEAWAY * len(singles):
            errors.append(f"correct option is the {label} in {len(hits)}/{len(singles)} items: {hits}")
    for q in questions:
        opts = sorted(q["options"], key=lambda o: len(o["text"]), reverse=True)
        n_correct = sum(o["correct"] for o in opts)
        if n_correct > 1 and all(o["correct"] for o in opts[:n_correct]):
            errors.append(f"{q['slot']}: multiple-response correct options are exactly the longest ones")
    if errors:
        raise SystemExit(f"Set {set_no} failed validation:\n  " + "\n  ".join(errors))


def build_set(set_no, questions):
    """Fixed, seeded shuffle so the paper, the key and the runner always agree on numbering."""
    rng = random.Random(9000 + set_no)
    order = questions[:]
    rng.shuffle(order)
    # Balance where the correct option lands (A-D) so answer-letter patterns give nothing away.
    singles = sum(1 for q in order if sum(o["correct"] for o in q["options"]) == 1)
    targets = [i % 4 for i in range(singles)]
    rng.shuffle(targets)
    built = []
    for q in order:
        opts = q["options"][:]
        rng.shuffle(opts)
        if sum(o["correct"] for o in opts) == 1:
            right = next(o for o in opts if o["correct"])
            wrong = [o for o in opts if not o["correct"]]
            opts = wrong[:]
            opts.insert(targets.pop(), right)
        built.append({
            "slot": q["slot"],
            "domain": DOMAINS[q["slot"][0]],
            "objective": q["objective"],
            "stem": "\n".join(q["stem"]),
            "options": [o["text"] for o in opts],
            "correct": [i for i, o in enumerate(opts) if o["correct"]],
            "explain": " ".join(q["explain"]),
        })
    return built


def letters(idx):
    return ", ".join(LETTERS[i] for i in idx)


def write_js(set_no, built):
    os.makedirs(SETS_DIR, exist_ok=True)
    payload = {"set": set_no, "minutes": MINUTES, "passPct": PASS_PCT, "questions": built}
    with open(os.path.join(SETS_DIR, f"set{set_no}.js"), "w", encoding="utf-8") as f:
        f.write("// Generated by build_mock_exams.py from src/set%d.txt. Do not edit by hand.\n" % set_no)
        f.write("window.CCDVF_SETS = window.CCDVF_SETS || {};\n")
        f.write(f"window.CCDVF_SETS[{set_no}] = ")
        json.dump(payload, f, ensure_ascii=False, indent=1)
        f.write(";\n")


def runner_link(set_no):
    return f"/content/ccdvf/mock-exams/index.html?set={set_no}"


def write_paper(set_no, built):
    multi = sum(1 for q in built if len(q["correct"]) > 1)
    out = [
        f"## Mock Exam Set {set_no}: Question Paper",
        "",
        f"**{TOTAL} questions · {MINUTES} minutes · pass target {PASS_PCT}%** "
        f"({multi} are multiple-response; they say how many to choose and are scored all-or-nothing).",
        "",
        f"**[Take Set {set_no} in timed exam mode]({runner_link(set_no)})** (opens the exam runner in a new tab, "
        "with a timer, flagging, scoring and a per-domain breakdown).",
        "",
        "To work from this page instead: write your answers down, then check them against the matching "
        f"*Set {set_no}: Answer Key* chapter. This is an unofficial practice paper written to the published "
        "CCDV-F blueprint, not real exam content.",
        "",
        "---",
        "",
    ]
    for n, q in enumerate(built, 1):
        out.append(f"### Question {n}")
        out.append("")
        out.append(q["stem"])
        out.append("")
        for i, opt in enumerate(q["options"]):
            out.append(f"- **{LETTERS[i]}.** {opt}")
        out.append("")
    with open(os.path.join(CONTENT_DIR, f"mock_exam_set{set_no}_paper.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(out))


def write_key(set_no, built):
    out = [
        f"## Mock Exam Set {set_no}: Answer Key and Explanations",
        "",
        "### Quick key",
        "",
        "| Q | Answer | Q | Answer | Q | Answer | Q | Answer |",
        "|---|---|---|---|---|---|---|---|",
    ]
    cells = [(n, letters(q["correct"])) for n, q in enumerate(built, 1)]
    for r in range(0, len(cells), 4):
        row = cells[r:r + 4] + [("", "")] * (4 - len(cells[r:r + 4]))
        out.append("| " + " | ".join(f"{a} | {b}" for a, b in row) + " |")
    out += ["", "### Score yourself by domain", "",
            "| Domain | Questions | Count |", "|---|---|---|"]
    for k, name in DOMAINS.items():
        nums = [str(n) for n, q in enumerate(built, 1) if q["slot"][0] == k]
        out.append(f"| {name} | {', '.join(nums)} | {len(nums)} |")
    out += ["", f"Pass target used throughout: **{PASS_PCT}%** ({round(TOTAL * PASS_PCT / 100)} of {TOTAL}). "
            "The real exam reports a scaled score (pass = 720/1000), and its raw-to-scaled mapping isn't public, "
            "so aim for 80%+ here to leave a margin.", "", "---", ""]
    for n, q in enumerate(built, 1):
        out.append(f"### Q{n}. Answer: {letters(q['correct'])}")
        out.append("")
        out.append(f"*{q['domain']} · {q['objective']}*")
        out.append("")
        out.append(q["stem"])
        out.append("")
        for i, opt in enumerate(q["options"]):
            mark = " ✅" if i in q["correct"] else ""
            out.append(f"- **{LETTERS[i]}.** {opt}{mark}")
        out.append("")
        out.append(f"**Why:** {q['explain']}")
        out.append("")
    with open(os.path.join(CONTENT_DIR, f"mock_exam_set{set_no}_key.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(out))


def main():
    sources = sorted(f for f in os.listdir(SRC_DIR) if re.fullmatch(r"set\d+\.txt", f))
    if not sources:
        sys.exit("no src/setN.txt files found")
    for name in sources:
        set_no = int(re.search(r"\d+", name).group())
        questions = parse(os.path.join(SRC_DIR, name))
        validate(set_no, questions)
        built = build_set(set_no, questions)
        write_js(set_no, built)
        write_paper(set_no, built)
        write_key(set_no, built)
        dist = {}
        for q in built:
            for c in q["correct"]:
                dist[LETTERS[c]] = dist.get(LETTERS[c], 0) + 1
        print(f"Set {set_no}: {len(built)} questions OK, answer-letter spread {dict(sorted(dist.items()))}")


if __name__ == "__main__":
    main()
