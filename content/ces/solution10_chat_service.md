## Project 10: Chat Service — Solution Guide

### Business Reasoning

The business need is real-time messaging that feels immediate while never losing a message. The core engineering challenge, distinct from every prior project in this series, is that a WebSocket connection is genuinely stateful and pinned to a specific server process — this single fact drives almost every non-trivial design decision here.

### Requirements Analysis

Horizontal scalability combined with real-time delivery creates the central problem: once there's more than one server instance, sender and recipient may be connected to different ones, and a message has to cross that instance boundary to be delivered in real time at all. The no-message-loss requirement additionally means real-time delivery can never be the *only* mechanism — durable persistence must happen regardless of whether real-time delivery succeeds.

### Architecture

```
Sender -> WebSocket (Instance A) -> [persist message durably] -> [publish to pub/sub channel: recipient_id]
Recipient's actual connection (could be Instance A, B, or C) subscribes to their own channel
  -> receives the published message -> pushes it down their WebSocket in real time
If recipient offline: message sits in durable store, delivered on next connect/history fetch
```

### Tradeoff Discussion

**Direct instance-to-instance communication vs. a shared pub/sub layer.** Instances could theoretically discover and talk to each other directly to relay messages, but this requires every instance to track which other instance holds which user's connection — a coordination problem that grows more complex as instance count grows. A shared pub/sub layer (Redis pub/sub, or a dedicated message broker) decouples instances from needing to know about each other at all — each instance only needs to know its own connected users and subscribe to their channels, letting the pub/sub layer handle the actual routing.

**Persist-then-deliver vs. deliver-then-persist.** Persisting a message before attempting real-time delivery guarantees durability regardless of delivery outcome — if the recipient is offline or the pub/sub publish fails, the message still exists. Attempting delivery first and persisting only on delivery failure is a subtle but real risk: a crash between "delivered" and "about to persist" loses the message's durable record even though it was technically delivered once, an unacceptable position for the no-message-loss requirement.

### Alternative Designs Considered and Rejected

**Sticky sessions routing both users to the same server instance for the duration of their conversation.** Rejected — this doesn't scale past a small number of instances (every possible pair of chatting users would need to be co-located, an increasingly constrained routing problem as user count grows) and provides no resilience if that specific instance goes down. **In-memory-only message storage, relying on the WebSocket connection itself as the sole record of a message.** Rejected outright — this is the challenge's second named trap: a server restart or connection drop would permanently lose any message that hadn't yet been read, a direct violation of the no-message-loss requirement.

### Chosen Design

WebSocket connections for real-time delivery; every message durably persisted to a message store *before* attempting real-time delivery, regardless of recipient online status; Redis pub/sub as the cross-instance routing layer, with each server instance subscribing to a channel per currently-connected user (or device) it holds a connection for.

### Implementation Walkthrough

```python
connected_clients: dict[str, list[WebSocket]] = {}   # per-instance-local: user_id -> this instance's sockets

@app.websocket("/ws/{user_id}")
async def chat_socket(websocket: WebSocket, user_id: str):
    await websocket.accept()
    connected_clients.setdefault(user_id, []).append(websocket)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"user:{user_id}")         # this instance listens for messages TO this user

    async def relay_from_pubsub():
        async for msg in pubsub.listen():
            if msg["type"] == "message":
                await websocket.send_text(msg["data"])

    relay_task = asyncio.create_task(relay_from_pubsub())
    try:
        while True:
            data = await websocket.receive_json()
            await send_message(sender_id=user_id, recipient_id=data["to"], body=data["body"])
    except WebSocketDisconnect:
        connected_clients[user_id].remove(websocket)
        relay_task.cancel()

async def send_message(sender_id: str, recipient_id: str, body: str) -> None:
    message = await db.insert_message(sender_id, recipient_id, body)   # PERSIST FIRST (durability)
    await redis_client.publish(f"user:{recipient_id}", message.to_json())  # THEN attempt real-time delivery
    # if recipient isn't connected anywhere, nothing is subscribed to this channel right now --
    # that's fine: the message is already durably stored and will be fetched on next connect.
```

`db.insert_message` runs before `redis_client.publish` — persistence is never contingent on real-time delivery succeeding, directly resolving the challenge's second named trap. Each server instance subscribes to a Redis channel per locally-connected user, so a message published to `user:{recipient_id}` reaches whichever instance (if any) actually holds that user's live connection, regardless of which instance handled the sender — directly resolving the cross-instance delivery problem named in the challenge's Level 1-2 hints.

### Production Improvements

For multi-device delivery, subscribe using a per-device channel suffix (`user:{user_id}:{device_id}`) or fan out the publish to every currently-registered device channel for that user, rather than a single per-user channel — addressing the challenge's third engineering question explicitly (deliver to all devices, not just the most recent). Add a sequence number per conversation, assigned at persistence time, so clients can detect and correct for any out-of-order arrival at the delivery layer even though the durable store's own ordering is authoritative.

### Scaling Path

Both the WebSocket-handling instances and the Redis pub/sub layer scale horizontally — instances scale by adding more, stateless-with-respect-to-each-other instances behind a load balancer with sticky-enough routing only for the *duration of a single connection* (not for pairing specific users together); Redis pub/sub itself can be scaled via Redis Cluster if channel volume grows large enough to warrant it.

### Interview Discussion

See Python Backend Engineering Handbook §95.4 for this exact system walked through the five-phase interview framework — the deep-dive phase for this question is, essentially without exception, the cross-instance delivery problem this solution's pub/sub design resolves.

### Lessons Learned

The core lesson is recognizing when a component (a WebSocket connection) breaks the usual stateless-request assumption most backend design otherwise relies on, and that this specific kind of statefulness requires an explicit cross-instance coordination mechanism rather than being solved by the same horizontal-scaling patterns that work for ordinary HTTP APIs. This exact pattern — pub/sub as the bridge between stateful, instance-pinned connections and a horizontally-scaled fleet — reappears in Project 12 (Metrics & Monitoring Platform)'s real-time dashboard updates.

---
