## 65. Metrics, Tracing & Observability

### 65.1 The Problem: Logs Alone Don't Answer "Is the System Healthy Right Now" or "Where in a Multi-Service Call Did the Time Actually Go"

§64's structured logs are excellent for reconstructing *what happened* during one specific request, after the fact. They're a poor fit for two related but distinct questions: "is the system healthy, in aggregate, right now" (better answered by continuously-aggregated metrics, cheaper to query than scanning logs) and "across a request spanning multiple services, which specific service and which specific operation actually consumed the time" (better answered by distributed tracing, which §64.7 flagged as the natural extension of single-service correlation IDs).

### 65.2 Python Mechanism: OpenTelemetry — The Standard, Vendor-Neutral Instrumentation Layer

**OpenTelemetry** provides a standardized API for emitting metrics, traces, and (increasingly) logs, decoupled from any specific backend that ultimately stores and visualizes them (Prometheus, Jaeger, a commercial observability platform) — directly the same protocol-versus-implementation decoupling companion §16.3's ASGI standard provides for web servers and frameworks, now applied to observability tooling: instrumenting your application against OpenTelemetry's API means the specific downstream observability vendor can be changed later without re-instrumenting the application code itself.

### 65.3 Python Mechanism: The Three Metric Types — Counters, Gauges, and Histograms

