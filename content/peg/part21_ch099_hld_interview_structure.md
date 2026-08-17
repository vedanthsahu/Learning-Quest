## §99. HLD Interview Structure: Requirements → Scale → API → Data → Bottlenecks

### 1. The Vocabulary

- **HLD (High-Level Design)** — the overall shape of a system: major components, how they
  connect, and the key decisions at that level, as opposed to LLD's class/interface-level detail
  (§100).
- **Functional/non-functional requirements** — what it must do, and how well (scale, latency,
  availability) — the mandatory first step (§95), even more critical under interview time
  pressure.
- **Back-of-envelope scale estimation** — a rough calculation (requests per second, storage
  needed) that shapes every downstream decision — a database choice for 100 users a day looks
  very different from one for 100 million.
- **Bottleneck identification** — explicitly naming where the design is most likely to break
  first under load, and what the mitigation would be.

### 2. Where It Sits, and Why Teams Use It

This is the specific, learnable structure for the "design X" interview format — not a script to
recite, but a sequence that ensures the most important decisions get made in the right order,
with the right information, rather than jumping straight to a specific technology choice before
establishing what's actually needed.

### 3. What Actually Breaks

- **Jumping straight to a specific technology before clarifying requirements** — proposing
  "Kafka and a microservices architecture" before knowing the actual scale, latency needs, or team
  size reads as pattern-matching rather than genuine design reasoning.
- **Skipping scale estimation entirely** — designing the same way for 1,000 users and 100 million
  users, when the actual scale should meaningfully change decisions like whether a single
  database is sufficient or sharding is needed.
- **Never naming a bottleneck** — an interviewer specifically listens for "here's what would break
  first under load, and here's how I'd address it" — a design presented as having no weaknesses
  at all reads as either inexperience or a lack of critical self-review.
- **Designing for hypothetical future scale that wasn't asked for** — the opposite failure:
  overengineering for requirements nobody stated, at the cost of not fully addressing what
  actually was asked (see §98's overengineering point).

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I always start an HLD answer with clarifying requirements and a rough scale estimate before
  naming any specific technology."
- "I explicitly identify at least one likely bottleneck in my own design and how I'd address it,
  rather than presenting it as having no weaknesses."
- "I match the complexity of my design to the actual stated scale, not a hypothetical future one
  nobody asked about."

### 5. Interview-Ready Answer

> "My structure for a design question is requirements first — functional and non-functional,
> including a rough scale estimate — then API and data model, then components and how they
> connect, and I finish by explicitly naming the most likely bottleneck in my own design and how
> I'd address it. The scale estimate specifically shapes everything downstream — a design for a
> thousand users and a design for a hundred million shouldn't look the same, and I want to show
> that connection explicitly rather than jumping straight to a specific technology out of habit."

### 6. Go Deeper

companion Software Systems Handbook's §92 (High-Level Design (HLD): The Architect's Repeatable
Framework) chapter (the full structured methodology this chapter summarizes) and companion
Software Systems Handbook's §104 (Interview Translation: What the Interviewer Is Actually
Testing) chapter.

---
