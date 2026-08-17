## Project 10: Chat Service

### Problem Statement

Users want to send each other real-time messages — one-to-one conversations, delivered instantly while both parties are online, and available to read later if one party wasn't. The business wants this to feel immediate, work correctly when a user has multiple devices open, and not lose messages if a user's connection drops momentarily.

### Functional Requirements

- Allow a user to send a message to another specific user.
- Deliver the message to the recipient immediately if they're currently online.
- Store the message so the recipient can see it later if they were offline when it was sent.
- Support a user being connected from more than one device at once, receiving messages on all of them.

### Non-Functional Requirements

- **Real-time delivery**: an online recipient should see a new message with minimal delay.
- **No message loss**: a message must not be lost due to a recipient's connection dropping at the wrong moment, or due to the server handling that connection restarting.
- **Horizontal scalability**: the service must be able to run as multiple server instances, with any two chatting users potentially connected to different instances.
- **Ordering**: messages within a single conversation should generally appear in the order they were sent.

### Project Scope

**In scope**: one-to-one real-time messaging, offline message persistence and later delivery, multi-device delivery, basic ordering. **Out of scope**: group chats, message editing/deletion, read receipts and typing indicators, end-to-end encryption.

### Engineering Questions (Answer Them Yourself First)

- If a real-time connection is inherently tied to one specific server process, what has to happen for a message from a user connected to server instance A to reach a recipient connected to server instance B?
- Is "the message was sent" and "the message was delivered to the recipient's screen" the same event? What has to be true for a message to survive the gap between those two moments if the recipient is offline?
- If a user has the app open on both their phone and their laptop, should a message go to whichever device sent it last, or to all of them?
- What could cause messages in the same conversation to arrive out of order, even if they were sent one after another?

### Architecture Thinking

Sketch what a persistent, real-time connection actually is at the server level — is it stateless like a typical HTTP request, or does it require the server to hold something open and specific to one user for an extended period? Consider what has to exist *outside* any single server instance for two users connected to different instances to exchange messages at all. Sketch the difference in handling between a message to an online recipient (delivered in real time) and a message to an offline recipient (must wait) — does your design treat these as fundamentally different paths, or can one mechanism cover both?

### Progressive Hint System

**Level 1**: Consider that a real-time connection, unlike a typical stateless API request, is pinned to one specific server instance for its entire duration — what does this imply when two chatting users are connected to different instances? **Level 2**: Research WebSocket connections specifically, and consider what "pinned to one instance" means for routing a message that needs to reach a specific user regardless of which instance they're connected to. **Level 3**: Research publish-subscribe systems (like Redis pub/sub) as a mechanism for broadcasting a message to whichever server instance actually holds a specific user's connection. **Level 4**: A standard design uses WebSocket connections for real-time delivery, persists every message to a durable message store regardless of the recipient's online status, and uses a shared pub/sub layer so that when a message arrives at the server instance handling the sender's connection, it's published to a channel the recipient's actual connected instance (whichever one that is) is subscribed to; an offline recipient's messages are simply read from the durable store when they next connect.

### Common Engineering Traps

- **Assuming sender and recipient are always connected to the same server instance** — what happens to message delivery the moment you have more than one instance and this assumption breaks?
- **Only storing a message in memory on the server handling the connection, not in durable storage** — what happens to that message if the server process restarts?
- **Delivering a message to only the most-recently-connected device for a multi-device user** — is this the behavior users would actually expect?
- **Assuming messages will always arrive at the server in the exact order they were sent** — under concurrent connections and network variability, is this a safe assumption, and what would you need to do if it isn't?

### Reflection Questions

- How would you test that your design correctly delivers a message when sender and recipient are connected to two different server instances, not just when they happen to share one during local testing?
- What should happen to a message sent to a user who closes their laptop mid-connection — is there a clear, bounded window in which reconnection recovers it seamlessly?
- If message ordering genuinely matters for this product, what would you need to add to guarantee it, given that messages might arrive at the server through different network paths?

### Completion Checklist

- [ ] I have a concrete mechanism for delivering a message across two different server instances.
- [ ] I have a durable persistence path that doesn't depend on any single server instance staying alive.
- [ ] I have decided how multi-device delivery works and can justify the choice.
- [ ] I have considered message ordering and whether my design needs an explicit mechanism to guarantee it.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
