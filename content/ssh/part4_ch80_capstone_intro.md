# PART IV — PASS 4: ARCHITECTURAL THINKING (THE CONTINUOUS PROJECT)

## 80. Capstone Intro: Requirements Gathering and Estimation Methodology

### 80.1 Why This Part Is Different From Everything Before It

Parts I through III taught. Every chapter opened with a problem, walked through a mechanism, and closed with an Engineering Intuition block telling you when to reach for the thing just covered. This part does none of that. From here forward, no new concept is introduced — everything needed to design, defend, and evolve a real system has already been given to you across the preceding 79 chapters. What Part IV does instead is force you to reason: given a business problem and a growing user base, gather the requirements, estimate the load, identify what will break first, choose a fix from among real alternatives, and defend that choice the way you would in a design review where someone is actively looking for the weak point in your answer.

### 80.2 The Application: Loop

Every stage in this Part evolves the same application, introduced here once and never re-explained. **Loop** is a social content-sharing platform: users create an account, post short pieces of content (text, optionally an image), follow other users, see a feed of posts from people they follow, and can comment on and react to posts. This is a deliberately ordinary, unoriginal product idea — the entire pedagogical point of this Part is architectural evolution, not product novelty, and an unoriginal product is precisely what keeps the focus where it belongs.

Loop is chosen specifically because it touches nearly every subject area covered in Parts I-III over its lifetime: it needs a database with real relationships (users, posts, follows, comments — §6-7), it needs a feed (a read-heavy, fan-out-prone query pattern that will motivate caching and eventually a dedicated feed-generation architecture), it will need search (§21, §54, §76) once its content volume grows, it will need to handle spiky, uneven load (a post going viral), and it will eventually need every major topic in this handbook to operate at real scale.

### 80.3 Requirements Gathering: Reading Between the Lines

Before any architecture can be proposed, requirements must be gathered — and a critical, often-skipped skill is distinguishing **functional requirements** (what the system must do: users can post, follow, comment) from **non-functional requirements** (how well it must do it: how fast, how available, how consistent) — because it is almost always the non-functional requirements, not the functional ones, that actually drive architectural decisions. "Users can see a feed of posts" is a functional requirement satisfiable by a single, unoptimized database query. "The feed must load in under 200ms for a user following 10,000 accounts, with 99.9% availability" is a non-functional requirement that, on its own, can justify an entire caching and pre-computation architecture.

A disciplined requirements-gathering pass for Loop, at any stage, asks explicitly:

- **Read/write ratio**: is this a read-heavy system (users view far more than they post) or write-heavy? (Loop, like most social platforms, is read-heavy — this single fact, established early, will justify caching, read replicas, and CDN usage repeatedly throughout this Part.)
- **Consistency requirements, per data type**: does a like count need to be exactly correct instantly (§38.5's tradeoff, applied concretely), or is a few-seconds-stale count acceptable? Does a follow relationship need to be immediately, globally consistent, or can it tolerate brief staleness?
- **Availability requirements**: what does downtime actually cost, in this specific product's terms (§19.2)? For Loop early on, a few minutes of downtime is an inconvenience; for the payments-adjacent or account-security-adjacent operations that appear later, the tolerance is much lower.
- **Growth trajectory**: is growth expected to be gradual and organic, or spiky and viral-prone? Loop's specific risk (a single post going viral) is exactly the kind of non-uniform, bursty load pattern that headroom and capacity planning (§23.3, §56) must explicitly account for, not just average daily traffic.

### 80.4 Estimation Methodology: The Actual Math

Every stage transition in this Part performs the same estimation exercise, using the same method, so that it becomes a habit rather than a one-off calculation. Given an assumed user count and usage pattern:

```
ESTIMATION METHOD (applied at every stage):

1. Traffic (requests/second):
   daily active users × actions per user per day
   ÷ 86,400 seconds per day
   × peak-to-average multiplier (§23.3 — peak traffic is what
     matters, never size to the average)

2. Storage (total data volume):
   number of records × average size per record
   × growth period you're planning for
   (+ index overhead, typically 20-50% on top of raw row data,
     per §31.2's B-Tree structure)

3. Bandwidth (data transferred):
   requests/second × average response size
   (checked separately for read-heavy vs. write-heavy paths,
    since these often have very different payload sizes)

4. Concurrency (Little's Law, §56.2):
   L = λ × W
   (arrival rate × average time-in-system = concurrent load,
    which directly informs connection pool sizing, §51.3, and
    server/thread capacity, §18.4)
```

This method is applied at every single stage transition in this Part, with real, worked numbers for Loop's specific assumed user count — not as a formality, but because the entire point of estimation is that it, and only it, tells you *when* a specific bottleneck will actually bind, rather than leaving that as a vague, unquantified worry.

### 80.5 The Five Questions, Restated as This Part's Format

§0.3 introduced the five questions that gate every architecture change in this Part. They are restated here as the literal structure every subsequent stage chapter follows, so the format itself never needs re-explaining:

1. **What broke?** — stated as a specific, measured symptom, not a vague feeling.
2. **Why did it break?** — the root cause, applying the failure taxonomy from §1.3 and the specific mechanism from wherever in Parts I-III it was originally covered.
3. **What are the candidate fixes, and what does each cost?** — at least two real alternatives, each with a genuine tradeoff, never a single obvious "correct" answer presented without competition.
4. **Which fix was chosen, and why over the alternatives?** — a defended decision, in the voice of an engineer justifying a choice under scrutiny, referencing the specific constraints (team size, budget, timeline) that make this choice right for *this* stage, not universally right.
5. **What did the fix make possible, and what new failure mode did it introduce?** — because, per §1.6, the bottleneck always moves, and pretending a fix is a final, complete solution would misrepresent how real systems evolve.

### 80.6 What This Part Deliberately Will Not Do

In keeping with the anti-pattern named repeatedly throughout this handbook (§1.5), this Part will not jump to a sophisticated, hyperscale-grade architecture before the stage's actual, stated user count and requirements justify it. Stage 0 will look almost embarrassingly simple to a reader who has just finished Part III's hyperscale material — that is intentional, and the discipline of *not* over-building at Stage 0 is as much a lesson as anything explicitly taught in the preceding chapters.

### 80.7 Exercises

1. Before reading Stage 0 (§81), write your own guess at what Loop's Stage 0 architecture should look like, and what its first bottleneck will be. Compare your guess against §81-82 once you reach them.
2. Using §80.4's estimation method, calculate the requests-per-second, storage, and concurrency figures for a hypothetical version of Loop with 10,000 daily active users, each performing 20 actions per day, assuming a peak-to-average multiplier of 3x.

### 80.8 Further Reading

- Alex Xu, *System Design Interview* (Volumes 1-2) — a widely-used, example-driven companion to the estimation and requirements-gathering discipline in this chapter.
- Martin Kleppmann, *Designing Data-Intensive Applications*, Chapter 1 — foundational framing for reasoning about non-functional requirements (reliability, scalability, maintainability) exactly as applied throughout this Part.

---
