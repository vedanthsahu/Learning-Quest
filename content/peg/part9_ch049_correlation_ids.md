## §49. Correlation IDs and Following a Request Through the System

### 1. The Vocabulary

- **Correlation ID / request ID** — a unique identifier generated at the start of a request and
  passed along through every service and log line that touches it.
- **Trace ID / span** — the distributed-tracing version of the same idea: a trace ID identifies the
  whole request across services, and each individual step within it is a span.
- **Header propagation** — passing the correlation/trace ID forward as a header on every internal
  service-to-service call, so it survives the hop.

### 2. Where It Sits, and Why Teams Use It

The moment a request touches more than one service, "search the logs for what happened" stops
working unless every log line involved shares a common identifier to search by. This is the
single cheapest, highest-leverage observability investment a team can make, and it's often
missing until the first genuinely painful multi-service incident forces it in.

### 3. What Actually Breaks

- **No correlation ID at all** — debugging a multi-service issue means manually correlating log
  lines by approximate timestamp across several different services' logs, which is slow and
  error-prone, especially under load with many concurrent requests happening at once.
- **Correlation ID generated but not propagated** — one service generates it, but a downstream
  service call doesn't forward it as a header, so the chain breaks at that hop and you're back to
  timestamp-guessing from that point forward.
- **A new correlation ID generated at every hop instead of reused** — defeats the purpose entirely;
  the whole point is one shared ID across every service involved in the same logical request.
- **Correlation ID not included in error logs specifically** — the one place it matters most (a
  failure) is exactly where it's easiest to forget to attach it if it's not automatically
  included by default logging middleware.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Every request gets a correlation ID at the edge, and it's propagated through every downstream
  service call as a header, so I can search one ID and see every log line related to that one
  request."
- "I check that logging middleware automatically attaches the correlation ID to every log line
  without each individual log statement having to remember to include it."
- "This is the cheapest observability investment there is, and I'd add it early rather than
  waiting for the first painful multi-service incident to force the issue."

### 5. Interview-Ready Answer

> "A correlation ID is generated once at the edge of a request and propagated through every
> downstream service call as a header, attached automatically to every log line along the way.
> The value is that debugging a multi-service issue becomes 'search logs for this one ID' instead
> of manually correlating timestamps across several different services' logs by hand — which
> barely works even with low traffic and completely falls apart under real concurrent load."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §64 (Structured Logging & Log Design) chapter and
companion Python Backend Engineering Handbook's §65 (Metrics, Tracing & Observability) chapter
(this concept, plus the fuller distributed tracing version in §52).

---
