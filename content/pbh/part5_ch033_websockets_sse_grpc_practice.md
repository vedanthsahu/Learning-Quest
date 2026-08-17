## 33. WebSockets, SSE & gRPC in Practice

### 33.1 The Problem: §22 Introduced the Mechanisms; Real Deployments Raise Different Questions

§22.5-22.6 established WebSockets and SSE as ASGI-level mechanisms and when to choose between them. This chapter addresses what changes once these connections need to work across multiple server instances (not just one FastAPI process) and introduces gRPC — a genuinely different integration protocol suited to service-to-service (not browser-to-server) communication, which neither §22 nor §32 covered.

### 33.2 Engineering Constraint: A WebSocket Connection Is Pinned to the Specific Process That Accepted It

Once a client's WebSocket connection is accepted by one specific server process (or worker, §16.8), that connection lives entirely within that process's memory — there is no built-in mechanism for a *different* process to push a message to that same client's connection. This directly reintroduces §16.9's shared-state problem in its most consequential form: a chat message sent by a user connected to worker A must somehow reach another user connected to worker B, and the two workers share no memory at all.

### 33.3 Decision Framework: A Pub/Sub Backplane Bridges Independent WebSocket-Holding Processes

The standard solution is a shared, external **pub/sub** mechanism (Redis pub/sub, companion §35.6, or a message broker, companion §36) acting as a backplane: when worker A needs to deliver a message to a client connected on worker B, it publishes the message to a shared channel rather than trying to reach worker B directly; every worker subscribes to the relevant channels and forwards any message concerning one of *its own* locally-held connections out over that specific WebSocket. This pattern is precisely why a WebSocket-heavy service's architecture almost always includes Redis (or an equivalent) even when the application has no other obvious caching need — the pub/sub backplane, not caching, is the actual reason it's there.

### 33.4 Tradeoff: Connection-Aware Load Balancing (Sticky Sessions) vs. a Stateless Backplane

