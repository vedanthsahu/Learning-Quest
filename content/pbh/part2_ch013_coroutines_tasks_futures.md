## 13. Coroutines, Tasks & Futures

### 13.1 The Problem: Not Every Concurrent Operation Should Block the Caller Until It Finishes

§12's `asyncio.gather` example ran several coroutines concurrently and waited for all of them together — but a real backend often needs a more flexible relationship: start a background operation (send an audit log entry, warm a cache) without waiting for it at all, or start several operations and react to each as it individually finishes rather than waiting for the slowest one before processing any result. Getting this distinction wrong either introduces needless latency (waiting for something the caller didn't actually need to wait for) or loses track of a background operation's outcome entirely (never checking whether it succeeded).

### 13.2 Python Mechanism: A Coroutine Object Does Nothing Until It's Scheduled

Calling an `async def` function does **not** run its body — it returns a **coroutine object**, an inert, not-yet-started unit of work. `await`-ing that coroutine directly runs it and suspends the current coroutine until it completes (§12.6's pattern). This is a common early-async mistake worth naming precisely: writing `fetch_resource("A", 1.0)` alone (with no `await` and no scheduling) creates the coroutine object and does nothing else — Python will typically warn "coroutine was never awaited," a direct, literal description of the actual bug.

### 13.3 Python Mechanism: `asyncio.create_task` Schedules a Coroutine to Run Concurrently, Independent of Awaiting It

`asyncio.create_task(coro)` wraps a coroutine in a **Task**, immediately scheduling it to start running on the event loop — critically, *without* the calling code needing to `await` it right away. This is the mechanism for §13.1's "start it now, check on it later (or never)" need: a Task begins making progress as soon as it's created, and the calling code can continue doing other things, later `await`-ing the Task's result if and when it actually needs it, or never awaiting it at all for genuine fire-and-forget background work.

### 13.4 Decision Framework: `await coro` vs. `create_task(coro)` vs. `gather(...)`

`await coro` directly is right when the caller has nothing else useful to do until this specific operation finishes — a straightforward sequential dependency. `create_task(coro)` is right when the caller wants that operation to start running concurrently with other work the caller is about to do, checking on its result later. `asyncio.gather(*coros)` is right when several independent operations should all run concurrently and the caller genuinely needs *all* of their results together before proceeding — internally, `gather` creates a Task for each coroutine, exactly formalizing the pattern `create_task` provides manually.

### 13.5 Tradeoff: A Future Is the Lower-Level Primitive Tasks and Async Library Calls Are Built On

A **Future** represents a result that isn't available yet but will be at some point — a Task *is* a specific kind of Future (one that wraps and drives a coroutine). Most backend code never constructs a raw `Future` directly; it's the underlying primitive that `asyncio`'s own internals (and async library authors bridging non-coroutine callback-based code into the `async`/`await` world) use, understood here specifically so that "Task" and "Future" in error messages and library documentation are recognizable rather than mysterious.

### 13.6 Implementation

```python
import asyncio

async def send_audit_log(event: str) -> None:
    await asyncio.sleep(0.2)                  # simulated fire-and-forget I/O
    print(f"audit logged: {event}")

async def fetch_booking(booking_id: str) -> dict:
    await asyncio.sleep(0.3)
    return {"booking_id": booking_id, "status": "CONFIRMED"}

async def handle_cancel_request(booking_id: str) -> dict:
    # Fire-and-forget: we don't need to wait for the audit log to be written
    # before responding to the caller (§13.3-13.4).
    asyncio.create_task(send_audit_log(f"cancel_requested:{booking_id}"))

    # We DO need this result before we can respond -- direct await (§13.4).
    booking = await fetch_booking(booking_id)
    booking["status"] = "CANCELLED"
    return booking

async def main():
    result = await handle_cancel_request("b-1")
    print(result)
    await asyncio.sleep(0.3)   # give the background task time to finish
                                # printing before the script exits (§13.7)

asyncio.run(main())
```

`asyncio.create_task(send_audit_log(...))` starts the audit-log coroutine running immediately but does not block `handle_cancel_request` from continuing on to `fetch_booking` — the two proceed concurrently. The direct `await fetch_booking(...)` reflects that the function genuinely cannot return a meaningful result until that specific operation completes (§13.4's sequential-dependency case).

### 13.7 Production Considerations

A Task created via `create_task` and never `await`-ed (or otherwise retained a reference to) can be garbage-collected before it finishes, silently cancelling work the code intended to run in the background — production code doing genuine fire-and-forget work should retain a reference to the Task (commonly in a module-level or application-scoped set) specifically to prevent this premature garbage collection, and should attach a callback (`task.add_done_callback(...)`) to at least log an exception if the background task fails, since an un-awaited Task's exception otherwise surfaces nowhere and is silently lost — a serious observability gap for anything beyond truly disposable work.

### 13.8 Debugging

**Symptoms:** A "coroutine was never awaited" warning appears in logs; a background task (an audit log, a cache warm) appears to run inconsistently or not at all under certain conditions, with no visible error. **Investigation:** For the warning, find the specific coroutine call missing an `await` or `create_task` wrapping (§13.2). For the inconsistent background task, check whether the Task object's reference was retained anywhere, or whether it was created and immediately discarded, leaving it eligible for garbage collection before completion (§13.7). **Root cause:** Either a coroutine that was constructed but never scheduled at all, or a Task that was scheduled but not retained long enough to guarantee completion. **Fix:** Add the missing `await`/`create_task`; for background tasks, retain references in an application-scoped collection and attach a done-callback that logs failures explicitly.

### 13.9 Interview Thinking

"What's the difference between `await`-ing a coroutine directly and wrapping it in `create_task` first?" tests §13.4's decision framework precisely — a strong answer distinguishes "I need this result before continuing" from "I want this to start running while I do something else," and proactively raises §13.7's garbage-collection risk for background tasks whose reference isn't retained, since it's the single most common real bug in fire-and-forget async code.

### 13.10 Mini Lab

Write an async function `process_order(order_id)` that starts a fire-and-forget `create_task` for a simulated notification send, then directly `await`s a simulated payment-charge coroutine before returning. Deliberately do NOT retain a reference to the notification Task, run the whole thing, and observe (via a print statement in the notification coroutine) whether it reliably completes before the script exits. Then fix it by retaining the Task reference in a set and awaiting it (or using `asyncio.gather` at the very end) before the script's `main()` returns, and confirm the notification now reliably completes.

---
