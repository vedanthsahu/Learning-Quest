## 98. API Architecture Catalog

### 98.1 What This Chapter Adds

§29 and §60 already covered REST maturity, gRPC, GraphQL, versioning, idempotency, rate limiting, and pagination in full mechanism-level depth — those are named here only for catalog completeness, with pointers back rather than repetition. What's genuinely new in this chapter is the full tradeoff space for *real-time, ongoing* client-server communication (a problem §3-4's request/response framing didn't need to address) and the specific pattern of webhook-based integration.

### 98.2 Previously Covered, Named for Catalog Completeness

**REST** (§4, §29.2-29.3), **GraphQL** (§29.5), **gRPC** (§29.4), **API versioning** (§29.6), **HATEOAS** (§29.2, Richardson Level 3), **idempotency** (§29.8, Part V §91.E), **rate limiting** (§60.2), **offset pagination** and **cursor/keyset pagination** (§29.7) — all fully derived elsewhere. The one addition worth stating explicitly here: **API Aggregation** is the general pattern name for what §96.4's Backend For Frontend does specifically per client type — a dedicated layer that calls multiple downstream services and composes their results into one response, reducing the number of round trips a caller must make (directly addressing the round-trip-multiplication problem §29.5 introduced GraphQL to solve, via a different, non-query-language mechanism: a purpose-built aggregation service instead of a client-driven query language).

### 98.3 The Real-Time Communication Problem

Ordinary request/response (§3.2, §4.4) assumes the client always initiates. Many real features — a chat application, a live sports score, a collaborative document — need the *server* to push new information to the client as it becomes available, without the client needing to ask again and again. Five distinct mechanisms have evolved to solve this, each a different point on the same latency-versus-resource-cost tradeoff line from §1.7, and recognizing which one fits a given requirement is a frequent, direct interview question.

```
Real-time communication mechanisms, ordered by increasing
"server push" capability and connection cost:

  Polling  --> Long Polling --> SSE --> WebSockets --> (Streaming
                                                          APIs, gRPC)
  (cheapest,     (better           (server->client   (full
   most stale)    latency,          one-way,          bidirectional,
                  more server        auto-reconnect,   lowest latency,
                  resource use)      simple)           highest cost
                                                        to operate)
```

**Polling** — the client repeatedly asks "anything new?" on a fixed interval. *Tradeoff*: trivially simple, but latency is bounded below by the poll interval, and most poll requests return "nothing new," wasting request volume — directly the same efficiency argument against unnecessary, unproductive round trips made throughout this handbook (§27.2-27.3).

**Long Polling** — the client asks "anything new?" and the server *holds the request open* (doesn't respond immediately) until new data actually arrives or a timeout elapses, at which point the client immediately re-polls. *Tradeoff*: meaningfully reduces both latency (data is pushed the moment it's available, not on the next fixed interval) and wasted "nothing new" round trips, at the cost of tying up a server-side connection/thread for the duration of each held-open request — directly reintroducing the thread-pool-capacity concern from §25.5 and Part V §91.B if not built on an async I/O model.

**Server-Sent Events (SSE)** — a single, long-lived HTTP connection over which the server can push a continuous stream of one-way (server-to-client only) events, using a simple, text-based protocol with automatic client-side reconnection built into the browser standard. *Tradeoff*: simpler to implement and operate than WebSockets (it's just HTTP, no protocol upgrade required) for the common case of server-to-client-only updates, but cannot carry client-to-server messages over the same connection — a genuine limitation, not a configuration choice, since SSE is architecturally one-directional.

**WebSockets** — a single, long-lived, full-duplex (bidirectional) connection, established via an initial HTTP handshake that upgrades to the WebSocket protocol. *Tradeoff*: the most capable and lowest-latency option, supporting genuine two-way, real-time interaction (chat, collaborative editing, gaming) — at the real operational cost of the server needing to maintain many concurrent, long-lived connections, directly reintroducing the C10K/C10M concerns from §25.5, and requiring a load-balancing strategy aware of long-lived connection affinity (§28.3) rather than simple, stateless per-request routing.

**Streaming APIs (gRPC streaming, HTTP/2-based)** — building on HTTP/2's multiplexing (§27.4), a single request can receive a continuous stream of responses (server streaming), send a continuous stream of requests (client streaming), or both simultaneously (bidirectional streaming) — the most structured, typed, and typically most efficient option, at the cost of gRPC's broader tooling and ecosystem tradeoffs already discussed in §29.4.

**Decision framework**: choose polling only for genuinely infrequent, latency-tolerant updates where implementation simplicity dominates. Choose long polling or SSE for server-to-client-only updates at moderate scale where full WebSocket infrastructure isn't yet justified. Choose WebSockets or gRPC streaming specifically when genuine, frequent, low-latency bidirectional communication is a real, stated requirement — not a default reached for because "real-time" sounds like it always means WebSockets.

### 98.4 Webhook Architecture

**Problem it answers**: a third-party integration needs to be notified when an event happens in your system, but that third party is not a service you operate and cannot subscribe to your internal message broker (§40, §97.2) directly. **Solution**: your system makes an outbound HTTP call to a URL the third party has registered in advance, whenever the relevant event occurs — inverting the ordinary client-server relationship (your system becomes the "client" for this one call, and the third party's endpoint becomes the "server"). **Tradeoffs and required safeguards**: because this is a real network call (§3.2), it inherits every reliability concern already covered — the receiving endpoint may be temporarily down (requiring retry with backoff, §64.5), may receive the same webhook more than once (requiring the receiver to implement the Idempotent Receiver pattern, §97.9), and the sender must authenticate the payload (commonly via a shared-secret signature) so the receiver can verify the webhook genuinely came from the claimed sender and wasn't forged — directly a concrete instance of the trust-boundary discipline from §17.3, applied to inbound, unsolicited HTTP calls specifically. **Real-world examples**: Stripe's webhook system (already cited for idempotency keys in §29.12) is widely regarded as a best-practice reference implementation, explicitly documenting signature verification and retry/idempotency guarantees for exactly the reasons just described.

### 98.5 Engineering Intuition

> **How do I know which real-time mechanism fits my requirement?** State explicitly whether the client needs to send data back over the same channel (ruling out SSE), how many concurrent long-lived connections you can operate (ruling out WebSockets at a scale your infrastructure isn't ready for), and how latency-sensitive the update actually needs to be (ruling out plain polling if sub-second freshness matters).
>
> **What symptoms indicate a webhook integration is missing standard safeguards?** Duplicate side effects on the receiving end (missing idempotency, §97.9), or an integration silently failing during the third party's brief downtime with no retry (missing backoff, §64.5).
>
> **What would over-engineering this catalog look like?** Building a full WebSocket infrastructure for a feature that only needs to notify a client of an update once every few minutes — long polling or even simple polling would serve the actual requirement at a fraction of the operational cost.

### 98.6 Exercises

1. A team is building a live "order status" indicator that updates a handful of times over an order's lifecycle (placed, shipped, delivered), with no need for the client to send anything back over the same channel. Using §98.3, recommend the most appropriate mechanism and justify why WebSockets would be unnecessary overhead here.
2. Design the minimum safeguards (per §98.4) a webhook receiver must implement to safely handle a webhook it might receive more than once, from a sender whose identity it cannot otherwise verify without an explicit mechanism.

---
