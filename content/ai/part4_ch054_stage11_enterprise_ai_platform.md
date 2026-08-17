## 54. Nova Stage 11: Enterprise AI Platform (Multi-Tenant, Model Routing, Cost Controls, RBAC)

### 54.1 What Broke

Nova is now being sold to multiple enterprise customers, each with their own document corpus, users, and cost budget — the current architecture, built for a single deployment, has no structural mechanism preventing one customer's data from ever appearing in another's responses, no way to bound or attribute cost per customer, and no role-based restriction on which users within a customer's organization can access which tools or documents.

### 54.2 Why

§13.4's multi-tenant data-leakage concern, previously addressed only at the document-retrieval-filtering level (§47.4's metadata scoping), must now extend to *every* data store Nova has accumulated across Stages 4-10 (document RAG, long-term memory, §48; conversation logs, §31.3) — a single-tenant architecture's assumptions break down across every one of these simultaneously, not just one.

### 54.3 Candidates and Their Costs

**Option A — separate, fully isolated infrastructure per customer:** Maximal isolation guarantee, but operationally expensive and slow to onboard new customers — a new full deployment per customer. **Option B — shared infrastructure with strict tenant-scoped filtering enforced at every data-access layer:** Reuses existing infrastructure (§22.9's shared vector database with metadata filtering, already partially in place since §47.4) extended consistently across every store, with per-tenant cost tracking and RBAC layered on top — far more operationally efficient, contingent on filtering being enforced with zero gaps.

### 54.4 Chosen Solution

Option B: shared infrastructure with tenant-scoped filtering enforced structurally (not just instructed via prompt, per §30.4's warning) at every single data-access point — document retrieval (§47), long-term memory (§48), and the policy engine (§53.4) all extended to include `tenant_id` as a mandatory filter dimension, never optional. Model routing (§27.5) is extended to support per-tenant model/cost-tier configuration, since different enterprise customers have different cost/capability tradeoffs they've contracted for. RBAC (companion §30.6, applied here) restricts which roles within a tenant can invoke which tools, extending the policy engine's role-based rules (§53.9) from a single implicit organization to an explicit per-tenant role hierarchy.

### 54.5 What It Enabled

Nova can now serve multiple enterprise customers from shared, cost-efficient infrastructure while providing the strict data isolation and per-tenant cost accountability that enterprise security and procurement reviews require — directly the business capability that justifies calling this an "enterprise AI platform" rather than a single-customer deployment.

### 54.6 The New Tradeoff This Introduced

Every new capability added to Nova from this point forward must now be explicitly designed with tenant-scoping in mind from the start, adding a permanent design-review requirement that didn't exist in Stages 1-10; a single missed tenant-filter anywhere in the growing set of data stores is now a serious, high-severity incident (§42.5's severity-classification framework, specifically the domain-consequence weighting) rather than a minor bug, requiring the kind of systematic, structural verification (§38.14-style completeness checks, applied to tenant filtering rather than embedding migration) as an ongoing discipline.

### 54.7 Engineering Intuition

> **Why extend shared infrastructure rather than isolate customers into separate deployments?** Because Option A's operational cost and onboarding friction scale linearly with customer count, while Option B's shared infrastructure with correctly-enforced filtering scales far more efficiently — contingent entirely on filtering being verifiably complete, which is why structural (not prompt-based) enforcement is non-negotiable here.

### 54.8 Decision Tree: Is a New Nova Feature Tenant-Safe?

```
Does the feature read or write to ANY persistent store (documents,
memory, logs, cost records)?
  YES -> Does every read/write path include a mandatory,
         structurally-enforced tenant_id filter (§54.4)?
    NO  -> BLOCK this feature from shipping until filtering is
           added and verified (§54.6) -- this is not optional.
    YES -> Proceed, but add an explicit tenant-isolation test case
           to the golden dataset/regression suite (§29.2).
```

### 54.9 Python Snippet: A Structural Tenant-Scoping Wrapper

```python
# Nova Stage 11: wraps EVERY data-store access with a mandatory
# tenant filter -- structurally impossible to bypass, not a
# convention engineers must remember (§54.4, §30.4's principle).

def tenant_scoped_query(vector_db_client, tenant_id, **query_kwargs):
    if not tenant_id:
        raise ValueError("tenant_id is REQUIRED for every query -- "
                          "no unscoped access path exists (§54.4).")

    existing_filter = query_kwargs.pop("filter", {})
    merged_filter = {**existing_filter, "tenant_id": tenant_id}

    return vector_db_client.query(filter=merged_filter, **query_kwargs)
    # Every caller across documents (§47), memory (§48), and logs
    # (§31.3) MUST go through this wrapper -- centralizing the
    # enforcement point so it can be verified in one place, not
    # audited across every individual call site.
```

### 54.10 Further Reading

- §13.4 (Data Leakage/PII Protection), §22.4/§22.9 (Vector DB Filtering/Selection) — the direct foundation of this stage's isolation design.

---
