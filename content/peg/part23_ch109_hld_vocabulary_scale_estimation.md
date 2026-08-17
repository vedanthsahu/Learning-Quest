## §109. HLD Vocabulary: Requirements, Scale Estimation, and Capacity Planning

### 1. The Vocabulary

- **Functional requirements** — what the system must do (e.g., "users can upload a photo").
- **Non-functional requirements (NFRs)** — how well it must do it: latency, availability,
  durability, consistency, throughput. Interviews and design docs live or die on whether NFRs get
  stated explicitly instead of assumed.
- **Back-of-envelope estimation** — rough math (requests/second, storage/year, bandwidth) done in
  minutes, not a spreadsheet — used to decide whether a problem needs one server or a sharded
  fleet.
- **QPS (queries per second)** and **peak-to-average ratio** — average load rarely matters; peak
  load (Black Friday, 9am login rush) is what breaks systems.
- **Read-heavy vs write-heavy** — the single biggest early fork in a design: it decides whether
  caching or write-partitioning is the more urgent problem.

### 2. Where It Sits, and Why Teams Use It

This is the vocabulary that turns "let's design a URL shortener" from a vague prompt into a
bounded engineering problem. Every real system design — whether in an interview or an actual
architecture doc — starts by pinning down what "at scale" concretely means for this system,
because the right database, the right caching strategy, and the right number of servers are all
functions of that number, not of taste.

### 3. What Actually Breaks

- **Skipping NFRs entirely** — designing a chat app without ever saying whether messages need to
  survive a server crash (durability) or just need to feel fast (latency) — these pull the design
  in different directions.
- **Estimating average load only** — a system sized for average QPS falls over the first time
  real traffic spikes, because spikes are the normal case for anything with a marketing campaign,
  a live event, or a viral moment.
- **Getting lost in precision** — spending ten minutes computing exact bytes-per-row when the
  order of magnitude (megabytes vs terabytes) is all that actually changes the design decision.
- **Confusing "large scale" with "large team"** — a system can have enormous read volume and still
  be built and run by three engineers; scale estimation is about the system's numbers, not
  headcount.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I always state non-functional requirements explicitly before proposing a design — latency,
  availability, and consistency targets change the answer."
- "I estimate peak load, not average load, because peak is what actually determines capacity."
- "I keep back-of-envelope math rough on purpose — I'm checking orders of magnitude, not doing
  accounting."

### 5. Interview-Ready Answer

> "Before I design anything, I pin down functional requirements and non-functional requirements —
> especially latency, availability, and consistency, since those change the shape of the design
> more than the feature list does. Then I do a rough peak-QPS and storage estimate, because
> whether we're talking about thousands or hundreds of millions of requests decides almost
> everything downstream — single database versus sharded, cache-or-not, synchronous versus
> queued."

### 6. Go Deeper

companion Software Systems Handbook's §80 (Capstone Intro: Requirements & Estimation
Methodology) chapter and companion Software Systems Handbook's §56 (Capacity Planning Deep Dive:
Little's Law, load testing) chapter (the full worked-example math this chapter summarizes); this
book's §95 (Clarifying Requirements) and §99 (HLD Interview Structure) for the surrounding
interview flow.

---
