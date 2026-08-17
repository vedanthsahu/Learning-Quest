## §2. HTTP Methods, Status Codes, and Headers in Practice

### 1. The Vocabulary

- **GET/POST/PUT/PATCH/DELETE** — the standard HTTP methods: read, create, replace, partially
  update, remove.
- **Query param** — part of the URL after `?` (`?page=2`); **path param** — part of the URL
  structure itself (`/users/42`); **request body** — the payload, usually JSON, sent with POST/
  PUT/PATCH.
- **Idempotent** — calling it once or a hundred times has the same effect (GET, PUT, DELETE are
  supposed to be; POST is not).
- **Headers** — metadata sent alongside a request/response: `Authorization`, `Content-Type`,
  `Accept`, `Origin`, `Cookie`, `Cache-Control`.

### 2. Where It Sits, and Why Teams Use It

Status codes and methods are the contract every HTTP client and server agree on before either
side even reads the body. Getting them right (or wrong) is often the *first* thing a reviewer or
interviewer notices about API design, because it signals whether you actually understand the
protocol or are just moving JSON around.

### 3. What Actually Breaks

- **POST used for something that should be idempotent** — a double-click or a client retry
  creates two records instead of one, because POST carries no idempotency guarantee by default
  (see §22 for the real fix: idempotency keys).
- **Wrong status code choice** — returning `200` with `{"error": "..."}` in the body instead of an
  actual `4xx`/`5xx` breaks every client and monitoring tool that keys off status codes.
- **`401` vs `403` used interchangeably** — one means "we don't know who you are," the other means
  "we know who you are and you're not allowed" — mixing them up actively confuses debugging (see
  §104 for the full incident writeup).
- **`429` (rate limited) with no `Retry-After` header** — the client has no idea how long to back
  off, so it either hammers the API immediately or waits arbitrarily too long.
- **Putting sensitive data in query params** — query strings get logged by proxies, browsers,
  and analytics tools far more often than request bodies do.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "GET, PUT, and DELETE are supposed to be idempotent; POST is not — that's why I'd add an
  idempotency key to a POST that creates something expensive or irreversible."
- "401 means unauthenticated, 403 means unauthorized — I always check which one an API is
  actually returning before assuming it's a bug."
- "I put identifiers in the path, filters/pagination in query params, and payload in the body —
  not because it's arbitrary, but because that's what caching, logging, and REST tooling expect."

### 5. Interview-Ready Answer

> "I think of status codes in five bands: 2xx succeeded, 3xx redirect elsewhere, 4xx the client
> did something wrong, 5xx the server did. Within 4xx, I'm careful about 401 vs 403 specifically
> because they mean different things for debugging — no identity vs. no permission. For methods,
> I default to using them the way the protocol expects: GET never changes state, POST creates and
> isn't idempotent unless I explicitly add an idempotency key, and PUT/DELETE are safe to retry."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §16 (ASGI, Starlette & Uvicorn) and companion
Python Backend Engineering Handbook's §23 (OpenAPI Generation & API Contracts) chapters; companion
Software Systems Handbook's §29 (API Design Deep Dive: REST/RPC/gRPC/GraphQL, idempotency) covers
REST maturity levels and versioning in full.

---
