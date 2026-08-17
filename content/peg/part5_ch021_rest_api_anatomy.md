## §21. REST API Anatomy: Routes, Validation, Pagination, Response Shapes

### 1. The Vocabulary

- **Endpoint/route** — a specific URL pattern plus method (`GET /users/{id}`).
- **Request validation** — checking incoming data's shape/types/constraints before acting on it.
- **Response model** — the defined shape of what an endpoint returns, ideally consistent across
  the API.
- **Offset pagination** — `?limit=20&offset=40`, simple but can skip/duplicate rows if data
  changes between pages.
- **Cursor (keyset) pagination** — `?after=<last_seen_id>`, stable even while data is being
  written concurrently.
- **Error response shape** — a consistent structure (`{"error": {"code": ..., "message": ...}}`)
  across every endpoint, not a different shape per failure.

### 2. Where It Sits, and Why Teams Use It

This is the actual contract between frontend and backend, or between your service and every
external consumer. Consistency here — in validation strictness, pagination style, and error
shape — is what separates an API that's pleasant to build against from one where every endpoint
needs its own special-case handling.

### 3. What Actually Breaks

- **Offset pagination under concurrent writes** — if a row is inserted or deleted between two page
  requests, offset pagination can skip a row or return a duplicate; cursor pagination doesn't have
  this problem because it anchors to a specific value, not a position.
- **Inconsistent error shapes across endpoints** — one endpoint returns `{"error": "..."}`, another
  returns `{"message": "..."}`, another returns a bare string — every client now needs
  endpoint-specific error handling.
- **Validating on the frontend only** — client-side validation is a UX nicety, not a security or
  data-integrity boundary; the backend has to validate independently because any client can be
  bypassed.
- **No pagination at all on a list endpoint** — works fine in testing with 10 rows, becomes a
  multi-second, multi-megabyte response the moment production data grows.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I validate on the backend regardless of what the frontend does, because the backend is the
  actual trust boundary."
- "For anything that needs to stay stable under concurrent writes, I'd reach for cursor
  pagination over offset pagination."
- "Every endpoint in an API should return errors in the same shape, so clients can handle errors
  generically instead of per-endpoint."

### 5. Interview-Ready Answer

> "A well-designed REST API is consistent more than it is clever — the same error shape, the same
> pagination style, and validation that happens on the server regardless of what the client
> already checked. For pagination specifically, I default to cursor-based over offset-based
> whenever the underlying data is written to concurrently, since offset pagination can silently
> skip or duplicate rows as data shifts underneath it."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §16 (ASGI, Starlette & Uvicorn) and companion
Python Backend Engineering Handbook's §23 (OpenAPI Generation & API Contracts) chapters; companion
Software Systems Handbook's §29 (API Design Deep Dive: REST/RPC/gRPC/GraphQL, idempotency)
chapter.

---
