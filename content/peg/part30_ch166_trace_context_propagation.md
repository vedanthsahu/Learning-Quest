## §166. Trace Context Propagation Across HTTP, Queues, and Jobs

### 1. The Vocabulary

- **Trace context** — the identifiers (trace ID, span ID) that tie together every piece of work
  done in service of one logical request, across every service and hop it touches.
- **`traceparent` header** — the W3C Trace Context standard's HTTP header format for propagating
  trace context between services, so different tools and vendors can interoperate instead of each
  inventing an incompatible custom header.
- **Correlation ID vs full distributed trace** — a correlation ID (§49) is often a simpler, single
  string threaded through logs for grep-ability; a full distributed trace additionally captures
  timing and parent/child span relationships, enabling visual waterfall views (§52).
- **Context propagation across async boundaries** — the specific, easy-to-miss requirement that
  trace context must be explicitly carried across a queue message or a background job, since it
  doesn't survive automatically the way it does across a direct HTTP call.

### 2. Where It Sits, and Why Teams Use It

Trace context propagation is what makes distributed tracing (§52) actually distributed — without
it, each service's traces are isolated islands, and reconstructing a single request's full journey
means manually correlating timestamps across separate logging systems, which is slow and
error-prone during an actual incident. The `traceparent` standard specifically exists so that
tracing works across services built with different frameworks and vendors (Datadog, Jaeger,
CloudWatch) without every pair of services needing custom integration work.

### 3. What Actually Breaks

- **Trace context that stops at a queue boundary** — a request that enqueues a background job and
  loses its trace ID at that point produces two disconnected traces (the initial request, and the
  job that processed it) instead of one connected one — a very common and very specific propagation
  gap.
- **Custom, non-standard trace headers** — a service using its own invented header instead of
  `traceparent` breaks interoperability the moment a new service, written by a different team or
  using a different tracing vendor, joins the request path.
- **Trace context generated per-service instead of propagated** — a new trace ID minted at every
  service hop, instead of the original ID being passed through, defeats the entire purpose;
  propagation, not generation, is the requirement at each hop.
- **No propagation through async job frameworks (Celery, SQS)** — trace context has to be
  explicitly attached to a task's arguments or message metadata and re-attached when the worker
  picks it up; frameworks don't do this automatically the way HTTP client libraries increasingly
  do.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I check that trace context specifically survives async boundaries — queues, background jobs —
  not just direct HTTP-to-HTTP calls, since that's the propagation gap that breaks most often."
- "I use the standard `traceparent` header rather than a custom one, so tracing works across
  services regardless of framework or vendor."
- "I confirm a service propagates the incoming trace ID rather than minting a new one, since a new
  ID per hop defeats end-to-end tracing entirely."

### 5. Interview-Ready Answer

> "The propagation gap I check for specifically is async boundaries — a request that enqueues a
> background job needs to carry its trace context into the job's message so the job's work still
> shows up as part of the same trace, since that doesn't happen automatically the way it
> increasingly does for direct HTTP calls. I also make sure services use the standard `traceparent`
> header rather than something custom, so tracing keeps working as new services or vendors get
> added to a request's path."

### 6. Go Deeper

companion Software Systems Handbook's §48 (Observability Mechanics: metrics, OpenTelemetry,
tracing, logging) chapter for full OpenTelemetry propagation setup across HTTP and messaging; this
book's §49 (correlation IDs) and §52 (distributed tracing/OpenTelemetry) for the foundational
tracing vocabulary this chapter extends.

---
