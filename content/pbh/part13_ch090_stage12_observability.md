## 90. Stage 12: Observability

### 90.1 Stage Goal

Fieldnote now spans five external dependencies (PostgreSQL, Redis, the Celery broker, object storage, an LLM provider) across at least three deployable units (the web tier, Celery workers, and whatever runs scheduled reconciliation) — and to this point, diagnosing any problem in it has relied entirely on reading application code and guessing. This stage retrofits the structured logging, metrics, and tracing this handbook's Part XI established generically, applied comprehensively across everything built so far.

### 90.2 New Requirements

Non-functional only: every request must be traceable end-to-end, including into any background task it triggers; every external dependency call must be individually observable (latency, error rate) rather than folded into an undifferentiated "the request was slow" measurement; the specific failure symptoms this handbook's Part XII named (connection exhaustion, event-loop blocking, cache ineffectiveness) must be detectable from metrics *before* they become user-visible incidents, not only diagnosable after the fact.

### 90.3 ADR-12: Retrofitting Observability vs. Treating It as a Day-Zero Requirement

**(1) Deciding:** Given that observability wasn't built in from Stage 1, should it now be retrofitted comprehensively in one dedicated stage, or added incrementally, one mechanism at a time, alongside future feature work? **(2) Options considered:** (a) one dedicated stage instrumenting everything built so far in a single, focused pass; (b) defer observability work indefinitely, adding it opportunistically only when a specific incident makes the lack of it acutely painful. **(3) Tradeoffs:** A dedicated retrofit stage costs real, focused engineering time with no new user-facing feature to show for it — a hard sell in any environment prioritizing visible feature velocity; deferring it indefinitely means every future incident (and, per this handbook's own Part XII, there will be several) is diagnosed the hard way, via guesswork and code reading, for as long as the deferral continues. **(4) Chosen:** A dedicated stage, now — explicitly justified by naming the cost of the alternative concretely: every stage from §82 onward introduced a new external dependency and a new class of possible failure (connection exhaustion at §82, cache staleness at §83, queue durability at §85, an LLM provider outage at §89) with zero corresponding way to detect any of them proactively; this stage is presented as the necessary, if retroactively obvious, correction to a real gap this capstone's own incremental structure created by design. **(5) Revisit when:** Never fully — observability is explicitly maintained as an ongoing, per-stage requirement from this point forward (§90.8), never again deferred to a dedicated catch-up stage.

### 90.4 Implementation

```python
import contextvars
from opentelemetry import trace                            # companion §65.5

correlation_id: contextvars.ContextVar[str] = contextvars.ContextVar("correlation_id")
tracer = trace.get_tracer("fieldnote")

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    cid = request.headers.get("X-Correlation-ID", str(uuid4()))
    correlation_id.set(cid)                                  # companion §64.3
    with tracer.start_as_current_span("http_request", attributes={"correlation_id": cid}):
        response = await call_next(request)
    response.headers["X-Correlation-ID"] = cid
    return response

@celery_app.task(bind=True)
def index_note_task(self, note_id: str, title: str, body: str, correlation_id_value: str) -> None:
    correlation_id.set(correlation_id_value)                 # propagate across the task boundary
    with tracer.start_as_current_span("index_note_task"):
        ...

db_pool_gauge = meter.create_observable_gauge(
    "db_pool_checked_out", callbacks=[lambda: engine.pool.checkedout()]
)                                                              # companion §57.2 -- directly answers §72
cache_hit_counter = meter.create_counter("space_members_cache_hits")   # directly answers §74
```

`correlation_id` propagates explicitly into `index_note_task` as an actual task argument (`correlation_id_value`), not implicitly — a Celery task runs in an entirely separate process from the request that enqueued it, so a `contextvars`-based correlation ID (companion §64.3) that worked for in-process `BackgroundTasks` at §84 does not automatically cross that process boundary, and must be passed explicitly instead, a detail easy to miss when retrofitting observability onto already-existing background tasks. `db_pool_checked_out` and `space_members_cache_hits` are not generic instrumentation — they are the *specific* metrics companion §72.3 and §74.3 name as the leading indicators for exactly the failure modes those chapters diagnose, chosen deliberately rather than instrumenting everything indiscriminately.

### 90.5 What Changed in the Architecture

Every existing route and every existing Celery task requires a small, mechanical edit (adding tracing spans, passing `correlation_id_value` explicitly) — the single largest-blast-radius change in the capstone so far, precisely because observability, unlike every prior stage's addition, is a cross-cutting concern touching every existing code path rather than an isolated new capability, the concrete cost ADR-12 named as the tradeoff of deferring this work as long as it was deferred.

### 90.6 Production Considerations

The specific metrics chosen in §90.4 should be wired directly into alerting thresholds derived from this handbook's own Part XII chapters — `db_pool_checked_out` approaching `pool_size` should alert before companion §72's exhaustion symptom actually occurs, not only be visible on a dashboard someone has to remember to check.

### 90.7 Debugging

**Symptoms:** A trace for a slow request shows a gap — a period of unaccounted-for time between the request span ending and the corresponding background task's span beginning. **Investigation:** This is almost always queue wait time (companion §37's task sitting in the broker before a worker picks it up), not lost tracing — the fix is instrumenting queue-wait duration explicitly as its own metric, rather than treating the trace gap as a tracing bug to be patched over.

### 90.8 Mini Lab

Pick any two of Part XII's eight failure-diagnosis chapters (§70-77) and, for each, add the specific metric that chapter names as its primary leading indicator (§70.4, §72.3, etc.) to Fieldnote if it isn't already covered by §90.4 — directly practicing ADR-12's stated commitment that observability additions now happen per-stage and per-mechanism going forward, rather than accumulating into a future second retrofit.

---
