# ADR-003 — Python for the GenAI Engine

## Status
Proposed

## Context
The AI runtime (routing, model gateway, memory, retrieval, tools, grounding) needs a language. Python is the developer's strongest existing language.

## Problem
Should the AI runtime be built in Python (leveraging existing strength) or in Java/another language (to maximize learning stretch everywhere)?

## Options considered
- **Python** — strongest existing skill, and the language with the richest AI/ML ecosystem (model clients, embedding libraries, Milvus SDK).
- **Java for everything** — would maximize Java learning surface but forces reinventing AI-ecosystem tooling that's mature in Python, and removes any use of the developer's strongest language from the project entirely.

## Decision
Python, scoped strictly to the AI-runtime responsibilities in [09-ai-engine-architecture](../09-ai-engine-architecture.md) — not a second application backend.

## Rationale
Two things are both true and both matter: Python is the fastest path to a working, correct AI runtime (ecosystem maturity), and reserving it for the *runtime* (rather than the *application* layer) is what keeps the Java and React learning goals genuine. See [06-learning-and-technology-map](../06-learning-and-technology-map.md).

## Tradeoffs
Using the strong-skill language anywhere means less total learning stretch than an "everything is unfamiliar" approach would provide — accepted because the AI-runtime domain concepts (routing, grounding, evaluation methodology) are themselves a real learning target even in a familiar language, per [00-project-charter](../00-project-charter.md).

## Consequences
Boundary discipline is required — see [07-system-architecture](../07-system-architecture.md)'s explicit list of what the Python engine must not own (user/session records, OIDC validation, RBAC derivation).

## Reconsideration conditions
None anticipated.
