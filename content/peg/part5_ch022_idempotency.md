## §22. Idempotency and Why Retries Duplicate Work

### 1. The Vocabulary

- **Idempotent operation** — doing it once or many times has the same end result.
- **Idempotency key** — a client-generated unique identifier sent with a request, letting the
  server recognize "I've already processed this exact request" and return the original result
  instead of doing it again.
- **At-least-once delivery** — a common guarantee (network retries, queue redelivery) meaning a
  request or message might arrive more than once — the reason idempotency matters at all.

### 2. Where It Sits, and Why Teams Use It

Networks are unreliable: a client can time out waiting for a response even though the server
successfully processed the request, and the client's only reasonable move is to retry. Without
idempotency, that retry creates a second charge, a second order, or a second email.

### 3. What Actually Breaks

- **A "create" endpoint with no idempotency key** — a slow response causes a client (or an
  automatic retry layer) to resend the same POST, and now there are two identical orders/records
  instead of one.
- **Idempotency key stored without an expiry or scope** — a key that never expires can eventually
  collide across unrelated legitimate requests; a key that's global instead of scoped to a
  specific customer/action can incorrectly dedupe two different customers' genuinely separate
  requests.
- **Treating idempotency as "just check if it already exists"** — a naive existence check has a
  race condition if two retries arrive close together; a real idempotency key implementation
  needs a proper atomic check-and-store (often a unique constraint in the database).
- **Assuming GET/PUT/DELETE are automatically safe without verifying the implementation actually
  is** — the HTTP spec says they should be idempotent, but a `PUT` that appends to a list instead
  of replacing it, or a `DELETE` that errors on a second call instead of silently succeeding, both
  violate that in practice.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Any endpoint that creates something expensive, billable, or irreversible needs an idempotency
  key, because retries are a normal, expected part of how networks behave."
- "An idempotency key needs a proper atomic uniqueness guarantee behind it, usually a database
  constraint, not just a check-then-insert."
- "I verify that my own PUT/DELETE endpoints actually behave idempotently, not just assume it
  because the HTTP method implies it."

### 5. Interview-Ready Answer

> "Idempotency matters because retries are unavoidable — a client can time out even after the
> server successfully processed the request, and the only safe client behavior is to retry. For
> any operation that creates something or has a side effect, I'd have the client send an
> idempotency key, and the server would store it with a uniqueness constraint so a retried request
> returns the original result instead of creating a duplicate."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §23 (OpenAPI Generation & API Contracts) chapter;
companion Software Systems Handbook's §52 (Reliability Engineering Deep Dive) chapter
(at-least-once vs exactly-once semantics).

---
