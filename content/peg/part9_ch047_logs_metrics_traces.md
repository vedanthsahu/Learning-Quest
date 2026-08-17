## §47. Logs, Metrics, and Traces: The Three Pillars

### 1. The Vocabulary

- **Log** — a discrete, timestamped record of a specific event ("user 42 logged in").
- **Metric** — a numeric measurement over time (request count, error rate, memory usage) — cheap
  to store and great for dashboards and alerts, but with no per-request detail.
- **Trace** — the end-to-end path of a single request as it moves through multiple services,
  showing where time was actually spent.
- **Structured logging** — logging as machine-parseable key-value data (usually JSON) instead of
  free-form text sentences, so logs can actually be queried and filtered.

### 2. Where It Sits, and Why Teams Use It

Each of these three answers a different question: metrics tell you *that* something's wrong
(error rate spiked), logs tell you the specific details of *one* occurrence, and traces tell you
*where* in a multi-service request the time or the failure actually happened. Using only one of
the three leaves real blind spots.

### 3. What Actually Breaks

- **Free-form text logs at scale** — `"User failed to login: " + username` is fine to read one at
  a time, but nearly impossible to search, filter, or aggregate reliably across millions of log
  lines; structured logging (consistent fields every time) fixes this.
- **Only having metrics, no logs** — a dashboard shows error rate spiked, but with no
  corresponding logs there's no way to see *which* specific requests failed or why.
- **Only having logs, no traces, in a multi-service system** — a slow request's logs are scattered
  across several services with no way to connect them back into one timeline, so "where did the
  time actually go" requires manual detective work a trace would answer directly (see §49 for
  correlation IDs specifically).
- **Logging too much or too little** — logging every field of every request bloats storage costs
  and buries genuinely important lines; logging too little leaves you diagnosing an incident
  blind.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Metrics tell me something is wrong in aggregate, logs tell me the specifics of one instance,
  and traces tell me where time went across services — I use all three together, not just
  whichever is easiest to set up."
- "I log in structured, consistent key-value fields, not free-form sentences, specifically so logs
  are actually queryable at scale."
- "In a multi-service system, I don't try to debug a slow request from logs alone — I want a
  trace connecting the whole path."

### 5. Interview-Ready Answer

> "I think of logs, metrics, and traces as answering three different questions. Metrics tell you
> something is wrong right now, in aggregate — error rate, latency, throughput. Logs give you the
> specific detail of one event once you know roughly where to look. Traces connect a single
> request's path across multiple services, which is essential the moment a system isn't just one
> monolith. I structure my logs as consistent key-value data specifically so they're queryable at
> scale, not just readable one line at a time."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §64 (Structured Logging & Log Design) chapter and
companion Python Backend Engineering Handbook's §65 (Metrics, Tracing & Observability) chapter;
companion Software Systems Handbook's §16 (Mental Model: Observability) chapter and companion
Software Systems Handbook's §48 (Observability Mechanics: metrics, OpenTelemetry, tracing,
logging) chapter.

---
