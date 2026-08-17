## 84. AI Engineering Checklists

### 84.1 Before Building RAG

- [ ] Confirmed the problem is genuinely a knowledge/grounding gap, not a prompting or fine-tuning problem (§67.1, §6.9).
- [ ] Established whether the corpus fits within a single context window — if so, RAG infrastructure may be unnecessary (§64.3, §47.8).
- [ ] Determined corpus scope: static/enterprise, live/open, or per-user (§75.2 vs §75.4).
- [ ] Chosen a chunking strategy appropriate to the content's structure (§21.6).
- [ ] Decided dense, sparse, or hybrid retrieval based on actual expected query patterns, not assumption (§20.9).
- [ ] Selected a vector database against the actual selection framework (§22.9), not by popularity.
- [ ] Planned explicit grounding/citation instructions from the start (§23.9).
- [ ] Planned a golden dataset and recall/precision evaluation before launch (§21.8, §29.2).

### 84.2 Before Fine-Tuning

- [ ] Ruled out RAG for a knowledge gap and better prompting for a format/behavior gap (§67.1, §26.7).
- [ ] Confirmed the actual need is a stable behavioral/stylistic shift prompting cannot achieve.
- [ ] Verified sufficient quality, diverse training data exists (§26.6) — not just volume.
- [ ] Chosen LoRA/QLoRA (§26.3) as the default starting point rather than full fine-tuning.
- [ ] Planned evaluation on general capability, not just the target behavior (§83.1's catastrophic-forgetting lesson).
- [ ] Considered DPO over full RLHF unless RLHF's specific benefit is demonstrated necessary (§26.9).

### 84.3 Before Deploying (Any Change)

- [ ] Ran the full golden-dataset regression suite and compared against baseline (§29.5).
- [ ] Verified prompt-cache hit rate is unaffected if prompt structure changed (§32.6, §46.6).
- [ ] Checked cost projection against actual token counts, not launch-time estimates (§33.5, §81.4).
- [ ] Confirmed model version is pinned, not floating on a "latest" alias, unless drift monitoring exists (§78.2, §83.7).
- [ ] Considered a canary or shadow deployment for any change touching prompt, model, or retrieval (§31.9).

### 84.4 Before Production (General Readiness)

- [ ] Prompt logging exists and can reconstruct any past request within minutes (§14.9, §31.3).
- [ ] Dimensional token/cost analytics exist, not just an aggregate monthly total (§31.4).
- [ ] A fallback model/provider path exists and has been tested, not just configured (§31.7, §68.6).
- [ ] Token-budget-based rate limiting is in place (§31.8, §31.13).
- [ ] Guardrail layers appropriate to actual risk are in place, not a single monolithic check (§30.2, §74.2).
- [ ] Tenant/user data-scoping is structurally enforced at every data-access point, not just instructed (§54.4, §30.4).

### 84.5 Before Launch (Product-Level)

- [ ] Requirements, hidden constraints, and stakes (§61's Steps 1-2) are explicitly documented, not assumed.
- [ ] Severity classification for potential failures reflects actual domain consequence (§42.5, §65's stakes-calibration).
- [ ] Escalation-to-human paths exist for any action with real, hard-to-reverse consequences (§25.8, §74.3).
- [ ] Evaluation covers safety/robustness dimensions, not just correctness (§29.7).

### 84.6 Before Scaling (10x/100x Growth)

- [ ] Re-validated that the current architecture still holds, per Nova's stage-by-stage evolution model (§56.7's discipline).
- [ ] Checked whether model routing (§27.5, §68.4) becomes necessary given the new query-complexity distribution.
- [ ] Re-tuned ANN index parameters for the new corpus/traffic scale (§21.5, §77.7).
- [ ] Reviewed GPU fleet bin-packing efficiency at the new scale, not just individual instance metrics (§28.3, §41.4).
- [ ] Considered multi-region deployment only if a genuine latency or data-residency driver exists (§55.8) — not preemptively.

### 84.7 Before Choosing Agents (Over a Deterministic Workflow)

- [ ] Confirmed the task's steps genuinely cannot be known in advance (§8.2, §67.2).
- [ ] Accepted the cost/latency variance and reliability tradeoff explicitly (§36, §51.6).
- [ ] Designed unambiguous tool results before writing any agent-loop logic (§36.6, §83.3).
- [ ] Added a `max_steps` safeguard and goal-completion reflection from the start, not as an afterthought (§25.11, §51.4).

### 84.8 Before Choosing Workflows (Over Agents)

- [ ] Confirmed the process's steps are genuinely fixed and known in advance (§70.1).
- [ ] Verified the fixed sequence handles realistic edge cases without excessive exception-handling (§70.1's failure mode).

### 84.9 Before Increasing Context Window Size

- [ ] Identified what's actually consuming current context budget — history, retrieval, or genuinely necessary content (§67.3, §24.7).
- [ ] Ruled out context compression and better chunking as cheaper fixes first (§24.5, §21.6).
- [ ] Validated the target model's *effective* quality at the new length, not just its advertised maximum (§19.7).

### 84.10 Before Changing Models (Upgrade or Provider Switch)

- [ ] Ran win-rate evaluation comparing old and new models on the golden dataset before committing (§29.8, §83.7).
- [ ] Verified whether the new model's tokenizer/behavior differences affect prompt engineering tuned for the old model (§16.7, §68.6).
- [ ] Confirmed a fallback path exists to the prior model if regression is discovered post-launch (§78.4).
- [ ] Pinned to a specific version rather than a floating alias, unless drift monitoring is explicitly in place (§78.2).

### 84.11 Before Switching Embedding Models

- [ ] Planned and scheduled a full corpus re-embed, not a partial one (§20.7, §38.9).
- [ ] Verified the new model's similarity-metric requirement (cosine vs. dot product) and reconfigured the vector database accordingly (§20.6, §83.2).
- [ ] Validated retrieval quality on your own domain's evaluation set, not the new model's general benchmark score alone (§20.7).
- [ ] Built an explicit re-embed-completeness verification step as a deployment gate (§38.14).

### 84.12 Before Quantizing a Model

- [ ] Confirmed the actual constraint is GPU memory, not compute speed (§11.6, §27.9).
- [ ] Chosen a quantization format matched to the deployment target — GGUF for CPU/edge, GPTQ/AWQ for GPU serving (§27.6).
- [ ] Evaluated quality post-quantization against the golden dataset before trusting it in production (§27.9).

### 84.13 Before Using (Long-Term) Memory

- [ ] Confirmed the need is genuinely cross-session, not just within-conversation history (§67.9, §71.4).
- [ ] Distinguished semantic (stable facts) from episodic (specific events) storage needs (§71.2-71.3).
- [ ] Designed structural per-user scoping for every memory read and write path (§54.9, §79.5).
- [ ] Planned a memory-compression/staleness-management strategy for long-tenured users (§71.5, §48.6).

### 84.14 Engineering Intuition

> **How should these checklists actually be used?** As a pre-mortem tool — walk through the relevant checklist *before* building, not as a post-hoc audit after something has already gone wrong; every item traces back to a real, named failure mode elsewhere in this handbook that the checklist exists specifically to prevent.

> **What would over-engineering checklist usage look like?** Treating every checklist as mandatory for every change regardless of scale or stakes — a small, low-traffic internal tool doesn't need the full "Before Scaling" checklist; match checklist rigor to the actual stakes and scale of the system (§65's calibration principle, applied to process rather than architecture).

### 84.15 Further Reading

- Every cross-referenced section above traces to its full diagnostic or mechanism treatment earlier in this handbook — these checklists are deliberately terse pointers, not replacements for that depth.

---
