# ADR-013 — Observability Stack

## Status
Proposed

## Context
Distributed tracing across three languages/frameworks (React, Spring Boot, Python) is required to substantiate any latency/cost/hotspot claim. See [13-observability](../13-observability.md).

## Problem
What instrumentation standard provides one coherent trace across React, Spring Boot, and the Python engine, plus metrics and logs?

## Options considered
- **OpenTelemetry** — vendor-neutral standard with SDKs for JS/TS, Java, and Python; the only realistic way to get trace-context propagation across three different language runtimes without hand-rolling correlation IDs everywhere.
- **Hand-rolled trace-ID propagation + language-specific logging** — cheaper to start but reinvents context propagation, span structure, and export format that OpenTelemetry already standardizes; would make the eventual "UI visualizes a real trace" feature ([01-pdd](../01-pdd.md)) harder to build generically.
- **Vendor-specific APM (e.g., a commercial tool's proprietary agent)** — adds a cost/vendor dependency not justified for a POC; OpenTelemetry can export to a local/open-source backend instead.

## Decision
OpenTelemetry across all three services, exporting to a self-hosted/local backend (e.g., Jaeger or an OTel-compatible collector) for the local-dev phase; structured JSON logs correlated by the same trace ID.

## Rationale
OpenTelemetry is the only option that doesn't require reinventing cross-language trace propagation, and it's explicitly named in the source brief (§16).

## Tradeoffs
Instrumentation overhead in every service — spans must be deliberately emitted at each stage (see the span list in [13-observability](../13-observability.md)), which is real implementation work, not automatic.

## Consequences
Per [03-scope-and-roadmap](../03-scope-and-roadmap.md), basic span emission and trace propagation should start at Level 2 (as soon as cross-service calls exist), not be deferred to Level 6's dashboard work.

## Reconsideration conditions
Choice of backend (Jaeger vs. another OTel-compatible collector) is an implementation-time detail, not worth a separate ADR unless a real tradeoff surfaces (e.g., moving to AWS X-Ray/CloudWatch at Level 8).
