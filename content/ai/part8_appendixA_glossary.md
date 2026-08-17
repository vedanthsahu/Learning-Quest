## Appendix A: Glossary

*Every bolded term introduced across this handbook, alphabetical, with its primary defining section.*

**A2A (Agent-to-Agent Protocol)** — Standard for independently-built agents to discover and communicate with each other. §25.7

**Adapters** — PEFT modules inserted between frozen model layers. §26.4

**Adaptive RAG** — Routes queries to different retrieval strategies by complexity. §23.5

**Agentic RAG** — Treats retrieval as a tool an agent invokes adaptively, multiple times. §23.6

**ANN (Approximate Nearest Neighbor)** — Search trading small accuracy loss for speed at scale. §21.5

**Attention** — Mechanism weighting which tokens matter for computing another token's representation. §2.2, §17.2

**AWQ (Activation-aware Weight Quantization)** — Quantization preserving precision for high-impact weights. §27.6

**Beam Search** — Decoding strategy maintaining multiple candidate sequences simultaneously. §19.5

**BM25** — Statistical keyword-relevance scoring algorithm. §4.2, §21.2

**BPE (Byte-Pair Encoding)** — Sub-word tokenization built via iterative frequent-pair merging. §16.3

**Chain-of-Thought (CoT)** — Prompting technique eliciting intermediate reasoning steps. §7.4, §24.4

**Chunking** — Splitting source documents into retrievable units. §21.6

**ColBERT** — Late-interaction retrieval preserving per-token vectors for fine-grained similarity. §21.7

**Constitutional AI** — Alignment technique using written principles for model self-critique. §26.5

**Context Window** — Maximum tokens a model can process in one request. §2.5, §15.5

**Continuous Batching** — Serving technique adding new requests into a running batch dynamically. §27.3

**Corrective RAG (CRAG)** — RAG variant grading retrieval quality and triggering fallback search. §23.4

**Cosine Similarity** — Angle-only vector similarity metric. §3.3, §20.6

**Cross-Encoder** — Reranking model scoring a query-document pair jointly. §21.7

**DeepSpeed** — Library for memory-optimized distributed training (ZeRO). §11.5, §28.7

**DiskANN** — ANN algorithm designed for disk-resident (not fully in-memory) indexes. §21.5

**DPO (Direct Preference Optimization)** — Preference alignment without a separate reward model. §26.5

**Embedding** — Dense vector representation of text capturing meaning. §3.2

**Embedding Drift** — Silent retrieval degradation from an unreconciled embedding-model version change. §20.7

**FAISS** — Library implementing optimized ANN search algorithms. §22.2

**Faithfulness** — RAGAS metric: whether generated claims are supported by retrieved context. §12.4, §29.6

**Few-Shot Prompting** — Including example input-output pairs in a prompt. §7.4, §24.3

**Fine-Tuning** — Adjusting model weights via further training. §9.2

**Flash Attention** — Memory-efficient, mathematically exact attention implementation. §18.5

**GGUF** — Quantization file format optimized for CPU/edge inference. §27.6

**Golden Dataset** — Curated representative inputs with known-good outputs for regression testing. §12.2, §29.2

**GPTQ** — Post-training quantization calibrated per-layer. §27.6

**Grounding** — Structuring generation to answer only from provided context. §6.4, §23.9

**Guardrails** — Input/output validation for natural-language AI systems. §13.5, §30.5

**Hallucination** — Model generating unsupported or fabricated content. §6.5, §35

**HNSW (Hierarchical Navigable Small World)** — Graph-based ANN algorithm. §21.5

**Human-in-the-Loop** — Requiring explicit human approval before high-stakes agent actions. §8.8, §25.8

**Hybrid Search** — Combining dense and sparse/lexical retrieval results. §20.4, §21.4

**IVF (Inverted File Index)** — Cluster-partitioned ANN algorithm. §21.5

**Jailbreak** — Prompt circumventing a model's trained safety behavior. §13.3

**KV Cache** — Stored key/value vectors avoiding redundant attention recomputation during generation. §18.4

