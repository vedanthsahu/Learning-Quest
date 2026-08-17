## 23. Mental Model: Capacity Planning and Cost

### 23.1 The Problem: "Just Add Servers" Has a Bill Attached

§18.4 introduced horizontal scaling as a way past a single machine's ceiling, and it is tempting to treat "add more servers" as a nearly-free escape hatch from any capacity problem, especially given how easy the cloud (§13) makes it to provision more infrastructure with a single API call. It is not free — every additional unit of compute, storage, and network capacity has a real, ongoing financial cost, and at meaningful scale, that cost becomes large enough to be a first-class engineering constraint in its own right, not an afterthought for the finance department to worry about. **Capacity planning** is the discipline of predicting how much infrastructure you will actually need, and **cost optimization** is the discipline of not paying for more than that. Queueing theory, load testing methodology, and detailed cost breakdowns are deferred to Pass 2, §56.

### 23.2 Why Guessing Doesn't Work: The Case for Estimation

Capacity decisions made by intuition alone tend to fail in one of two directions, both costly: under-provisioning, where real demand exceeds what was planned for and the system fails or degrades exactly when it matters most (often during a peak event, the worst possible time); or over-provisioning, where capacity sits unused, quietly costing money for no benefit. The engineering alternative is **estimation**: working from known or reasonably-assumed numbers (expected users, requests per user, data size per record) to a defensible prediction of the load the system must handle, and sizing capacity to that prediction with a deliberate, explained safety margin — not an arbitrary one. This is precisely the estimation methodology that Part IV's capstone project (§80) makes an explicit, worked exercise, because it is a skill built by practicing the calculation, not by reading about it.

### 23.3 Headroom: Planning for the Peak, Not the Average

A common estimation mistake is planning capacity for *average* load, when the load that actually determines whether a system stays up is its *peak* — average traffic across a full day may be entirely unremarkable while a short burst around a specific event (a sale, a viral moment, a batch job's scheduled run) is many times higher. **Headroom** is the deliberately-maintained gap between current typical usage and actual maximum capacity, sized to absorb realistic peaks and unexpected surprises without the system failing. How much headroom is enough is itself a tradeoff: too little risks outages during real peaks; too much is straightforwardly wasted spending (§23.1) — and getting this right requires understanding your own traffic's actual peak-to-average ratio, not applying a generic rule of thumb.

### 23.4 Cost Is an Architectural Property, Not Just a Billing Statement

A crucial mental shift this chapter is trying to produce: cost is not something that happens *after* an architecture is chosen — it is a direct, predictable consequence of architectural choices made throughout this entire book, and should be reasoned about at the same time as those choices, not discovered afterward on an invoice. Choosing to replicate data across three regions instead of one (§8, §74) has a cost implication. Choosing a fully-managed service over a self-run one (§13.4) has a cost implication that shifts with scale. Choosing to over-provision "just in case" instead of using auto-scaling has a continuous, compounding cost implication. Treating cost as one more axis of every architectural tradeoff — alongside latency, availability, and complexity — rather than a separate, later concern, is what distinguishes mature engineering judgment (§1.5) from an architecture that is technically excellent but commercially unsustainable.

### 23.5 The Feedback Loop Between Observability and Capacity Planning

Capacity planning is not a one-time exercise performed at a system's launch — it is an ongoing loop, and it depends directly on the observability discipline from §16: you cannot plan future capacity without an accurate, continuously-updated picture of current usage, its trends, and its peak-to-average behavior. A system with poor observability is, by direct consequence, a system that can only guess at its own future capacity needs, which pushes it back toward the guessing-based failure modes §23.2 exists to avoid.

### 23.6 Engineering Intuition

> **How do I know my capacity planning is inadequate?** If your answer to "how much more load can this system handle before it falls over" is a guess rather than a number derived from measured headroom (§23.3) and a load test, your capacity planning is not yet a deliberate discipline.
>
> **What symptoms indicate a capacity planning gap?** Outages that coincide with predictable peak events (a sale, a marketing push) rather than genuinely unexpected ones; infrastructure spend that has grown without a corresponding, explained growth in actual usage.
>
> **What metrics indicate it?** The ratio of provisioned capacity to actual peak usage (a direct measure of headroom, §23.3); infrastructure cost per unit of real business activity (per user, per transaction), tracked over time to catch silent cost creep.
>
> **What breaks first if capacity isn't planned deliberately?** The system fails during exactly the moments it matters most — real, foreseeable peak events — because capacity was sized to an average that was never actually representative of the load that determines survival.
>
> **When is informal capacity planning acceptable?** At low, stable, well-understood traffic levels with a wide margin between typical usage and any plausible peak — formal load testing and detailed estimation are effort better spent once growth or peak unpredictability actually justifies it.
>
> **What would a hyperscale company do?** Maintain formal, continuously-updated capacity models, run regular large-scale load tests, and treat cost per unit of business activity as a tracked, optimized metric with dedicated engineering ownership (FinOps, §78).
>
> **What would a two-person startup do?** Rely on auto-scaling provided by their cloud platform and a rough, order-of-magnitude sense of expected peak traffic, revisited only when growth or a specific planned event (a launch, a marketing campaign) makes more rigor worthwhile.
>
> **What changes with scale?** At small scale, the gap between "guess and rely on auto-scaling" and formal capacity planning is small, because the absolute cost of being wrong is small. At large scale, both the cost of over-provisioning and the consequences of under-provisioning during peak events grow large enough that formal, continuous capacity planning and cost optimization become mandatory disciplines with dedicated ownership (§78).

### 23.7 Exercises

1. For a system you know, estimate its peak-to-average traffic ratio using whatever real numbers you have access to (or reasonable assumptions), and assess whether its current provisioning reflects that peak or merely the average.
2. Pick one architectural decision in a system you know (a choice of managed vs. self-hosted service, a replication factor, a caching strategy) and explicitly state its cost implication, per §23.4's framing, alongside whatever benefit motivated the decision in the first place.

### 23.8 Further Reading

- Neil Gunther, *Guerrilla Capacity Planning* — a practical, example-driven treatment of the estimation and headroom concepts in §23.2–23.3, developed further with formal queueing theory in §56.
- The FinOps Foundation, "FinOps Framework" — an industry-standard framework for the cost-as-an-architectural-property discipline introduced in §23.4, developed further in §78.

---
