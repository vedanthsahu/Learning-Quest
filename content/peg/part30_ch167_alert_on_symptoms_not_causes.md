## §167. Alert on Symptoms, Not Causes

### 1. The Vocabulary

- **Symptom-based alerting** — paging on user-visible impact (elevated error rate, high latency,
  a failed critical business transaction) — the thing that's actually, definitionally worth waking
  someone up for.
- **Cause-based alerting** — paging on an internal signal (CPU above X%, a specific log line
  appearing) that *might* indicate a problem but doesn't confirm actual user impact on its own.
- **Alert fatigue** — the well-documented effect where too many low-value alerts train responders
  to ignore or delay-triage alerts in general, including the real ones — the direct, predictable
  consequence of over-alerting on causes.
- **Actionable alert** — an alert that implies a specific next step the recipient can actually take;
  an alert with no clear action is a strong candidate for becoming a dashboard panel instead of a
  page.

### 2. Where It Sits, and Why Teams Use It

This principle exists because cause-based alerting scales badly: a system has hundreds of internal
signals that could theoretically precede a problem, but only a handful of user-visible symptoms
that actually matter. Alerting broadly on causes ("CPU above 80%") produces frequent
false-positive-feeling pages (the CPU spiked briefly and nothing bad happened), which trains
responders to distrust and deprioritize pages — precisely when a real, symptom-based page later
needs immediate trust and attention.

### 3. What Actually Breaks

- **Paging on every resource threshold crossed** — a CPU or memory threshold alert that fires
  during normal, harmless traffic spikes trains the on-call rotation to snooze or ignore pages,
  which is dangerous the one time the threshold breach actually does correlate with real impact.
- **No SLO-based alerting at all** — without a defined SLO (§53) and error-budget-based alerting,
  it's unclear what "bad enough to page" even means, and alert thresholds end up arbitrary and
  inconsistent across services.
- **Alerts with no clear owner or next step** — a page that lands on someone who has no idea what
  to check or do about it wastes response time exactly when it matters most, and erodes trust in
  the alerting system generally.
- **Using cause-based signals for dashboards, not pages** — the fix isn't to stop tracking cause-
  level metrics; it's routing them to dashboards for investigation, not the pager, reserving pages
  for confirmed or near-certain user impact.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I page on symptoms — user-visible error rate, latency, failed critical transactions — and use
  cause-level metrics like CPU or queue depth for dashboards and investigation, not pages."
- "I know alert fatigue is a real, predictable consequence of over-alerting, and that it degrades
  the value of every alert, including the ones that matter."
- "Before adding an alert, I check that it implies a specific, actionable next step for whoever
  gets paged."

### 5. Interview-Ready Answer

> "I try to page only on symptoms that represent actual or near-certain user impact — elevated
> error rate, latency breaching an SLO, a critical transaction failing — and keep cause-level
> signals like CPU or queue depth on dashboards for investigation rather than as pages. The reason
> is alert fatigue: paging on every internal signal that might precede a problem trains people to
> deprioritize pages in general, which is exactly the wrong outcome the one time a real,
> symptom-based page needs immediate trust."

### 6. Go Deeper

companion Software Systems Handbook's §57 (Incident Response Deep Dive: triage, runbooks,
postmortems, ADRs) chapter for the full error-budget-based alerting methodology; this book's §53
(SLIs/SLOs/runbooks/postmortems) and §58 (on-call/paging/rollback) for the surrounding on-call
practice this principle fits into.

---