**LLM-as-Judge** — Using a model to grade another model's output against criteria. §12.3, §29.3

**LoRA (Low-Rank Adaptation)** — PEFT technique training low-rank weight-update matrices. §26.3

**Long-Term Memory** — Information persisted across sessions, implemented via retrieval. §25.5

**MCP (Model Context Protocol)** — Standard for connecting agents to tools/data sources. §25.7

**Model/Tensor Parallelism** — Splitting a single model across multiple GPUs. §11.4, §28.4

**MoE (Mixture-of-Experts)** — Architecture routing each token to a subset of expert sub-networks. §18.6

**Multi-Agent System** — Splitting a task across several specialized, coordinating agents. §25.6

**Naive RAG** — Baseline retrieve-then-generate pipeline. §6.3, §23.2

**Nucleus (Top-p) Sampling** — Sampling from the smallest token set exceeding cumulative probability p. §19.4

**PagedAttention** — KV-cache memory management using paged allocation (vLLM). §27.4

**PEFT (Parameter-Efficient Fine-Tuning)** — Umbrella term for training a small parameter subset. §26.3

**Policy Engine** — Centralized rule system governing allowed AI actions. §13.7, §30.7

**Positional Encoding** — Information injected so attention can represent token order. §17.6

**PII (Personally Identifiable Information)** — Sensitive user data requiring detection/redaction. §13.4

**Prompt Caching** — Reusing cached prefill computation for a shared, stable prompt prefix. §7.6, §24.6

**Prompt Injection** — Untrusted input manipulating a system's intended instructions. §13.2

**Quantization** — Reducing numeric precision of model weights to save memory. §10.6

**RAG (Retrieval-Augmented Generation)** — Grounding generation in retrieved external content. §6.1

**RAGAS** — Evaluation framework for faithfulness/groundedness/retrieval quality. §12.4, §29.6

**ReAct** — Interleaving reasoning and tool-invocation actions. §7.4, §24.4

**Reasoning Model** — Model trained to generate extended internal reasoning before a final answer. §19.7

**Reflection** — Having a model critique and revise its own prior output. §7.4, §24.4, §25.4

**Reranker** — Second-stage model scoring a small candidate set for final ranking precision. §21.7

**RLHF (Reinforcement Learning from Human Feedback)** — Alignment training via a learned reward model. §9.4, §26.5

**RoPE (Rotary Positional Embeddings)** — Positional encoding via query/key vector rotation. §17.7

**Self-RAG** — RAG variant with a model trained to decide when/what to retrieve and self-critique. §23.8

**Semantic/Episodic Memory** — Stable-fact vs. specific-past-event long-term memory categories. §25.5

**Sentence Transformers** — Encoder models fine-tuned specifically for similarity-optimized pooled embeddings. §20.5

**SentencePiece** — Whitespace-agnostic tokenization framework. §16.5

**SFT (Supervised Fine-Tuning)** — Training on curated input-output pairs for a specific task/format. §9.2, §26.2

**Sparse Embedding** — High-dimensional, mostly-zero vector grounded in keyword presence. §20.3

**Speculative Decoding** — Using a fast draft model to accelerate verified generation. §18.7

**Streaming** — Delivering generated tokens incrementally rather than waiting for full completion. §10.7, §19.6

**Temperature** — Sampling parameter controlling output randomness/confidence. §19.3

**Token** — Fixed sub-word unit; the base unit of cost, context, and computation. §2.4, §15.3

**Tokenizer** — Deterministic function converting text into tokens. §15.2, §16

**Tool/Function Calling** — Structured mechanism for a model to request application-executed actions. §8.2, §25.2

**Tree-of-Thought (ToT)** — Exploring multiple candidate reasoning paths before committing. §24.4

**Vector Database** — System combining ANN search with persistence, filtering, and scaling. §5.2, §22

**WordPiece** — Sub-word tokenization merging pairs by likelihood-increase objective. §16.4

**Zero-Shot Prompting** — Instruction-only prompting without examples. §24.3

---
