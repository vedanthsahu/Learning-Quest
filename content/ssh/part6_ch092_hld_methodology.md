# PART VI — INDUSTRY ARCHITECTURE & ENGINEERING PATTERN CATALOG

## Preface to Part VI

Parts I through V taught you to reason from first principles: given a problem, derive the constraint, weigh the tradeoff, and arrive at a decision. That reasoning process does not change here. What changes is the audience for your answer. In a design review, an interview, or a conversation with another senior engineer, the *reasoning* you built in Parts I-V will be judged partly on whether it arrives at the right conclusion — and partly on whether you can name that conclusion the way the rest of the industry names it. An architect who correctly reinvents the Strategy pattern from scratch but calls it "the swappable-behavior thing" has done the engineering correctly and will still read as less fluent than one who says "Strategy pattern" in one breath and moves on to the next problem.

Part VI exists to close exactly that gap. It introduces no new engineering reasoning that Parts I-V didn't already build — every pattern in this Part is either a named instance of a mechanism you've already derived, or a small, adjacent piece of vocabulary (classical OOP patterns, HLD/LLD interview structure) that the handbook's systems-first ordering hadn't yet had a natural place for. Every entry in this Part still follows the handbook's founding discipline: the problem comes first, the pattern's name comes last.

## 92. High-Level Design (HLD): The Architect's Repeatable Framework

### 92.1 The Problem HLD Methodology Solves

Given a business problem stated in one or two sentences — "design a URL shortener," "design a notification system," "design Loop" — an unstructured engineer starts drawing boxes immediately, guesses at a database, and either omits something a reviewer considers essential or spends the entire available time on a component that turns out not to matter. **High-Level Design (HLD)** is not a separate body of knowledge from anything in Parts I-IV; it is a *repeatable ordering* of the questions those Parts already taught you to ask, structured specifically so that nothing essential is skipped and time is spent proportionally to what actually matters for the stated problem. This is the same discipline §80.3-80.4 already walked through for Loop, generalized here into a checklist you can run against any unfamiliar problem, not just Loop specifically.

### 92.2 The Repeatable Framework, Step by Step

```
HLD FRAMEWORK (run in this order, every time):

1. FUNCTIONAL REQUIREMENTS
   What must the system DO? (§80.3) List explicit user-facing
   actions. Explicitly state what is OUT of scope — an
   unstated scope boundary is the single most common cause of
   wasted interview time.

2. NON-FUNCTIONAL REQUIREMENTS
   How WELL must it do it? (§80.3) Read/write ratio, latency
   target, availability target (§19.2), consistency
   requirement per data type (§38.5). This step, more than any
   other, determines which architecture is correct — two
   systems with identical functional requirements can have
   completely different correct architectures if their NFRs
   differ.

3. CAPACITY ESTIMATION
   Traffic, storage, bandwidth, concurrency (§80.4's exact
   method, Little's Law §56.2). Perform this even when the
   answer seems obvious — it is the artifact that justifies
   every later architectural choice, not a formality.

4. API DESIGN
   Define the contract (§4.3, §29) before the internals. A
   small number of core endpoints/RPCs, each named and shaped
   by the functional requirements in Step 1.

5. DATA MODEL
   What entities exist, what relationships do they have (§6-7),
   and — critically — which specific database category fits
   (§7.5's per-dataset decision, not a single, whole-system
   choice, per §96 of this Part's catalog).

6. HIGH-LEVEL COMPONENTS / BLOCK DIAGRAM
   Draw the boxes: client, API gateway/load balancer (§28,
   §42.2), application services, cache (§10), database(s),
   queue(s) (§11), any specialized stores (search/vector, §21).
   Every box must trace back to a requirement from Steps 1-2 —
   a box with no justifying requirement is the "sophistication
   before the constraint exists" mistake from §1.5, now
   committed inside an interview.

7. STRATEGY PER CONCERN
   For each of: caching (§10, §39), queuing/eventing (§11,
   §41), storage/replication/sharding (§8, §34-35), security
   (§17, §49), availability/reliability (§19, §52), disaster
   recovery (§74) — state the strategy AND say explicitly why
   it's justified by a Step 1-3 answer, not by default.

8. TRADEOFF ANALYSIS
   For every non-obvious decision, state the alternative you
   rejected and why (§80.5, item 3-4 — literally the same
   five-question discipline from the capstone, now compressed
   into interview time).

9. COST ANALYSIS
   Even a rough, order-of-magnitude cost sanity check (§23,
   §78) signals engineering maturity beyond "it works."

10. MONITORING / ARCHITECTURE REVIEW ARTIFACT
    State what you'd actually watch (§16, §52.2) to know if
    this design is working post-launch, and note that any
    genuinely non-obvious decision here should exist as a
    written ADR (§57.7, §90) for future engineers.
```

### 92.3 Why This Order, Specifically

The order is not arbitrary — each step's output is a required input to the next, exactly mirroring why this handbook itself is ordered the way it is (§0.1). You cannot estimate capacity (Step 3) without functional and non-functional requirements (Steps 1-2) to estimate *against*. You cannot draw a defensible block diagram (Step 6) without an API and data model (Steps 4-5) to draw boxes *around*. Skipping straight to Step 6 — drawing an architecture diagram before any of the preceding steps — is the single most common HLD interview failure mode, and it is failure mode precisely because it inverts this handbook's central philosophy: technology before problem, rather than problem before technology.

### 92.4 Architecture Documentation and the Review Process

A completed HLD is not merely spoken or sketched once — in real engineering organizations, it is written down as a **design document**, reviewed by peers or a dedicated architecture review board before implementation begins, specifically to catch the same class of gap a good interviewer is probing for: an unstated requirement, an unjustified component, a skipped tradeoff. The document's structure mirrors §92.2's framework directly, and its non-obvious decisions are recorded as ADRs (§57.7) precisely so that the reasoning survives past the meeting that produced it — the exact same discipline demonstrated nine times over in Loop's capstone journey (§81-90).

### 92.5 Engineering Intuition

> **How do I know I've spent the right amount of time on each HLD step?** Time should be roughly proportional to how much a step's answer actually changes the architecture — spending five minutes confirming "yes, this is read-heavy" and thirty seconds moving on is correct; spending thirty seconds on non-functional requirements and thirty minutes drawing boxes is backwards.
>
> **What's the single most common HLD interview failure?** Jumping to Step 6 (the diagram) before Steps 1-3 are settled — exactly as §92.3 describes.
>
> **What would over-engineering an HLD answer look like?** Introducing Kafka, Kubernetes, or multi-region infrastructure in Step 6 without a Step 2-3 answer that actually demands them — the same anti-pattern from §1.5, now specifically diagnosable against your own Step 2-3 notes.

### 92.6 Exercises

1. Take any functional requirement ("design a URL shortener") and write out Steps 1-3 in full before drawing anything. Notice how much of the eventual architecture is already implied before a single box is drawn.
2. Review a past design document you've written or read. Map its sections against §92.2's ten steps — which steps were skipped, and did that gap correspond to a real weakness in the resulting design?

---
