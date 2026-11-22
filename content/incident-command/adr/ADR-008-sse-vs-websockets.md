# ADR-008 — SSE vs WebSockets for Streaming

## Status
Proposed

## Context
Chat responses must stream token-by-token to the browser through Spring Boot (see [07-system-architecture](../07-system-architecture.md), Q4 in [20-open-questions-and-risks](../20-open-questions-and-risks.md)).

## Problem
Server-Sent Events (SSE) and WebSockets both support server-to-client streaming; which fits this system's actual traffic shape?

## Options considered
- **SSE** — one-directional (server-to-client) streaming over plain HTTP; simpler to proxy through Spring Boot, works with standard HTTP infrastructure, sufficient because the client only ever needs to *receive* a stream (the user's own message is a normal request, not part of the stream).
- **WebSockets** — bidirectional, persistent connection; more capability than this system currently needs, more complexity in Spring Boot (connection lifecycle management) and in proxying to the Python engine's own stream.

## Decision
SSE, proposed as default, pending implementation-time confirmation that no bidirectional requirement exists (e.g., mid-stream cancellation from the client is achievable via a separate HTTP call, not requiring a persistent bidirectional channel).

## Rationale
The system's actual requirement is server → client token streaming; nothing in [01-pdd](../01-pdd.md)'s user journeys requires bidirectional push (e.g., no server-initiated notifications independent of a request). SSE is simpler to reason about through the Spring Boot proxy layer.

## Tradeoffs
If a future feature needs true bidirectional push (e.g., live collaboration, server-initiated events unrelated to an active request), this decision would need revisiting.

## Consequences
[07-system-architecture](../07-system-architecture.md) assumes SSE-shaped proxying (Spring Boot relays a stream it isn't required to interpret token-by-token).

## Reconsideration conditions
Revisit if a bidirectional/server-push requirement emerges that SSE genuinely can't satisfy.
