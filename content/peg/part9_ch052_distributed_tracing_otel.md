## §52. Distributed Tracing & OpenTelemetry, Practically

### 1. The Vocabulary

- **Distributed trace** — the full path of one request across multiple services, broken into
  spans, showing exactly where time was spent at each hop.
- **Span** — one unit of work within a trace (one service call, one database query), with its own
  start/end time and metadata.
- **OpenTelemetry (OTel)** — a vendor-neutral standard and set of libraries for generating traces,
  metrics, and logs, so instrumentation isn't locked into one specific observability vendor.
- **Sampling** — recording only a percentage of traces (rather than every single one), since
  capturing 100% of traces at high volume is often prohibitively expensive.

### 2. Where It Sits, and Why Teams Use It

This is the direct answer to §49's correlation-ID idea, formalized: instead of just sharing an ID
across log lines, a trace captures the actual timing breakdown across every service and
dependency a request touched, which is what actually answers "where did the time go" in a
microservices architecture.

### 3. What Actually Breaks

- **A trace with gaps** — if one service in the call chain isn't instrumented, the trace shows a
  mysterious time gap with no visibility into what happened during it — often the exact place the
  real problem lives.
- **100% sampling at high traffic** — can meaningfully increase both cost and the latency
  overhead of the tracing instrumentation itself; most teams sample a percentage, with an
  exception for traces that included an error (those are usually always kept).
- **Vendor lock-in from proprietary instrumentation** — choosing a vendor-specific tracing SDK
  instead of the OpenTelemetry standard makes it expensive to ever switch observability
  platforms later, since all the instrumentation code would need to change too.
- **Tracing added only after an incident forces the issue** — similar to correlation IDs, tracing
  is far more valuable set up proactively across all services than retrofitted mid-incident when
  it's needed most and least available.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A trace shows me the actual time breakdown of a request across every service it touched — not
  just that something in the chain was slow, but specifically which hop."
- "I'd use OpenTelemetry specifically to avoid locking instrumentation into one vendor's
  proprietary SDK."
- "100% trace sampling isn't usually realistic at scale — but I'd always keep traces that included
  an error, even under a lower general sampling rate."

### 5. Interview-Ready Answer

> "Distributed tracing extends the correlation-ID idea into an actual timing breakdown — each
> service call in a request's path becomes a span, and the full trace shows exactly where time
> went across every hop, which is what actually answers 'why is this slow' in a multi-service
> system instead of just 'that it's slow somewhere.' I'd instrument with OpenTelemetry
> specifically so that choice isn't locked into one observability vendor, and I'd sample at a
> reasonable rate for cost, while always keeping traces that included an error."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §65 (Metrics, Tracing & Observability) chapter;
companion Software Systems Handbook's §48 (Observability Mechanics: metrics, OpenTelemetry,
tracing, logging) chapter.

---
