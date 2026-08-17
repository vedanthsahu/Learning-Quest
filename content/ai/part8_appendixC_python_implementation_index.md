## Appendix C: Python Implementation Index

*Every code snippet in this handbook, what it demonstrates, and where to find it.*

| § | Snippet | Demonstrates |
|---|---|---|
| 1.8 | First API call, reading usage fields | Token usage accounting from a raw API response |
| 2.8 | `tiktoken` token counting | Tokens ≠ words |
| 3.8 | `SentenceTransformer` + cosine similarity | Embedding-based semantic similarity |
| 4.8 | `rank_bm25` + dense score combination | Hybrid retrieval scoring |
| 5.8 | In-memory vector search with metadata filter | Minimal vector search + filtering |
| 6.8 | Grounded-prompt builder | Minimal RAG prompt assembly |
| 7.8 | Few-shot prompt assembly | Constructing a few-shot prompt |
| 8.8 (snippet) | Agent loop with `max_steps` | Preventing infinite agent loops |
| 9.8 | LoRA config via HF PEFT | Trainable-parameter percentage |
| 10.8 | Token-by-token streaming | Streaming response consumption |
| 11.8 | GPU memory capacity check | Pre-flight model-fit check |
| 12.8 | Minimal LLM-as-judge | Faithfulness scoring |
| 13.10 | Regex injection-pattern flagging | Minimal input guardrail |
| 14.10 | Structured prompt logging | JSON prompt/response logging |
| 15.13 | Token-economics chain estimate | End-to-end cost estimation |
| 16.10 | Cross-content-type tokenization | Token-count variance by content type |
| 17.10 | Self-attention from scratch | Query/key/value/softmax mechanics |
| 18.10 | KV cache cost comparison | Quadratic vs. linear regeneration cost |
| 19.10 | Top-p (nucleus) sampling | Nucleus sampling implementation |
| 20.10 | Mean pooling + cosine similarity | Pooling and similarity from scratch |
| 21.11 | Retrieve-then-rerank pipeline | Two-stage retrieval architecture |
| 22.12 | Common vector-DB interface pattern | Upsert + filtered query |
| 23.12 | Corrective RAG grading step | Retrieval-quality gate with fallback |
| 24.10 | Cache-optimized prompt structuring | Maximizing prompt-cache hit rate |
| 25.11 | Tool-calling loop with reflection | Tool execution + result reflection |
| 26.10 | LoRA config + trainable params | PEFT parameter-efficiency proof |
| 27.11 | Static vs. continuous batching simulation | Throughput comparison |
| 28.11 | Bin-packing heuristic | Fleet-scale model placement |
| 29.11 | Win-rate evaluation loop | Position-bias-controlled comparison |
| 30.10 | Schema-constrained tool execution | Structural (not prompted) safety limit |
| 31.13 | Token-budget rate limiter | Rolling-window token-based limiting |
| 32.12 | Segmented latency percentile report | Diagnostic percentile breakdown |
| 33.12 | Cost-per-request divergence detector | Cost-anomaly localization |
| 34.12 | Retrieval-only regression test | Recall@k regression testing |
| 35.12 | Faithfulness + recall diagnosis | Hallucination root-cause split |
| 36.12 | Tool-call repetition detector | Early agent-loop detection |
| 37.12 | Compute vs. memory-bound diagnosis | GPU state classification |
| 38.14 | Re-embed completeness verification | Migration-completeness check |
| 39.12 | Golden-dataset freshness audit | Incident-to-dataset coverage check |
| 40.12 | Guardrail flag-concentration analysis | Targeted-attack vs. false-positive signal |
| 41.12 | Shared-infrastructure health aggregator | Cross-feature dependency health |
| 42.9 | Triage classifier skeleton | First-response incident routing |
| 43.8 | Token-based capacity estimate | Nova launch cost projection |
| 44.9 | Nova Stage 1 request handler | Minimal chatbot implementation |
| 45.9 | Hybrid verbatim + summarized history | Bounded conversation-history growth |
| 46.9 | Cache-optimized Nova prompt assembly | Stage 3 caching structure |
| 47.9 | RAG-augmented prompt assembly | Stage 4 retrieval integration |
| 48.9 | Background memory extraction | Semantic/episodic distillation |
| 49.9 | Narrowly-scoped tool definition | Schema-constrained tool design |
| 50.9 | Multi-tool ReAct loop | Chained tool-call orchestration |
| 51.9 | Agentic loop with goal-completion reflection | Explicit termination check |
| 52.9 | Deployment regression gate | Evaluation-gated deployment |
| 53.9 | Policy engine tool-execution check | Role/amount-based authorization |
| 54.9 | Structural tenant-scoping wrapper | Mandatory multi-tenant filtering |
| 55.9 | Region-aware tenant routing | Data-residency-compliant routing |

---
