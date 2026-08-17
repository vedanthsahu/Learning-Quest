## §27. Multi-Tenancy, Audit Logs, and Soft Deletes

### 1. The Vocabulary

- **Multi-tenancy** — one system serving multiple independent customers ("tenants") whose data
  must stay isolated from each other.
- **Tenant isolation** — the mechanism enforcing that isolation: a `tenant_id` column checked on
  every query, separate schemas per tenant, or fully separate databases per tenant.
- **Audit log** — an append-only record of who did what, when — for compliance, debugging, and
  detecting misuse.
- **Soft delete** — marking a row as deleted (`deleted_at` timestamp) instead of actually removing
  it, so it can be recovered or still referenced historically.

### 2. Where It Sits, and Why Teams Use It

Any B2B product serving multiple customers on shared infrastructure needs tenant isolation as a
hard requirement, not a nice-to-have — a bug that leaks one tenant's data to another is often the
single most damaging class of bug a SaaS company can ship. Audit logs and soft deletes exist
because "just delete it" is rarely actually what a real business needs.

### 3. What Actually Breaks

- **Forgetting the tenant filter on one query** — a single endpoint, report, or admin tool that
  forgets to scope by `tenant_id` is a cross-tenant data leak, and it's exactly the kind of bug
  that's invisible in testing (one tenant, one dataset) and catastrophic in production (many
  tenants, real data).
- **Soft-deleted rows still showing up** — every query against a soft-deleted table needs to
  explicitly filter out deleted rows; forgetting this in even one query (a report, a search index,
  a join) surfaces "deleted" data that users expect to be gone.
- **Unique constraints breaking with soft deletes** — if a "deleted" user's email is still in the
  table, a new signup with that same email can't reuse it unless the unique constraint is scoped
  to exclude soft-deleted rows.
- **Audit logs that can be edited or deleted** — an audit log that isn't genuinely append-only and
  tamper-resistant doesn't actually satisfy the compliance or trust reason it exists for.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "In a multi-tenant system, I treat 'did I scope this query by tenant' as a mandatory checklist
  item on every new query, not an assumption."
- "Soft delete means every existing query needs to be re-checked for a 'not deleted' filter, not
  just the delete endpoint itself."
- "An audit log needs to be genuinely append-only to actually serve its purpose."

### 5. Interview-Ready Answer

> "The single highest-stakes mistake in multi-tenant systems is a query that forgets to filter by
> tenant, because it's invisible until it's discovered in production with real data leaking across
> customers. I treat that filter as a non-negotiable check on every new query. Soft delete is
> similar in spirit — it's not just 'add a deleted_at column,' it's making sure every other query
> against that table now excludes deleted rows, and that unique constraints are scoped to exclude
> them too."

### 6. Go Deeper

Neither companion handbook has a dedicated multi-tenancy chapter; companion Python Backend
Engineering Handbook's §24 (PostgreSQL for Backend Engineers) chapter covers the schema-design
foundation (indexes, constraints) that tenant-scoping is built on top of, and companion Software
Systems Handbook's §29 (API Design Deep Dive: REST/RPC/gRPC/GraphQL, idempotency) chapter covers
the API-level access-scoping patterns this chapter's tenant filter is a specific case of.

---
