## 93. The Backend Interview Framework

### 93.1 Why a Framework, Not a Question Bank

A backend system-design or coding interview rewards a *process* far more than it rewards having seen the specific question before — an interviewer who has run dozens of these interviews can immediately distinguish a candidate reciting a memorized solution from one genuinely reasoning through the problem, and the latter, even when their final design is imperfect, is consistently rated higher. This chapter gives the process explicitly, so that every later chapter in this Part — the worked examples (§94-95), the trap catalogs (§97-99), the review exercises (§100-103) — can be practiced *through* it rather than as disconnected content.

### 93.2 The Five-Phase Structure

**Phase 1 — Clarify (2-3 minutes).** State your understanding of the problem back to the interviewer and ask about scope, scale, and constraints *before* proposing anything — companion §78.3's ADR discipline applied live: you cannot honestly answer "what are the tradeoffs" without first knowing what's actually being optimized for. **Phase 2 — Establish Requirements (3-5 minutes).** Explicitly separate functional from non-functional requirements (companion §78.4-78.5's exact framing) and state rough scale numbers (requests/second, data volume) even if estimated — this is what makes Phase 3's tradeoffs concrete rather than abstract. **Phase 3 — High-Level Design (10-15 minutes).** Sketch the major components and their interactions before naming specific technologies — the same "mechanism named last" discipline this entire handbook has followed since §0.2's nine-step pipeline. **Phase 4 — Deep Dive (10-15 minutes).** The interviewer will steer you into one or two components for genuine depth — this is where specific Python/FastAPI/database mechanism knowledge (companion Parts I-XI) is actually exercised. **Phase 5 — Wrap-Up (2-3 minutes).** Name the design's weaknesses and what you'd do with more time — an unprompted, honest weaknesses discussion signals more engineering maturity than a design presented as flawless.

### 93.3 What Interviewers Are Actually Scoring

Not "did you reach the same final architecture I had in mind" — few real interviewers score against one fixed correct answer. They score: whether you asked clarifying questions before designing (Phase 1's absence is the single most common reason a strong technical candidate scores poorly); whether your design's complexity matched the stated scale (both under-engineering for a stated high-scale requirement and over-engineering for a stated small one are penalized, directly testing companion §108.10's proportionality principle); whether you could go deep on at least one component when pushed (Phase 4); and whether you communicated your reasoning aloud throughout, not just your conclusions.

### 93.4 The Single Most Common Failure Mode

Jumping directly to Phase 3 or Phase 4 — naming a technology stack in the first two minutes — is, by a wide margin, the most common reason otherwise-technically-strong candidates underperform. It signals pattern-matching against a memorized template rather than genuine reasoning, and it forecloses the clarifying questions that often reveal the interviewer had a specific constraint in mind that changes the entire design. Every worked example in §94-95 explicitly narrates Phase 1 and Phase 2 first, deliberately, to counteract the instinct to skip straight to the interesting part.

### 93.5 How to Practice This Framework Deliberately

Time yourself against the phase durations in §93.2 using a project from the Engineering Challenge Series' progression (a separate, companion project set spanning URL shorteners through distributed systems) or any of §94-95's worked examples, speaking your reasoning aloud even when practicing alone — silently thinking through a design does not build the same skill as narrating it, since interview performance is explicitly a communication skill layered on top of a technical one, and the two must be practiced together.

### 93.6 Mini Lab

Pick any system from this handbook's own capstone (§78-92, Fieldnote) at a stage you haven't yet reached in your own reading, and run yourself through Phases 1-3 *before* reading that stage's actual chapter — comparing your own Phase 2 requirements and Phase 3 design against what the chapter's ADR actually decided is a direct, self-gradable way to calibrate this framework against real, already-written engineering reasoning.

---
