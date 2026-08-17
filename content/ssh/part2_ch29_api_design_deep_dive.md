## 29. API Design Deep Dive: REST Maturity, RPC/gRPC, GraphQL, Versioning, Pagination, Idempotency

### 29.1 What This Chapter Adds to §4

§4 established why APIs exist as contracts. This chapter covers the actual mechanisms for shaping those contracts well: the maturity spectrum of REST, the alternative RPC and GraphQL models, concrete versioning strategies, pagination mechanics, and — most consequentially for correctness — idempotency keys.

### 29.2 The Richardson Maturity Model: What "RESTful" Actually Measures

"REST" is used loosely in industry to mean "an HTTP API," but the term originally described a specific set of architectural constraints, and the **Richardson Maturity Model** gives a concrete way to measure how much of that original intent an API actually follows:

- **Level 0**: a single endpoint, HTTP used merely as a transport for arbitrary RPC-style calls (e.g., everything POSTed to `/api`).
- **Level 1**: distinct **resources** get distinct URIs (`/users/123`, `/orders/456`), but HTTP methods aren't used meaningfully (everything might still be POST).
- **Level 2**: HTTP methods are used according to their actual semantics — `GET` for safe, repeatable reads, `POST` for creation, `PUT`/`PATCH` for updates, `DELETE` for removal — and HTTP status codes convey real outcome information. This is what most production APIs called "REST" actually achieve, and for the overwhelming majority of use cases, it's the right amount of rigor.
- **Level 3 (HATEOAS)**: responses include links describing what actions are available next, so a client can navigate the API's possible actions dynamically rather than hard-coding URI structure. This level is rarely implemented in practice because the added client complexity is often not worth the flexibility gained — worth knowing the term exists, and worth being deliberate about the fact that most APIs correctly stop at Level 2 rather than treating Level 3 as an unmet obligation.

### 29.3 Why GET Must Be Safe and Idempotent, and Why That Matters Beyond Style

HTTP's method semantics are not stylistic conventions — they are promises that infrastructure between client and server (caches, proxies, retry logic, browsers) relies on. `GET` is defined as **safe** (causes no side effects) and **idempotent** (repeating it produces the same result as doing it once), which is exactly why browsers, CDNs, and HTTP caches feel free to retry or cache `GET` requests automatically. Violating this — implementing a `GET` endpoint that deletes a resource, for instance — means any component that treats `GET` according to its documented contract (a prefetching browser, a retry-on-timeout HTTP client) can trigger the side effect unexpectedly. This is a direct, concrete instance of §4.3's abstract point about contracts: a method verb *is* a contract, and violating its documented meaning breaks every piece of infrastructure that correctly trusted it.

### 29.4 RPC and gRPC: Optimizing for Internal, Contract-First Communication

Where REST models an API as a set of resources manipulated via standard verbs, **RPC (Remote Procedure Call)** models it as a set of named functions a client can invoke directly — closer to a network-transparent function call. **gRPC**, a widely-used modern RPC framework, defines service contracts explicitly in a schema (protocol buffers), generates strongly-typed client and server code from that schema in multiple languages, and communicates over HTTP/2 (§27.4), gaining multiplexing efficiency for free. The tradeoff versus REST: gRPC's explicit, generated-code contract catches many mismatches at compile time rather than at runtime, and its binary serialization is typically faster and smaller than JSON — at the cost of being less human-readable/debuggable from a browser or simple HTTP tool, and requiring a code-generation step in the development workflow. gRPC is generally favored for internal service-to-service communication (§12) where both ends are controlled and the tooling investment pays off; REST/JSON remains dominant for public-facing APIs where broad client compatibility and human debuggability matter more.

### 29.5 GraphQL: Letting the Client Decide the Query Shape

