## 48. Observability Mechanics: Metric Types, OpenTelemetry, Distributed Tracing, Structured Logging

### 48.1 What This Chapter Adds to §16

§16 established the three pillars (metrics, logs, traces) and the monitoring-versus-observability distinction. This chapter covers the concrete metric data types, the OpenTelemetry standard unifying instrumentation, the actual mechanics of distributed tracing (spans, context propagation), and structured logging.

### 48.2 Metric Types: Counters, Gauges, and Histograms

- A **counter** only increases (or resets to zero on restart) — total requests served, total errors encountered. It answers "how many, cumulatively" and is most useful viewed as a rate of change (requests per second) rather than its raw, ever-growing value.
- A **gauge** represents a value that can go up or down at any time — current memory usage, current number of active connections. It answers "what is the value right now."
- A **histogram** records the distribution of a value across observations — most commonly request latency — bucketing individual observations so that percentiles (§18.2, §50) can be computed after the fact, rather than only having a single aggregate average that hides the shape of the underlying distribution.

The choice of metric type is not cosmetic: using a gauge to track something that's really cumulative (or vice versa) produces numbers that are technically present but answer the wrong question, and — critically for histograms specifically — averaging latency directly (rather than recording a histogram and computing percentiles) hides exactly the tail-latency behavior that most matters for real user experience (§50, §73), since an average can look perfectly healthy while a meaningful fraction of requests are unacceptably slow.

### 48.3 OpenTelemetry: A Vendor-Neutral Standard for Instrumentation

Historically, instrumenting an application for metrics, logs, and traces meant adopting a specific vendor's proprietary client library, making it costly to later switch observability backends without re-instrumenting the entire codebase. **OpenTelemetry** is an open, vendor-neutral standard defining a common API and data format for all three pillars, so that application code is instrumented once, against the standard, and the actual backend that receives and stores that telemetry data can be swapped independently, without touching the instrumented code itself. This is a direct, concrete instance of the "contract" concept from §4.3, applied to observability infrastructure: OpenTelemetry is the contract between instrumented application code and whatever specific observability backend a team happens to operate.

### 48.4 Distributed Tracing Mechanics: Spans and Context Propagation

A distributed trace (introduced at the mental-model level in §16.3) is built from individual **spans**, each representing one unit of work (an incoming request handled, an outgoing call made, a database query executed) with a start time, duration, and a set of attributes. Spans are linked into a tree reflecting causality: a span for an incoming request has child spans for every downstream call that request triggered, which themselves may have further child spans for calls *they* trigger, and so on across service boundaries.

```
Trace for one user request (spans, indented by parent-child):

  [ Span: HTTP request to Service A ]           (100ms total)
      [ Span: Service A calls Service B ]        (60ms)
          [ Span: Service B queries database ]    (45ms)
      [ Span: Service A calls Service C ]        (30ms)

Reading this trace immediately answers "where did the time go":
the database query inside Service B is the single largest
contributor, not Service A's own logic or the call to Service C.
```

The mechanism that makes this cross-service linkage possible is **context propagation**: when Service A calls Service B, it attaches a small piece of tracing context (a trace ID identifying the overall request, and a span ID identifying the specific parent span) to the outgoing request, typically via HTTP headers — Service B reads that context and creates its own new spans as children of the received parent span ID, and passes an updated context along to anything *it* calls in turn. Without this propagation, each service's spans would be disconnected, isolated fragments with no way to reconstruct the full, cross-service picture a trace is meant to provide — which is precisely why adopting distributed tracing requires every service in a call chain to participate in context propagation, not just the one team that wants better visibility into their own service.

### 48.5 Structured Logging: Making Logs Queryable, Not Just Readable