An alternative (or complementary) approach uses **sticky sessions** (companion §28's load-balancer concept, applied to WebSockets specifically) — the load balancer ensures a given client's WebSocket connection and any of its future requests are routed to the *same* backend instance consistently, reducing the cross-instance-messaging problem's scope. This helps but doesn't eliminate the need for a backplane (§33.3) entirely, since two *different* clients needing to communicate with each other, even with perfect sticky routing for each individually, may still land on different instances — the backplane remains necessary for genuine cross-client messaging regardless of how well any single client's own connection affinity is managed.

### 33.5 Python Mechanism: gRPC — a Different Protocol for a Different Problem (Service-to-Service, Not Browser-to-Server)

**gRPC** uses HTTP/2 and Protocol Buffers (a compact, strongly-typed binary serialization format, contrasted with JSON's human-readable but larger and more parsing-expensive text format) to define strongly-typed RPC (Remote Procedure Call) contracts between services — the calling code invokes what looks like an ordinary Python method, and gRPC handles the network call, serialization, and deserialization transparently. This is suited specifically to internal, service-to-service communication where both sides are backend services you control (and can therefore agree on and regenerate a shared `.proto` contract from), not for a browser-facing API, where JSON/REST (companion §29) or GraphQL remain the practical, universally-supported choice given every browser's native `fetch`/JSON support and gRPC's comparatively limited direct browser support.

### 33.6 Decision Framework: REST/JSON vs. gRPC for Internal Service-to-Service Calls

For internal calls between your own backend services, gRPC's strongly-typed contract (generated client/server code from a single `.proto` definition, eliminating an entire class of "the two services silently disagree about a field's name or type" bugs) and Protocol Buffers' more compact wire format are genuine advantages over REST/JSON at meaningfully high internal call volumes or when contract precision across many internal services matters enough to justify the additional tooling. For lower-volume internal calls, or when the calling and receiving teams value REST/JSON's universal tooling and human-readability (every engineer can `curl` a REST endpoint and read the response; doing the equivalent for gRPC requires gRPC-specific tooling), REST/JSON remains a perfectly legitimate, simpler choice — this is a genuine tradeoff, not an obligation to adopt gRPC universally for internal traffic.

### 33.7 Implementation

```python
import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()
redis_client = redis.Redis(host="localhost")

# Each worker process maintains its OWN local map of connections it's
# personally holding -- this is exactly §33.2's constraint made concrete.
local_connections: dict[str, WebSocket] = {}

@app.websocket("/ws/chat/{user_id}")
async def chat_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    local_connections[user_id] = websocket
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"user-channel:{user_id}")   # this worker listens
                                                          # for messages meant
                                                          # for ITS connections
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"].decode())
    except WebSocketDisconnect:
        del local_connections[user_id]
        await pubsub.unsubscribe(f"user-channel:{user_id}")


async def send_message_to_user(target_user_id: str, text: str) -> None:
    # Called from ANY worker, regardless of which one actually holds the
    # target user's WebSocket connection (§33.3) -- publish, don't reach
    # across process boundaries directly (which is impossible anyway).
    await redis_client.publish(f"user-channel:{target_user_id}", text)
```

`send_message_to_user` can be called from any worker process handling any request — it never needs to know or check which specific worker actually holds `target_user_id`'s live WebSocket connection, because it publishes to a shared Redis channel rather than attempting a direct, impossible cross-process delivery. Whichever worker actually holds that user's connection is subscribed to exactly that channel (via `chat_endpoint`'s own `pubsub.subscribe` call) and forwards the message out over its own local WebSocket the moment it arrives — the Redis pub/sub layer is precisely the backplane §33.3 describes, implemented concretely.

### 33.8 Production Considerations

A pub/sub backplane (§33.3) introduces Redis (or an equivalent broker) as a new critical dependency for real-time features specifically — its own availability and latency now directly bound the real-time messaging feature's reliability, meaning the same production discipline (companion §35's Redis-specific chapter, health checks, companion §66) applies to it as to any other genuine dependency, not just an optional cache that degrades gracefully if briefly unavailable. For gRPC specifically, the `.proto` contract should be treated with the same versioning discipline as any REST API contract (companion §46) — a field removed or renamed in a `.proto` file is a breaking change for every service still generating client code from the old definition, and needs the same backward-compatible evolution discipline (adding new fields as optional, deprecating rather than immediately removing old ones) that any API contract requires.

### 33.9 Debugging

**Symptoms:** A chat or real-time notification feature works correctly in local development (a single process) but messages between two users are inconsistently delivered once deployed with multiple worker processes or replicas. **Investigation:** Check whether message delivery relies on in-process memory (a plain dict of connections, with no pub/sub backplane) or genuinely publishes through a shared mechanism reachable by every worker. **Root cause:** §33.2's constraint — a message meant for a connection held by a *different* worker process than the one currently handling the send request has nowhere to go without an explicit shared backplane. **Fix:** Introduce a pub/sub layer (§33.3, §33.7) so any worker can publish a message intended for any connection, regardless of which specific worker actually holds it.

### 33.10 Interview Thinking

"How would you scale a WebSocket-based chat feature across multiple server instances?" is testing whether you identify §33.2's cross-process constraint unprompted and propose a pub/sub backplane (§33.3) as the fix, rather than assuming WebSockets "just work" the same way across instances as ordinary stateless HTTP requests do — this is one of the most common gaps between a working single-instance prototype and a genuinely scalable real-time feature.

### 33.11 Mini Lab

Using two separate terminal instances running the *same* FastAPI application from §33.7 (simulating two worker processes, e.g., on two different ports pointed at the same Redis instance), connect one simulated user to each instance's WebSocket endpoint. Call `send_message_to_user` targeting the user connected to the *other* instance and confirm the message correctly arrives at that user's connection despite being sent from a process that never held that connection directly — directly observing the pub/sub backplane bridging the two independent processes.

---
