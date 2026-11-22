## Mock Exams: How to Use the Five Practice Sets

### What these are

Five full-length practice papers for **Claude Certified Developer – Foundations (CCDV-F)**. Each set mirrors the real exam's shape: **53 questions, 120 minutes**, scenario-based, a mix of single-answer and multiple-response items, with questions spread across the eight domains in the official weightings.

They're **unofficial**. Nobody outside Anthropic has the real question bank. These were written from the published blueprint and checked against the facts in this handbook, so treat them as a rehearsal of the *kind* of thinking the exam tests, not as a preview of its questions.

### The blueprint every set follows

| Domain | Official weight | Questions per set |
|---|---|---|
| Applications and Integration | 33.1% | 17 |
| Model Selection and Optimization | 16.8% | 9 |
| Agents and Workflows | 14.7% | 8 |
| Prompt and Context Engineering | 11.0% | 6 |
| Tools and MCPs | 10.6% | 6 |
| Security and Safety | 8.1% | 4 |
| Claude Code | 3.1% | 2 |
| Eval, Testing, and Debugging | 2.6% | 1 |

**The sets are conceptually parallel.** Question slot "A5" (for example, `stop_reason` handling) tests the same concept in every set with a different scenario. If you miss a concept in Set 1, you'll meet it again in Sets 2–5, and getting it right *in a new disguise* is the real proof you've learned it.

### Two ways to take a set

1. **Exam conditions (recommended).** Open *Mock Exam Set N: Timed Exam* in this part, and the exam opens right here in the reading window. You select answers, flag questions to revisit, move freely, and when you end the exam a review screen shows anything unanswered or flagged. Then you get a score report: an estimated scaled score out of 1000 (720 to pass), PASS/FAIL, and a performance rating for each domain, followed by every question with its explanation. Progress autosaves, so you can close the reader and resume. Finishing marks the chapter complete.
2. **On paper.** The printable question paper is at `/content/ccdvf/mock_exam_setN_paper.md` (replace N with the set number). Note your answers, then mark them with the matching *Answer Key* chapter, which has a quick key, a per-domain score sheet and an explanation for every question.

The exam also has a **practice mode** with no timer and instant feedback per question. Use it for a second pass, not for your first attempt at a set.

### Suggested plan

| When | Do |
|---|---|
| Now | Set 1, timed. Don't look anything up. |
| Same day | Review every miss. For each one, find the handbook chapter behind it and re-read its *Common Exam Traps*. |
| +1–2 days | Set 2, timed. Compare your domain breakdown against Set 1. |
| Repeat | Sets 3, 4 and 5 the same way, spaced out. Save Set 5 for the last few days before the exam. |
| Final days | Practice-mode re-runs of your weakest domains, then Chapter 17's revision sheet. |

### Scoring

- Multiple-response items say how many to choose and are scored **all-or-nothing**, as they usually are on certification exams.
- Unanswered questions count as wrong and there's no extra penalty for guessing, so answer everything.
- The real exam reports a scaled score from 100 to 1000 with **720 to pass**, but Anthropic doesn't publish the raw-to-scaled conversion. The score report here estimates it with a linear mapping anchored so that 72% raw = 720. Treat it as a guide and aim for **80%+ raw** (800+ scaled on this estimate) so you have a margin.

### Exam technique these papers reward

- Read the **requirement sentence** twice: latency, cost, "must never", "data can't leave". The right answer serves that requirement; the distractors solve a different problem.
- Prefer the **simplest fix that works**. If an option adds agents, models or infrastructure the scenario doesn't need, it's probably wrong.
- Eliminate options where **the model executes tools, enforces security or authorizes users**. In every architecture, your code (or the MCP server, or the harness) does that.
- **Prompt instructions are advisory; hooks, permissions and code are enforcement.** When the stem says "guarantee", look for enforcement.
- Option length is not a clue. The sets are deliberately balanced so the longest and shortest options are no more likely to be correct than chance.

### Regenerating the sets

The questions live as plain text in `content/ccdvf/mock-exams/src/set1.txt` … `set5.txt`. After editing them, run `python build_mock_exams.py` in that folder. It validates the blueprint counts and the answer-balance checks, then regenerates the runner data and these chapters.
