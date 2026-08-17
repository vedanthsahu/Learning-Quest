## Appendix D: Decision Tree Index

*Every decision tree in this handbook, consolidated by the question it answers.*

### Model & Architecture Selection
- Closed API vs. open-weight model — §1.9
- Decoder-only vs. encoder-only vs. encoder-decoder — §18.9
- MoE vs. dense model — §18.9
- Which vector database fits my constraint — §22.11
- Which RAG architecture fixes my observed problem — §23.11
- Should I fine-tune, and with what technique — §26.9
- What inference engineering investment do I need — §27.10
- What AI infrastructure orchestration do I need — §28.10

### Retrieval & RAG
- BM25 vs. dense vs. hybrid — §4.9
- What retrieval mechanism do I actually need — §21.10
- What embedding approach fits my retrieval problem — §20.9
- Do I need to think about tokenization directly — §16.9
- Diagnosing poor retrieval — §34.11
- Diagnosing an embedding or reranking regression — §38.13

### Prompting & Context
- Which prompt/context technique addresses my situation — §24.9
- Where in the token-economics chain is my cost/latency problem — §15.12
- Is an attention-related concept actually my problem to solve — §17.9

### Agents
- What agent architecture fits my task — §25.10
- Diagnosing an agent loop — §36.11
- Choosing a planning strategy for a multi-tool task — §50.8
- Is Nova's single-agent-with-reflection design still sufficient — §51.8

### Fine-Tuning
- RAG vs. fine-tuning — §6.9
- Should I fine-tune, and with what technique — §26.9

### Evaluation
- What evaluation do I need, and when — §12.7
- What evaluation mechanism do I need to build next — §29.10
- What evaluation-at-scale investment do I need — §39.11
- What should Nova evaluate first — §52.8

### Security
- What AI security layer do I need — §13.9
- What AI security mechanism do I need to implement next — §30.9
- Responding to a security operations signal — §40.11
- Is a new Nova feature tenant-safe — §54.8
- What guardrail layer does a new Nova capability need — §53.8
- Should a new Nova capability be a tool — §49.8

### Operations & Production Diagnosis
- What AI operations investment do I need first — §14.9
- What operational instrumentation do I build next — §31.12
- Diagnosing a latency regression — §32.11
- Diagnosing a cost spike — §33.11
- Diagnosing a hallucination report — §35.11
- Diagnosing low GPU utilization or poor throughput — §37.11
- Diagnosing an observability-at-scale problem — §41.11
- The unified AI incident triage sequence — §42.8

### Capstone (Nova)
- How to read this capstone — §43.7
- Is your product ready to move past Stage 1 — §44.8
- Choosing a context-management strategy — §45.8
- Diagnosing and fixing rising time-to-first-token — §46.8
- Is naive RAG sufficient at this stage — §47.8
- Designing Nova's memory system — §48.8
- Does a new Nova deployment need multi-region architecture — §55.8
- Applying this capstone's discipline to a real product — §56.7

---
