## 109. Architecture Review Exercises I: Spotting the Missing Requirement and the Unjustified Box

### 109.1 Purpose: Practicing Review, Not Just Design

Every prior chapter in this handbook practiced *producing* an architecture. A distinct, equally important skill — used constantly in real design reviews, and tested directly in senior/staff-level interviews via "here's a design, critique it" prompts — is *reviewing someone else's* architecture critically. This chapter presents four short architecture descriptions, each with a specific, identifiable flaw. Read each one and attempt to identify the flaw yourself before reading the analysis that follows — this is a reading exercise, not a lookup table.

### 109.2 Exercise: The Notification Service

**Proposed architecture:** "Our notification service receives an event, immediately calls the push-notification provider's API synchronously, then calls the email provider's API synchronously, then calls the SMS provider's API synchronously, all within the same request that triggered the notification, and returns success once all three complete."

**What to look for before reading on:** Consider §92.2's Step 2 (non-functional requirements) and §103.2's notification-system mapping.

**Analysis:** This architecture is missing the asynchronous decoupling §103.2 identified as central to this exact problem — chaining three synchronous external-API calls inside the triggering request means the triggering action's latency is now the *sum* of three third-party providers' latencies, and any one provider being slow or down makes the entire triggering action fail or hang. The missing requirement: the design never asked "does the action that triggers a notification need to wait for the notification to actually be delivered?" — almost certainly no. **The fix:** Publish an event and process each channel asynchronously via a queue/worker pattern (§11, §103.2), with independent retry/backoff per channel so one slow provider doesn't block the others or the triggering action.

### 109.3 Exercise: The E-Commerce Product Catalog

**Proposed architecture:** "Every product page load queries the primary database directly for product details, current price, and current inventory count, to ensure the displayed information is always perfectly up to date."

**What to look for before reading on:** Consider the read/write ratio (§92.2 Step 3) implied by "every product page load" and §10's caching mental model.

**Analysis:** This architecture has an unjustified *absence* — the inverse of an unjustified box (§104.2 Signal 3), but the same underlying failure: no caching layer for an extremely read-heavy, latency-sensitive path, justified only by an unstated (and likely unnecessary) assumption that product details need perfect real-time freshness. Product details and price rarely change second-to-second; inventory count is the one field that plausibly needs fresher data. **The fix:** Cache product details/price with a short TTL or explicit invalidation on update (§39), and treat inventory count as a separate, deliberately-fresher-read path (or accept brief staleness with a "low stock" buffer, a common real e-commerce pattern) — the review question that exposes this flaw is "does *every* field on this page actually need the same freshness guarantee?"

### 109.4 Exercise: The Analytics Dashboard

**Proposed architecture:** "User-facing analytics dashboards query a dedicated OLAP data warehouse directly, which is updated via a nightly batch ETL job pulling from the production transactional database."

**What to look for before reading on:** This one is more subtle — consider whether a genuine requirement is missing versus whether this is actually a reasonable design.

**Analysis:** Unlike §109.2-109.3, this architecture may well be *correct* — the review skill being exercised here is recognizing when a design that "looks incomplete" (no real-time streaming, no fancy event pipeline) is actually appropriately scoped to a stated or reasonably-inferred requirement (§20's batch-vs-real-time mental model). The missing piece isn't a technical gap — it's that the requirement ("how fresh must this dashboard be?") was never stated, and a reviewer's job here is to ask that question rather than assume either "nightly batch is obviously fine" or "this obviously needs real-time streaming." **The lesson:** Not every review exercise has a technical flaw to find — sometimes the correct critique is "this is unreviewable without first stating the freshness requirement," which is itself a stronger, more senior response than confidently declaring the design either sufficient or insufficient.

### 109.5 Exercise: The Multi-Region Deployment

**Proposed architecture:** "To improve availability, we deployed our application across three regions, each with its own full copy of the primary relational database, synchronously replicating writes to all three regions before acknowledging any write."

**What to look for before reading on:** Consider §59's global networking chapter and the actual latency cost of synchronous cross-region replication.

**Analysis:** This is an unjustified box combined with a hidden, severe cost — synchronous replication across three geographically distant regions means every single write must wait for network round-trips to the farthest region before acknowledging, often adding hundreds of milliseconds of latency to every write, in exchange for an availability property (§74's multi-region failover treatment) that could very likely be achieved with asynchronous replication and an active-passive or eventually-consistent active-active design instead (§88's actual capstone justification for when and how Loop adopted multi-region active-active, only after specific evidence justified the added complexity). **The fix:** Clarify the actual availability requirement first, then choose the replication mode (§34.3, §59) that satisfies it at the lowest latency cost — synchronous cross-region replication should be a rare, specifically-justified choice (e.g., strict regulatory requirements), not a default "more regions equals more available" assumption (directly §108.5's trap, applied at the multi-region scale).

### 109.6 Engineering Intuition

> **What's the fastest way to review someone else's architecture systematically?** Run §92.2's ten-step HLD framework *in reverse*, as a checklist against the presented design: does every box trace back to a stated requirement (Step 6)? Is the read/write ratio and consistency need addressed (Steps 2-3)? Is every non-obvious decision's tradeoff stated (Step 8)? A gap at any step is a candidate flaw.

> **What would over-engineering a review look like?** Finding fault with every design regardless of its actual context, or insisting on maximum sophistication (real-time streaming, multi-region everything) as the "more correct" answer regardless of the stated requirement — §109.4 exists specifically to demonstrate that a simpler design is sometimes genuinely correct, and a reviewer who can't recognize that is applying §108.10's meta-trap in reviewer form.

### 109.7 Further Reading

- §92.2 (HLD Framework, applied here in reverse as a review checklist), §103.2 (Notification System Mapping), §10/§39 (Caching), §59/§74 (Multi-Region) — the direct mechanism foundations for this chapter's four exercises.

---
