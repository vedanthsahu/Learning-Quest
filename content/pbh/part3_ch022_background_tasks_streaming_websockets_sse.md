## 22. Background Tasks, Streaming Responses, WebSockets & SSE

### 22.1 The Problem: Not Every Response Fits the "One Request, One Immediate Reply" Shape

Ordinary request/response HTTP assumes the server computes a complete response and sends it back once, then the interaction ends. Three real backend needs don't fit that shape: work that should happen *after* the response is already sent (so the caller isn't kept waiting for something they don't need to wait for); a response too large, or too slow to fully compute, to buffer entirely in memory before sending any of it; and a genuinely ongoing, bidirectional or server-push relationship (a chat message arriving, a live progress update) that doesn't resolve to a single reply at all.

### 22.2 Python Mechanism: `BackgroundTasks` Runs Code After the Response Is Already Sent

FastAPI's `BackgroundTasks` parameter lets a route handler schedule a function to run *after* the response has been sent to the client — the caller gets their response immediately, without waiting for the background work (sending a confirmation email, writing an audit log entry) to complete. This is a FastAPI-level convenience over the same underlying mechanism companion §13.3's `create_task` provides at the raw asyncio level, specifically scoped to "run this once, after this one response, within this one request's lifecycle."

### 22.3 Decision Framework: `BackgroundTasks` vs. a Real Queue (Preview of Companion §36)

`BackgroundTasks` runs *within the same process* as the request that scheduled it — if that process crashes or restarts before the background task completes, the task is simply lost, with no retry and no record it was ever supposed to happen. This makes it the right tool specifically for low-stakes, best-effort work (an analytics ping, a non-critical log entry) where losing an occasional task on a rare process restart is an acceptable cost — for anything that must reliably happen (a payment confirmation email, an inventory update), a genuine message queue (companion §36, Celery companion §37) with real persistence and retry semantics is the correct tool, not `BackgroundTasks`.

### 22.4 Python Mechanism: `StreamingResponse` Sends Data Incrementally, Not All at Once

A `StreamingResponse` wraps a generator (companion §3.5) or async generator, sending each yielded chunk to the client as it becomes available rather than waiting for the entire response body to be assembled first — directly companion §3.5's memory-efficiency benefit, now applied at the HTTP response layer specifically: a large file export or a long-running report generation can begin reaching the client within milliseconds, with the client's own progress (a download progress bar, incrementally rendered content) reflecting real, ongoing work rather than one long pause followed by everything appearing at once.

### 22.5 Tradeoff: Server-Sent Events (SSE) vs. WebSockets — Direction of Communication Is the Deciding Factor

**SSE** is a one-directional channel: the server can push events to the client over a long-lived HTTP connection, but the client cannot send anything back over that same connection (it would need a separate, ordinary request for that). **WebSockets** provide genuine bidirectional communication over one connection — both sides can send messages at any time. The decision is almost entirely about whether the client genuinely needs to send data back over the same live channel: a live-updating dashboard or a streaming AI response (companion AI Systems Handbook §19.6) fits SSE's simpler, one-directional model well; a chat application or any genuinely interactive real-time exchange needs WebSockets' bidirectionality.

### 22.6 Implementation

```python
import asyncio
import json
from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import StreamingResponse
from fastapi import WebSocket, WebSocketDisconnect

app = FastAPI()

def send_confirmation_email(booking_id: str) -> None:
    print(f"[background] sending confirmation email for {booking_id}")

@app.post("/bookings")
def create_booking(booking_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(send_confirmation_email, booking_id)  # §22.2:
    return {"booking_id": booking_id, "status": "CONFIRMED"}         # runs
                                                                        # AFTER
                                                                        # this
                                                                        # response
                                                                        # is sent


async def generate_large_report():
    for i in range(5):
        await asyncio.sleep(0.5)                # simulated per-chunk work
        yield f"row {i}\n"                       # sent to the client NOW,
                                                   # not buffered until all
                                                   # five rows are ready (§22.4)

@app.get("/reports/export")
def export_report():
    return StreamingResponse(generate_large_report(), media_type="text/plain")


@app.websocket("/ws/chat/{room_id}")
async def chat_room(websocket: WebSocket, room_id: str):
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()   # BIDIRECTIONAL --
                                                          # client -> server
            await websocket.send_text(f"[{room_id}] echo: {message}")  # AND
                                                                          # server
                                                                          # -> client
                                                                          # (§22.5)
    except WebSocketDisconnect:
        print(f"client disconnected from room {room_id}")
```

`background_tasks.add_task(...)` schedules `send_confirmation_email` to run only after FastAPI has already sent the `{"booking_id": ..., "status": "CONFIRMED"}` response back to the caller — the caller's request completes immediately, without waiting for the email-sending logic at all (§22.2). `generate_large_report`'s `yield` inside an async generator, wrapped in `StreamingResponse`, sends each row to the client as soon as it's produced, rather than buffering all five rows in memory first (§22.4). The WebSocket handler's `while True` loop with both `receive_text()` and `send_text()` demonstrates §22.5's genuine bidirectionality, structurally impossible to express with SSE's one-directional model alone.

### 22.7 Production Considerations

`BackgroundTasks` work sharing the same process and event loop as request handling means a genuinely slow or blocking background task can still degrade the application the same way any blocking call would (companion §11.2, §12.2) — it does not run in a separate worker or process, only "after this response," making §22.3's queue-versus-BackgroundTasks distinction a real operational concern, not just a reliability one. Both `StreamingResponse` and WebSocket connections hold a connection open for a longer duration than an ordinary request — under load, this consumes a connection slot (and, for WebSockets specifically, real per-connection memory for the duration of the session) for far longer than a typical fast request/response cycle, meaning capacity planning (companion §56) for a WebSocket-heavy or streaming-heavy service must account for concurrent *open connections*, not just requests-per-second, as the primary load metric.

### 22.8 Debugging

**Symptoms:** A background task scheduled via `BackgroundTasks` appears to run inconsistently, or never runs at all, correlated with deployments or process restarts. **Investigation:** Check whether the task is genuinely low-stakes/best-effort by design, or whether it's actually something requiring reliable delivery (§22.3) that was incorrectly implemented with `BackgroundTasks` instead of a real queue. **Root cause:** `BackgroundTasks`' in-process, non-persistent nature (§22.3) means any task in flight during a process restart or crash is silently lost, with no record and no retry. **Fix:** For anything requiring reliable execution, migrate to a genuine queue-backed worker (companion §36-37) with persistence and retry semantics; reserve `BackgroundTasks` explicitly for work where occasional silent loss is an acceptable, understood tradeoff.

### 22.9 Interview Thinking

"How would you implement a live-updating dashboard versus a chat feature?" tests whether you correctly map the one-directional/bidirectional distinction (§22.5) onto SSE versus WebSockets respectively — a strong answer also proactively raises the connection-capacity planning consideration (§22.7) as a scaling concern distinct from ordinary request/response capacity planning.

### 22.10 Mini Lab

Build a small FastAPI app with a `/bookings` POST route that schedules a `BackgroundTasks` print statement, and confirm via timing (print a timestamp both in the handler and in the background task) that the background task's print happens measurably after the response would have already been received by a client. Then build a `StreamingResponse` endpoint yielding five chunks with a half-second delay each, and use a simple HTTP client to confirm chunks arrive incrementally over roughly 2.5 seconds rather than all at once at the end.

---