Traditional logging produces free-text lines meant for a human to read sequentially. **Structured logging** instead emits logs as machine-parseable records (commonly JSON) with consistent, named fields (`timestamp`, `service`, `request_id`, `user_id`, `message`, and arbitrary additional context), enabling logs to be queried, filtered, and aggregated systematically — "show me every log line across every service for this specific `request_id`" is a simple, reliable query against structured logs, but a fragile, error-prone text search against unstructured free-text logs. Including the same `request_id` (or trace ID, per §48.4) in every structured log line emitted while handling a given request is what allows logs and traces to be cross-referenced directly — jumping from "this specific span was slow" (found via tracing) to "here are the exact log lines emitted during that span" (found via structured logging on the shared identifier), directly operationalizing the "logs answer why, traces answer where" division of labor described in §16.3.

### 48.6 Common Mistakes and Production Debugging Signals

- Reporting only an average latency metric rather than a histogram with percentiles (§48.2), hiding a real tail-latency problem behind a healthy-looking average — a specific, common instance of the general principle that averages obscure distributions.
- Instrumenting only some services in a call chain with distributed tracing, producing broken, disconnected traces at exactly the boundary where an uninstrumented service sits, because context propagation (§48.4) requires participation from every hop, not just some.
- Logging free-text messages with inconsistent, ad hoc formatting across different parts of a codebase, making automated querying and cross-service correlation (§48.5) impractical exactly when an incident makes fast correlation most valuable.

### 48.7 Engineering Intuition

> **How do I know my metrics are hiding a real problem?** If every dashboard shows healthy averages but users still report a slow experience, check whether latency is tracked as a histogram with percentiles (§48.2, §50) rather than only an average — the discrepancy is a strong signal of exactly this gap.
>
> **What symptoms indicate broken trace propagation?** Traces that mysteriously terminate at a specific service boundary, with no child spans for calls that service made further downstream, despite those downstream calls definitely having occurred.
>
> **What metrics indicate an observability instrumentation gap?** The fraction of requests with a complete, unbroken trace across their entire call path, as a tracked metric in its own right — a low or declining fraction points directly at partial instrumentation coverage.
>
> **What breaks first if structured logging isn't adopted?** Incident diagnosis slows down substantially, because correlating log lines across multiple services for a single request requires manual, error-prone text searching rather than a direct, reliable query on a shared identifier.
>
> **When is unstructured logging and a simple average latency metric good enough?** For a small, single-service system with low request volume and low complexity, where cross-service correlation and tail-latency nuance genuinely don't yet matter — this instrumentation sophistication earns its cost specifically once a system spans multiple services or serves enough volume that tail behavior diverges meaningfully from the average.
>
> **What would a hyperscale company do?** Mandate OpenTelemetry-based instrumentation and structured logging with consistent identifiers as a platform-wide standard for every service, and treat trace-coverage percentage as a tracked reliability metric in its own right (§71).
>
> **What would a two-person startup do?** Use a managed observability platform's default instrumentation (often OpenTelemetry-compatible out of the box for popular frameworks) and adopt structured logging early, since the setup cost is low relative to the diagnostic benefit even at small scale.
>
> **What changes with scale?** At a single service with low traffic, simple metrics and readable logs are sufficient. As the system spans more services and traffic grows, full distributed tracing with complete context propagation and structured, correlated logging become necessary to diagnose issues at all, rather than merely convenient (§71).

### 48.8 Exercises

1. A service's dashboard shows an average response time of 120ms, well within its target, yet a meaningful fraction of real users report a slow experience. Using §48.2, explain what additional metric would likely reveal the actual problem, and why an average alone can hide it.
2. A distributed trace for a slow request shows a span for Service A calling Service B, but no child spans underneath Service B at all, even though Service B is known to call a database. Using §48.4, diagnose the likely cause.

### 48.9 Further Reading

- OpenTelemetry official documentation, "Traces," "Metrics," and "Logs" — the authoritative specification underlying §48.3-48.5.
- Google, *Site Reliability Engineering*, Chapter 6 — foundational guidance on choosing meaningful metrics, directly extending §48.2's type distinctions.

---
