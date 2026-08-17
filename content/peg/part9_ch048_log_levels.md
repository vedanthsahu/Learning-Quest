## §48. Log Levels: What Actually Belongs in DEBUG/INFO/WARN/ERROR

### 1. The Vocabulary

- **DEBUG** — fine-grained detail useful only while actively developing/troubleshooting; usually
  off in production.
- **INFO** — normal, expected events worth recording as a matter of course ("user created,"
  "job completed").
- **WARN** — something unexpected happened but the system recovered or continued fine — worth a
  human's eventual attention, not an emergency.
- **ERROR** — something failed and needs attention; if these page someone, they should mean it.
- **Log level threshold** — the minimum level actually written/shipped in a given environment
  (often DEBUG in local dev, INFO or WARN in production).

### 2. Where It Sits, and Why Teams Use It

Log levels exist so that the *volume* and *urgency* of logging can be tuned per environment
without changing code, and so that alerting/monitoring tools can key off severity rather than
parsing every log line's content to guess how bad something is.

### 3. What Actually Breaks

- **Everything logged as ERROR "to be safe"** — if routine, recoverable situations are logged as
  ERROR, the signal-to-noise ratio collapses; real errors get lost in a sea of false alarms, and
  people start ignoring the error log entirely (alert fatigue, see §53).
- **Genuine errors logged as INFO or WARN** — the opposite problem: a real failure gets buried at
  a level nobody's actually watching or alerting on.
- **DEBUG-level logging left on in production** — massive log volume and cost, and potentially
  sensitive data (full request/response bodies) ending up somewhere it shouldn't.
- **No consistent team convention** — one engineer's WARN is another's ERROR, and dashboards/
  alerts built on log level lose their meaning if the levels themselves aren't used consistently
  across the codebase.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "ERROR means something actually failed and needs attention — if I'm not sure something rises to
  that level, it's probably WARN or INFO instead."
- "I don't run DEBUG-level logging in production by default, both for volume/cost and because it
  can capture more detail than should be persisted."
- "Log level should be meaningful enough that alerting can key off it directly, without a human
  having to read every line to judge severity."

### 5. Interview-Ready Answer

> "I treat log level as a real signal, not decoration — ERROR specifically means 'this needs
> attention,' WARN means 'unexpected but recovered,' INFO is normal expected activity, and DEBUG
> is development-time detail that's usually off in production. The discipline that matters is
> using them consistently across a codebase, because the moment ERROR gets used for routine
> situations, alerting built on top of it stops meaning anything and real errors start getting
> ignored along with the noise."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §64 (Structured Logging & Log Design) chapter.

---