A recurring problem with REST resource endpoints: a client often needs data spanning multiple resources (a user, their recent orders, and each order's line items), which either requires multiple round trips (one per resource) or a bespoke, over-fetching endpoint built specifically for that one client's needs. **GraphQL** addresses this by exposing a single endpoint backed by a typed schema describing all available data and relationships, and letting each client specify exactly which fields and relationships it wants in one request. The direct benefit: no more round-trip multiplication or over-fetching for varied client needs. The direct cost: the server must now handle arbitrary, client-determined query shapes, which introduces new failure modes with no REST analogue — a poorly-designed nested query can trigger an enormous number of underlying database calls (an "N+1" problem, §33, at the API layer), requiring dedicated query complexity analysis and depth-limiting the REST world doesn't need to worry about at all.

### 29.6 Versioning Strategies: Concrete Mechanisms for §4.3's Contract Evolution

Given that a contract will need to evolve, several concrete mechanisms exist to do so without breaking existing callers, each with real tradeoffs:

- **URI versioning** (`/v1/users`, `/v2/users`): simple and visible, but requires maintaining fully separate route implementations, and it's easy to end up with many parallel versions accumulating maintenance cost.
- **Header versioning** (a custom header or `Accept` media-type parameter specifying the version): keeps URIs stable, but is less discoverable and easier for callers to forget to set explicitly.
- **Additive-only evolution**: the discipline of only ever adding new, optional fields and never removing or repurposing existing ones, so old clients simply ignore fields they don't recognize and never break — this avoids formal versioning for a large class of changes, but cannot accommodate genuinely breaking changes (removing a field, changing a type) when they're truly unavoidable.

In practice, mature APIs combine additive-only evolution as the default path, reserving formal versioning (URI or header-based) for the comparatively rare genuinely breaking change.

### 29.7 Pagination: Why "Just Return Everything" and "Just Use OFFSET" Both Fail at Scale

Returning an entire dataset in one response works until the dataset grows past a size that's reasonable to transfer and render in one response — necessitating pagination. The naive mechanism, `OFFSET`/`LIMIT` (skip N rows, return the next M), has a real performance flaw at scale: the database typically still has to scan and discard the first N rows to find row N+1, making later pages progressively more expensive to retrieve as the offset grows. **Cursor-based (keyset) pagination** — where each page's request includes a reference to the last item seen (e.g., "give me items with an ID greater than X"), rather than a raw numeric offset — avoids this scan entirely, since it translates directly into an indexed range lookup regardless of how deep into the dataset the cursor points. Cursor-based pagination has a secondary correctness benefit: it is stable under concurrent inserts/deletes, whereas offset-based pagination can skip or duplicate items if the underlying data changes between page requests.

### 29.8 Idempotency Keys: The Concrete Mechanism Behind §3.2's Retry Warning

§3.2 and §11.1 warned that retrying a network call can duplicate its effect if the original request actually succeeded but its response was lost. **Idempotency keys** are the concrete mechanism for making retries of non-idempotent operations (like "charge this card") safe: the client generates a unique key for a given logical operation and includes it with the request; the server records, against that key, whichever result it produced the first time it saw that key, and if the same key arrives again (a retry), the server returns the already-recorded result instead of performing the operation a second time.

```
First request:  POST /charge  Idempotency-Key: abc123
                -> server processes charge, stores result against "abc123"
                -> returns success

Network blip; client doesn't see the response; retries:
Second request: POST /charge  Idempotency-Key: abc123
                -> server sees "abc123" already has a recorded result
                -> returns the SAME recorded result, without charging again
```

This mechanism is what makes "just retry on timeout" a genuinely safe policy for otherwise non-idempotent operations, and its absence is one of the most common real-world causes of duplicate-charge and duplicate-side-effect incidents.

### 29.9 Common Mistakes and Production Debugging Signals

- Implementing a `GET` endpoint with side effects (§29.3), causing intermittent, hard-to-reproduce unwanted side effects triggered by prefetching or caching infrastructure the team never anticipated.
- Using offset-based pagination on a large, frequently-changing dataset, producing user-visible duplicate or missing items across pages, and increasingly slow later-page load times as the dataset grows (§29.7).
- Adding retry logic to a client calling a non-idempotent endpoint with no idempotency key support on the server, producing duplicate side effects under exactly the transient network conditions retries were meant to handle gracefully (§29.8).

### 29.10 Engineering Intuition

> **How do I know my API's versioning strategy is inadequate?** If shipping a backward-compatible feature routinely requires bumping a version and coordinating every client's upgrade, your default evolution path (§29.6) is stricter than it needs to be.
>
> **What symptoms indicate a pagination problem?** Later pages of a list noticeably slower than earlier ones (offset-scan cost, §29.7); user reports of items appearing twice or vanishing when paging through a frequently-changing list.
>
> **What metrics indicate an idempotency gap?** A nonzero rate of exact-duplicate transactions or side effects correlated with client-side retry/timeout events in logs.
>
> **What breaks first if these are ignored?** Duplicate financial transactions or side effects from safe-looking retry logic (§29.8) — often the single most costly and reputation-damaging class of bug this chapter addresses.
>
> **When is REST Level 2 (§29.2) genuinely sufficient, without reaching for GraphQL or gRPC?** Whenever clients' data needs are relatively uniform and round-trip counts aren't a measured problem — GraphQL's added server-side complexity (§29.5) is a cost paid specifically to solve a client-diversity problem that doesn't exist for every API.
>
> **What would a hyperscale company do?** Enforce idempotency keys and additive-only evolution as a mandatory platform-level policy, use cursor-based pagination universally for large collections, and choose gRPC or GraphQL deliberately per API based on whether internal-uniform or external-diverse client needs dominate (§60).
>
> **What would a two-person startup do?** Build a straightforward REST Level 2 API with URI versioning reserved for rare breaking changes, add idempotency keys only to their payment-adjacent endpoints specifically, and defer cursor-based pagination until a list actually grows large enough to need it.
>
> **What changes with scale?** At low data volume and request rate, offset pagination and looser idempotency handling are invisible. At scale, offset pagination's cost curve and the absolute financial exposure of unhandled duplicate operations both grow to the point where the more rigorous mechanisms in this chapter become necessary, not optional.

### 29.11 Exercises

1. Identify an endpoint you know that performs a side-effecting operation (create, charge, delete). Design an idempotency-key scheme for it following §29.8's mechanism, and specify exactly what the server should store and for how long.
2. A list endpoint using `OFFSET`/`LIMIT` pagination is reported to sometimes show the same item on two different pages. Using §29.7, explain the precise mechanism that causes this and how cursor-based pagination would prevent it.

### 29.12 Further Reading

- Leonard Richardson & Sam Ruby, *RESTful Web APIs* — the source of the maturity model in §29.2.
- Stripe API Documentation, "Idempotent Requests" — a widely-cited, production-grade real-world implementation of the idempotency-key pattern in §29.8.

---
