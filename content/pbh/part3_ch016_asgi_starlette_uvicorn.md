## 16. ASGI, Starlette & Uvicorn: What Actually Serves a Request

### 16.1 The Problem: Something Has to Translate Raw Network Bytes Into Python Function Calls

An HTTP request arrives at a server as raw bytes on a TCP connection — a web framework's route handler receives a clean, structured request object with a method, path, headers, and body already parsed. Something in between must own that translation: accepting the connection, parsing the protocol, and calling into application code with the result — and, for anything beyond simple request/response HTTP, coordinating a longer-lived relationship for streaming or WebSocket connections (companion §22, §33).

### 16.2 Engineering Constraint: A Web Framework and a Web Server Are Different Responsibilities

Part II's asyncio material.assumed something was already running the event loop; in a real deployment, that's a **server** (a program that binds a port, accepts connections, and speaks the wire protocol), distinct from a **framework** (the library your application code is written against, defining routing, request/response objects, and business logic hooks). Conflating these is a common early-career confusion — FastAPI is a framework; it does not itself listen on a socket, run an event loop, or manage worker processes, all of which is the server's job.

### 16.3 Python Mechanism: ASGI Is the Contract Connecting Them

**ASGI (Asynchronous Server Gateway Interface)** is a standardized, minimal calling convention — a specific async callable signature (`async def app(scope, receive, send)`) — that any ASGI-compliant server can call and any ASGI-compliant framework can implement. This is precisely why FastAPI applications can run under Uvicorn, Hypercorn, or Daphne interchangeably: the server never needs to know anything about FastAPI's own internals, only that the object it's calling honors the ASGI contract, and the framework never needs to know anything about the specific server, only that whatever calls it will honor that same contract — the same decoupling-via-standard-interface principle the companion Software Systems Handbook applies to API design generally (companion §29), here applied one layer below the HTTP API itself.

### 16.4 Decision Framework: Why ASGI Superseded WSGI for Modern Python Backends

**WSGI** (the older standard) defines a purely synchronous calling convention — one request, one blocking function call, one response — which cannot natively support anything requiring a long-lived, bidirectional connection (WebSockets) or genuinely concurrent request handling on one worker (§12's async model). ASGI's async-native contract supports both traditional request/response HTTP *and* WebSockets/long-lived streaming connections through the same interface, which is precisely why FastAPI (and Starlette beneath it) are ASGI-based rather than WSGI-based — the framework needed a protocol capable of expressing the concurrency model Part II already established as the right fit for I/O-heavy backend workloads.

### 16.5 Python Mechanism: Starlette Is the ASGI Toolkit FastAPI Is Built On

**Starlette** implements the actual ASGI-level mechanics — routing, request/response objects, middleware, WebSocket handling — as a lightweight, general-purpose toolkit. **FastAPI** is built directly on top of Starlette, adding automatic request/response validation and serialization (via Pydantic, §21), dependency injection (§20), and automatic OpenAPI schema generation (§23) — meaning nearly everything FastAPI does at the wire/routing level *is* Starlette underneath, and understanding a FastAPI-specific error or behavior often means recognizing which layer (Starlette's ASGI mechanics vs. FastAPI's validation/DI additions) actually produced it.

### 16.6 Python Mechanism: Uvicorn Is the Server That Actually Runs the Event Loop

**Uvicorn** is an ASGI server — the actual program that binds a port, accepts TCP connections, parses HTTP, and drives the event loop that runs your ASGI application (FastAPI/Starlette) inside it. Uvicorn itself is commonly built on `uvloop` (a faster, C-based replacement for asyncio's default event loop implementation) — a detail invisible to application code (since it only ever interacts with the standard `asyncio` API, §12) but directly responsible for a meaningful fraction of the raw throughput difference between a naive pure-Python async server and a production-grade one.

### 16.7 Implementation

```python
# A minimal ASGI application, written by hand -- no framework at all --
# to make the raw contract from §16.3 concrete before FastAPI hides it.

async def app(scope, receive, send):
    assert scope["type"] == "http"          # ASGI also defines "websocket"
                                              # and "lifespan" scope types (§17)
    await receive()                          # receives the incoming request
                                               # event (headers/body chunks)

    await send({
        "type": "http.response.start",
        "status": 200,
        "headers": [(b"content-type", b"text/plain")],
    })
    await send({
        "type": "http.response.body",
        "body": b"Hello from a hand-written ASGI app",
    })

# Run with: uvicorn this_module:app
```

`scope` is a dict describing the incoming connection (method, path, headers); `receive` is an awaitable callable for pulling incoming request events; `send` is an awaitable callable for pushing outgoing response events — this three-argument signature *is* the entire ASGI contract from §16.3, and it is exactly what FastAPI/Starlette implement underneath their much richer, higher-level `@app.get(...)` decorator syntax. Running this file with `uvicorn this_module:app` demonstrates that Uvicorn (§16.6) doesn't care that this isn't "real" FastAPI — it only needs an object matching this signature.

### 16.8 Production Considerations

Uvicorn is commonly run with multiple **worker processes** (`uvicorn app:app --workers 4`) specifically because a single Uvicorn process, like any Python process, is still bound by the GIL (§9.3) for any CPU-bound work that sneaks into request handling — multiple worker processes provide the same genuine-parallelism benefit multiprocessing (§10) provides generally, at the same serialization-adjacent cost (each worker is a fully separate process with no shared memory, so in-process caches or in-memory state are *not* shared across workers, a common, surprising production gotcha for anyone expecting a single logical "the application's memory"). Behind a load balancer or reverse proxy (companion §28), Uvicorn is typically run without its own TLS termination, letting the proxy handle TLS and forward plain HTTP internally — a standard, deliberate separation of concerns matching the companion handbook's reverse-proxy architecture.

### 16.9 Debugging

**Symptoms:** An in-memory cache or counter that should be shared across all requests behaves inconsistently — sometimes reflecting recent updates, sometimes not, seemingly at random depending on which request hits it. **Investigation:** Check whether the application is running with multiple Uvicorn worker processes (`--workers > 1`), and whether the "shared" state is actually a plain Python object living in one process's memory. **Root cause:** Each worker process (§16.8) has its own separate memory space (§9.2) — in-process state is only shared *within* one worker, not across all of them, so a request hitting worker 2 never sees a mutation made by a request that hit worker 1. **Fix:** Move genuinely shared state to an actual shared store (Redis, companion §35; the database, companion §24) rather than in-process memory, whenever multiple workers are in play.

### 16.10 Interview Thinking

"What's the difference between FastAPI, Starlette, ASGI, and Uvicorn?" is testing whether you can cleanly separate contract (ASGI, §16.3) from toolkit (Starlette, §16.5) from framework additions (FastAPI, §16.5) from server (Uvicorn, §16.6) — a strong answer states each layer's specific responsibility rather than treating all four names as roughly synonymous "the web stuff."

### 16.11 Mini Lab

Run §16.7's hand-written ASGI app directly with Uvicorn and confirm it serves a real HTTP response in a browser or via `curl`. Then write a second, near-identical hand-written ASGI app that returns different content based on `scope["path"]`, implementing minimal routing yourself — directly experiencing, in miniature, the exact problem Starlette's routing layer (and FastAPI's `@app.get("/path")` decorator, built on top of it) exists to solve for you.

---