A **counter** only ever increases (total requests served, total bookings created) — useful for computing rates (requests per second) by observing its rate of change over time. A **gauge** can go up or down, representing a current value at a point in time (current number of open database connections, companion §26.2; current queue depth, companion §37.9) — useful for observing instantaneous state, not cumulative totals. A **histogram** records the *distribution* of a value across many observations (request latency, companion §58.2's percentile principle) — the only one of the three that directly supports percentile-based analysis, since a counter or gauge alone cannot tell you anything about the shape of a distribution, only a single current or cumulative number.

### 65.4 Decision Framework: What to Instrument, Matched to What Question It Answers

Every metric should be added in service of a specific, anticipated question, not instrumented reflexively for everything measurable — request-count and latency-histogram metrics per endpoint answer "is this specific endpoint healthy" (directly feeding companion §58's percentile discipline into continuous production monitoring rather than only point-in-time benchmarks); connection-pool-utilization and checkout-wait-time gauges (companion §57.2) answer "is the database layer becoming a bottleneck before it produces outright failures"; queue-depth and consumer-lag gauges (companion §36.7) answer "is background processing keeping pace with incoming work." Instrumenting a metric nobody will ever query or alert on is pure overhead with no corresponding benefit — the discipline is working backward from "what would I want to know during an incident, or want an early-warning signal for" to the specific metrics that answer those exact questions.

### 65.5 Python Mechanism: Distributed Tracing — Spans, Propagated Across Service Boundaries

A **trace** represents one logical operation (an incoming request) as it flows through potentially many services; a **span** represents one specific unit of work within that trace (a single database query, a single downstream HTTP call, companion §32) — spans are nested (a parent span for the whole request, child spans for each operation within it) and, critically, the trace context propagates *across* service boundaries via HTTP headers (directly extending §64.7's cross-service correlation-ID forwarding into a fully structured, hierarchical, timing-annotated equivalent) — letting an engineer view one complete trace and see, visually, exactly how much time each service and each operation within each service actually consumed, for one specific real request.

### 65.6 Implementation

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider

trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer("seat_management")

metrics.set_meter_provider(MeterProvider())
meter = metrics.get_meter("seat_management")

booking_counter = meter.create_counter(
    "bookings_created_total", description="Total bookings created"
)
booking_latency = meter.create_histogram(
    "booking_creation_duration_seconds", description="Booking creation latency"
)
pool_utilization = meter.create_up_down_counter(   # a GAUGE-like metric --
    "db_pool_active_connections"                     # can go up AND down (§65.3)
)


async def create_booking_instrumented(seat_id: str, user_id: str) -> dict:
    with tracer.start_as_current_span("create_booking") as span:   # §65.5:
        span.set_attribute("seat_id", seat_id)                       # a SPAN,
        import time                                                    # nested
        start = time.perf_counter()                                     # under
                                                                          # whatever
        with tracer.start_as_current_span("db_insert"):                 # called
            pool_utilization.add(1)                                       # this
            try:
                result = await booking_repository.insert_booking(         # function
                    seat_id=seat_id, user_id=user_id
                )
            finally:
                pool_utilization.add(-1)

        elapsed = time.perf_counter() - start
        booking_latency.record(elapsed)     # HISTOGRAM: supports percentile
        booking_counter.add(1)                # analysis later (§65.3)

        return result

async def booking_repository(): ...
```

`booking_counter` (a counter) and `booking_latency` (a histogram) answer genuinely different questions: the counter, aggregated over time, gives "bookings created per minute"; the histogram, queried later, gives "what's the p95 booking-creation latency" — neither metric type could answer the other's question (§65.3-65.4). The nested `start_as_current_span` calls (`create_booking` as parent, `db_insert` as a child span within it) demonstrate §65.5's span hierarchy — a trace viewer would show `db_insert`'s specific duration as a distinct, visually nested portion of `create_booking`'s total duration, immediately revealing what fraction of the total time was spent specifically on the database operation versus everything else inside the parent span.

### 65.7 Production Considerations

Tracing every single request in a high-volume production system is often prohibitively expensive (storage and processing cost scaling directly with trace volume) — **sampling** (recording only a percentage of traces, or specifically always recording traces for requests that errored or exceeded a latency threshold, "tail-based sampling") is the standard production pattern, directly companion §71 of the Software Systems Handbook's cardinality-and-cost discussion applied specifically to tracing volume. Metric cardinality (the number of distinct label/attribute combinations a metric can have — companion §71's exact concern) must be actively bounded — a metric labeled by a genuinely unbounded value (a raw user ID, a raw booking ID) rather than a bounded category (an endpoint name, a status code) can silently explode the underlying metrics-storage system's cost and performance, a specific, common, easy-to-introduce mistake worth explicit code-review attention.

### 65.8 Debugging

**Symptoms:** A multi-service request is reported as slow, but it's unclear which specific service or operation within the chain actually accounts for the latency; a metrics dashboard shows a specific counter or histogram is missing data, or a gauge value appears frozen/stale. **Investigation:** For the multi-service latency question, pull the actual distributed trace (§65.5) for a representative slow request and inspect the span breakdown directly, rather than guessing which service is likely responsible from prior assumptions. For missing/stale metrics, check whether the specific instrumentation code path is actually being exercised (a metric only updated inside a rarely-hit code branch will appear to have stopped updating if that branch simply isn't being reached), and check for a metric cardinality explosion (§65.7) that might have caused the underlying system to silently drop or throttle that specific metric. **Root cause:** The actual latency-dominant service/operation only identifiable via the trace's span breakdown, not assumption; an instrumentation gap or an unbounded-cardinality metric causing silent data loss. **Fix:** Use the trace's span timing to precisely target optimization effort at the genuinely dominant contributor, not a guessed one; audit and fix the specific instrumentation gap, and bound any unbounded-cardinality metric label to a fixed, small set of categories.

### 65.9 Interview Thinking

"A request that spans three internal services is reported as slow — how do you find out which service is the actual bottleneck?" is testing whether distributed tracing (§65.5) is your default answer, with an understanding that this requires trace-context propagation *across* service boundaries (not just within one service, companion §64.2's narrower scope) — a strong answer distinguishes this from simply adding more logging to each service independently, which would require manual, error-prone timestamp correlation across separate log streams rather than one unified, hierarchical trace view.

### 65.10 Mini Lab

Implement the counter, histogram, and gauge-like up-down-counter from §65.6 against a small FastAPI application with a simulated database call (an `asyncio.sleep` standing in for real latency). Generate several requests with varying simulated latencies and, using OpenTelemetry's console exporter (or an equivalent simple local setup) rather than a full observability backend, inspect the emitted metric data directly, confirming the histogram captures the actual distribution of your varied latencies rather than only a single aggregate number.

---
