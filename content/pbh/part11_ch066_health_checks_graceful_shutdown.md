## 66. Health Checks & Graceful Shutdown

### 66.1 The Problem: Infrastructure Needs to Know, Automatically, Whether Your Application Instance Is Actually Usable

A load balancer (companion §28) or an orchestrator (companion §45's Kubernetes chapter) needs an automated way to decide whether a given application instance should receive traffic — a human checking dashboards manually doesn't scale to routine, continuous, per-instance decisions made many times per minute across a fleet of instances. Health checks provide exactly this automated signal; getting them wrong (too shallow, too strict, or absent entirely) directly causes either routing traffic to a broken instance or needlessly removing a healthy one.

### 66.2 Decision Framework: Liveness vs. Readiness — Two Genuinely Different Questions an Orchestrator Asks

A **liveness check** answers "is this process still running and not deadlocked" — a failing liveness check tells the orchestrator to restart the instance entirely, since the process itself is presumed unrecoverable without a fresh start. A **readiness check** answers "is this specific instance currently able to serve real traffic correctly" — a failing readiness check tells the orchestrator to stop routing new traffic to this instance *without* restarting it, since the instance might recover on its own shortly (a temporary database connectivity blip, still worth keeping the process alive for) rather than needing a full, disruptive restart. Conflating these two into a single check is a common, real mistake: a liveness check that's too strict (checking database connectivity, which has nothing to do with whether the *process itself* is alive) causes unnecessary restarts for a problem a restart cannot fix at all (a downstream database outage), while a readiness check that's too shallow (always returning healthy regardless of actual dependency status) routes traffic to an instance that cannot actually serve it correctly.

### 66.3 Python Mechanism: A Readiness Check That Genuinely Verifies Downstream Dependencies

A readiness endpoint should actually attempt to verify that its critical dependencies are reachable — a lightweight database query (`SELECT 1`, not a business-logic query, keeping the check itself cheap and fast) and, if genuinely load-bearing, a Redis ping (companion §35) — rather than merely returning a hardcoded `200 OK` regardless of actual downstream state, exactly the shallow-health-check failure mode companion §28.5's load-balancer chapter warned about generally, now given its specific FastAPI implementation.

### 66.4 Engineering Constraint: A Process Receiving a Shutdown Signal Has In-Flight Requests That Must Not Be Abruptly Dropped

When an orchestrator decides to terminate an instance (a deployment, a scale-down event), it sends a termination signal (`SIGTERM` on most platforms) — a process that terminates *immediately* upon receiving this signal abandons any requests currently in flight, producing a hard, user-visible failure for exactly those unlucky requests, even though the instance was otherwise perfectly healthy moments before. **Graceful shutdown** means the process, upon receiving `SIGTERM`, stops accepting *new* requests immediately but continues processing already-in-flight requests to completion (up to a bounded grace period) before actually exiting.

### 66.5 Python Mechanism: FastAPI's Lifespan Shutdown Phase, Combined with Signal Handling

Companion §17.2's lifespan mechanism's shutdown phase (the code after `yield`) is exactly where graceful cleanup belongs — closing the database connection pool (companion §26), flushing any pending background work (companion §48's outbox poller, if running in-process), and allowing genuinely in-flight requests to complete, all before the process actually exits. Uvicorn itself handles the `SIGTERM`-to-stop-accepting-new-connections translation automatically when run correctly; the application's own responsibility is ensuring its lifespan shutdown code and any background workers it manages respect that same graceful-drain expectation rather than tearing down resources abruptly the moment shutdown begins.

### 66.6 Implementation

```python
from fastapi import FastAPI, Response, status
from contextlib import asynccontextmanager
import asyncio

app_state = {"ready": False}

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db_pool = await create_connection_pool(...)
    app_state["ready"] = True             # only become "ready" once
                                             # genuinely initialized (§66.2)
    yield

    app_state["ready"] = False              # stop claiming readiness
                                              # IMMEDIATELY on shutdown start
    print("Draining in-flight requests...")
    await asyncio.sleep(5)                   # a bounded grace period for
                                               # in-flight work to finish
    await app.state.db_pool.close()           # THEN release resources


app = FastAPI(lifespan=lifespan)

@app.get("/health/live")                     # §66.2: LIVENESS -- is the
def liveness():                               # process itself alive at all
    return {"status": "alive"}                # -- deliberately minimal,
                                                 # checks NOTHING external


@app.get("/health/ready")                     # §66.2: READINESS -- can this
async def readiness(response: Response):        # instance serve REAL traffic
    if not app_state["ready"]:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready"}

    try:
        with app.state.db_pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")           # genuinely CHEAP, but
    except Exception:                              # genuinely verifies the
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE  # actual
        return {"status": "database_unreachable"}                    # dependency
                                                                        # (§66.3)

    return {"status": "ready"}

async def create_connection_pool(*args, **kwargs): ...
```

`liveness` deliberately checks nothing beyond the process's own ability to respond at all — exactly §66.2's minimal, restart-triggering signal. `readiness` genuinely attempts a lightweight database query, correctly distinguishing "the process is running but its critical dependency is currently unreachable" (503, don't route traffic here, but don't restart either) from a liveness failure. The lifespan's shutdown phase sets `app_state["ready"] = False` *immediately*, before the actual sleep-based drain period — this is deliberate: the orchestrator should stop routing new traffic the instant shutdown begins, while already-in-flight requests are still allowed their bounded grace period to complete (§66.4-66.5).

### 66.7 Production Considerations

The grace period's duration (§66.6's `asyncio.sleep(5)`, illustrative) should be tuned against the application's actual typical and worst-case request duration — a grace period shorter than realistic in-flight request completion time defeats the entire purpose of graceful shutdown, while an excessively long one delays deployments and scale-down operations unnecessarily; this value deserves the same deliberate, measured tuning (companion §58) as any other production timing parameter. Readiness checks that hit the database (§66.3) add real, if small, load to that database on every single health-check invocation — at high instance counts with frequent health-check polling intervals, this aggregate load is worth accounting for explicitly (a cheap, fast query and a reasonable polling interval, not an expensive query polled every second) rather than assumed negligible without verification.

### 66.8 Debugging

**Symptoms:** Deployments or scale-down events cause a small number of user-visible request failures despite the application otherwise appearing healthy; an instance experiencing a temporary, recoverable database connectivity issue gets restarted repeatedly by the orchestrator rather than recovering on its own. **Investigation:** For deployment-time failures, check whether the application implements graceful shutdown (§66.4-66.5) at all, or terminates immediately upon `SIGTERM`, abandoning in-flight requests. For the repeated-restart case, check whether the *liveness* check (which triggers restarts) is incorrectly checking downstream dependency health rather than only the process's own basic responsiveness (§66.2's conflation). **Root cause:** Missing or absent graceful-shutdown handling, dropping in-flight requests on termination; a liveness check too strict, conflating "process alive" with "dependencies healthy," causing restarts that cannot actually fix a downstream-dependency problem. **Fix:** Implement lifespan-based graceful shutdown with an appropriately-tuned grace period (§66.5-66.7); narrow the liveness check to genuinely check only process responsiveness, moving dependency-health verification exclusively into the readiness check where it correctly triggers traffic-routing changes rather than restarts.

### 66.9 Interview Thinking

"What's the difference between a liveness probe and a readiness probe, and why do you need both?" is testing whether you understand §66.2's genuinely distinct failure-response semantics (restart vs. stop-routing-traffic) rather than treating the two as interchangeable synonyms for "health check" — a strong answer gives a concrete example of a condition that should fail one but not the other (a downstream database outage: readiness should fail, liveness should not, since restarting the process cannot fix a database outage).

### 66.10 Mini Lab

Implement `liveness` and `readiness` as in §66.6 against a small FastAPI application with a real (or simulated) database connection. Confirm `readiness` correctly returns 503 when the database is deliberately made unreachable (stop the database, or point the connection at a wrong port) while `liveness` continues returning healthy throughout. Then implement the lifespan shutdown pattern with a short grace period, send a request that takes slightly longer than instant to complete, trigger shutdown mid-request (or simulate this with a deliberate delay), and confirm the in-flight request still completes successfully before the process actually exits.

---
