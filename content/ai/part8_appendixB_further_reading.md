## Appendix B: Further Reading & Primary Sources

*Every source cited across this handbook, grouped by topic area, with the chapter(s) it supports.*

### Foundational Architecture
- Vaswani et al., "Attention Is All You Need" (2017) — §17
- Su et al., "RoFormer: Enhanced Transformer with Rotary Position Embedding" (2021) — §17.7
- Shazeer et al., "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer" (2017) — §18.6
- Dao et al., "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness" (2022) — §18.5
- Leviathan et al., "Fast Inference from Transformers via Speculative Decoding" (2023) — §18.7
- Holtzman et al., "The Curious Case of Neural Text Degeneration" (2019) — §19.4

### Tokenization
- Sennrich et al., "Neural Machine Translation of Rare Words with Subword Units" (2016) — §16.3
- Kudo & Richardson, "SentencePiece: A simple and language independent subword tokenizer" (2018) — §16.5
- OpenAI, "What are tokens and how to count them" (tiktoken documentation) — §15.2

### Embeddings & Retrieval
- Reimers & Gurevych, "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks" (2019) — §20.5
- MTEB (Massive Text Embedding Benchmark) leaderboard — §20.7
- Robertson & Zaragoza, "The Probabilistic Relevance Framework: BM25 and Beyond" (2009) — §21.2
- Malkov & Yashunin, "Efficient and robust approximate nearest neighbor search using HNSW graphs" (2018) — §21.5
- Khattab & Zaharia, "ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT" (2020) — §21.7

### RAG Architectures
- Yan et al., "Corrective Retrieval Augmented Generation" (2024) — §23.4
- Jeong et al., "Adaptive-RAG: Learning to Adapt Retrieval-Augmented Large Language Models through Question Complexity" (2024) — §23.5
- Asai et al., "Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection" (2023) — §23.8
- Edge et al., "From Local to Global: A Graph RAG Approach to Query-Focused Summarization" (2024) — §23.7
- Es et al., "RAGAS: Automated Evaluation of Retrieval Augmented Generation" (2023) — §12.4, §29.6

### Prompting & Agents
- Wei et al., "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models" (2022) — §24.4
- Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models" (2022) — §24.4, §25
- Anthropic, "Building Effective Agents" (2024) — §25.3, §36, §57.4
- The Model Context Protocol (MCP) specification — §25.7

### Fine-Tuning & Alignment
- Hu et al., "LoRA: Low-Rank Adaptation of Large Language Models" (2021) — §26.3
- Dettmers et al., "QLoRA: Efficient Finetuning of Quantized LLMs" (2023) — §26.3
- Rafailov et al., "Direct Preference Optimization: Your Language Model is Secretly a Reward Model" (2023) — §26.5
- Bai et al., "Constitutional AI: Harmlessness from AI Feedback" (2022) — §26.5

### Inference & Infrastructure
- Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention" (2023) — §27.4
- Frantar et al., "GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers" (2022) — §27.6
- Lin et al., "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration" (2023) — §27.6
- Rajbhandari et al., "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models" (2020) — §28.7
- NVIDIA, "CUDA C++ Programming Guide" (introductory sections) — §11.9
- Ray and Kubernetes GPU device-plugin documentation — §28.12

### Evaluation
- Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" (2023) — §12.9, §29.3

### Security
- Greshake et al., "Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection" (2023) — §13.2
- OWASP Top 10 for Large Language Model Applications — §13.11, §30.11
- NIST AI Risk Management Framework — §30.11

### Hallucination
- Ji et al., "Survey of Hallucination in Natural Language Generation" (2023) — §35.13

### Observability & Tooling
- LangSmith, Langfuse, and Weights & Biases Weave documentation — §14.11, §31.14

### Reverse Engineering Sources
- OpenAI and Anthropic published system/model cards and safety documentation — §57
- Published documentation from Perplexity and major AI labs' deep-research announcements — §58
- Published documentation from Cursor, GitHub Copilot, and Windsurf — §59
- Published documentation from Google (NotebookLM) and Lovable — §60

### Companion Handbook Cross-References
- The companion Software Systems Engineering Handbook, particularly: §9 (Greedy Algorithms), §11.3 (Paged Virtual Memory), §14/§45/§69 (Kubernetes), §17.3 (Trust Boundaries), §18.4 (Horizontal Scaling), §28 (Load Balancing), §30.6 (RBAC/ABAC), §33-38 (Database Selection Framework), §34 (Zero-Downtime Migration), §41 (Real-Time Communication), §42.5 (Circuit Breaker), §46.4/§101.2 (Canary/Shadow Deployment), §48 (Observability Mechanics), §49 (Security/Injection/Secrets), §50 (Latency Engineering), §57 (Incident Response), §60.2/§60.3 (Rate Limiting/Multi-Tenancy), §68.5/§77-78 (FinOps/Cloud Cost) — referenced throughout Parts I-IV as the general-systems foundation this handbook builds on.

---
