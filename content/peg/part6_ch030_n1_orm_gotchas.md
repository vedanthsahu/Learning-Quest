## §30. The N+1 Problem and ORM Gotchas

### 1. The Vocabulary

- **N+1 query problem** — fetching a list (1 query), then fetching related data for *each* item in
  a loop (N more queries), instead of one combined query.
- **Eager loading** — telling the ORM upfront to fetch related data in the same or a single
  additional query, avoiding N+1.
- **Lazy loading** — related data is only fetched the moment it's actually accessed — convenient,
  but the exact mechanism that causes N+1 when done inside a loop without realizing it.

### 2. Where It Sits, and Why Teams Use It

N+1 is arguably the single most common real performance bug in ORM-based backends — it's
invisible with a handful of test rows and directly, linearly worse as real data grows, which
means it often ships clean and becomes a production incident later.

### 3. What Actually Breaks

- **Listing 50 orders, then accessing `order.customer.name` for each** — with lazy loading, that's
  1 query for the orders plus 50 more queries for each order's customer, when a single join or an
  explicit "eager load customers" call would have done it in 1-2 queries total.
- **It looking totally fine in local testing** — 5 test orders means 5 extra queries, invisible in
  a dev environment; 50,000 real orders means 50,000 extra round trips, each with its own network
  latency, adding up to a very real multi-second (or worse) response time.
- **Fixing it in the wrong layer** — trying to "optimize" by caching the N+1 result instead of
  fixing the actual query pattern treats a symptom instead of the cause.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "N+1 means one query to get a list, then one more per item to get related data — the fix is
  eager loading or a join, not caching around the problem."
- "This is invisible at small scale, so I check for it specifically in code review on any loop
  that touches a related model, not just when something's already slow."
- "Most ORMs have an explicit 'eager load this relationship' option — I use it deliberately, not
  just rely on whatever the default lazy behavior happens to do."

### 5. Interview-Ready Answer

> "N+1 is when code fetches a list with one query, then triggers a separate query per item to get
> related data — often invisibly, through an ORM's lazy loading. It's dangerous specifically
> because it's invisible with small test data and scales linearly worse as real data grows. The
> fix is eager loading the relationship or writing an explicit join so it's one or two queries
> total, regardless of list size."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §30 (Query Optimization, Indexes & the N+1
Problem) chapter (with concrete before/after query examples).

---
