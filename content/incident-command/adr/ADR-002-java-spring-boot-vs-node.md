# ADR-002 — Java/Spring Boot vs Node.js for the Application Backend

## Status
Proposed

## Context
The application backend owns authentication, RBAC, conversations, and the API surface for the frontend. See [07-system-architecture](../07-system-architecture.md).

## Problem
Which language/framework for the application backend, given Python is already a strength and is being reserved for the AI runtime?

## Options considered
- **Java + Spring Boot + Spring Security** — explicitly named as the learning-goal stack (source brief §5).
- **Node.js/TypeScript backend** — would let the frontend and backend share a language; explicitly ruled out in the source brief (§24) absent a concrete requirement (BFF, heavy WebSocket workload, API aggregation) that doesn't currently exist.
- **Python (a second Python service)** — would collapse the Java learning goal entirely and blur the app/AI-runtime boundary (see [07-system-architecture](../07-system-architecture.md)).

## Decision
Java + Spring Boot + Spring Security.

## Rationale
Explicit learning goal: enterprise backend patterns (transactions, validation, connection pooling, Spring Security) that Python and Node don't force the same way. Node is explicitly deferred per source brief §24 — no BFF/WebSocket-heavy/TS-backend requirement exists yet to justify it over Spring Boot.

## Tradeoffs
Two-language backend (Java app layer + Python AI layer) adds real integration surface — service-to-service auth, an extra network hop, two sets of dependency/build tooling — vs. a single-language backend. Accepted deliberately; see [06-learning-and-technology-map](../06-learning-and-technology-map.md) and Risk R2 in [20-open-questions-and-risks](../20-open-questions-and-risks.md).

## Consequences
Service boundary rules in [07-system-architecture](../07-system-architecture.md) must be actively maintained — Python must not accrete application-backend responsibilities over time, or the two-language split stops paying for itself.

## Reconsideration conditions
If a concrete requirement for Node emerges (e.g., a BFF proves necessary, or WebSocket-heavy real-time needs outgrow what Spring Boot comfortably provides), open a new ADR justifying Node specifically against that requirement rather than retrofitting this one.
