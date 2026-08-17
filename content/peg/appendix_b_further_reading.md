## Appendix B: Deep-Dive Index — Where to Go When Two Minutes Isn't Enough

*Every chapter in this book ends with a "Go Deeper" pointer into the five companion handbooks.
This appendix consolidates the headline pointers by Part, so you don't have to open every chapter
individually to find where to go next once a topic in this book stops being enough. Every chapter
number below is a real, clickable link, verified against each companion book's actual table of
contents — not a guessed or paraphrased title.*

### Parts I-IV: Web, Load Balancing, Deployment, Runtime
companion Software Systems Handbook's §3 (Mental Model: Networking), companion Software Systems
Handbook's §27 (Networking Internals: TCP, HTTP/1.1->2->3, TLS, DNS), companion Software Systems
Handbook's §28 (Load Balancing Algorithms & Reverse Proxies), companion Software Systems
Handbook's §14 (Mental Model: Containers & Kubernetes), companion Software Systems Handbook's §44
(Containers Deep Dive: namespaces, cgroups, image layers), and companion Software Systems
Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary, rolling) chapters cover this
entire range in full protocol-level and infrastructure-level depth. companion Cloud Engineering
Playbook's §7 (Route 53), companion Cloud Engineering Playbook's §8 (CloudFront), companion Cloud
Engineering Playbook's §10 (Application Load Balancer), and companion Cloud Engineering
Playbook's §3 (Running Containers on AWS: ECS & EKS) chapters cover the AWS-specific mechanics.

### Part V: Backend APIs & Service Design
companion Python Backend Engineering Handbook's §16 (ASGI, Starlette & Uvicorn), companion Python
Backend Engineering Handbook's §23 (OpenAPI Generation & API Contracts), companion Python Backend
Engineering Handbook's §59 (Authentication & Authorization Implementation Patterns), and
companion Python Backend Engineering Handbook's §67 (Retries, Timeouts & Circuit Breakers)
chapters. companion Software Systems Handbook's §29 (API Design Deep Dive: REST/RPC/gRPC/GraphQL,
idempotency) and companion Software Systems Handbook's §30 (AuthN/AuthZ Mechanisms: sessions,
JWT, OAuth2/OIDC, RBAC/ABAC) chapters.

### Part VI: Databases & Data Access
companion Python Backend Engineering Handbook's §24 (PostgreSQL for Backend Engineers), companion
Python Backend Engineering Handbook's §27 (Transactions & Isolation Levels), and companion Python
Backend Engineering Handbook's §30 (Query Optimization, Indexes & the N+1 Problem) chapters.
companion Software Systems Handbook's §32 (Transactions & Concurrency Control: ACID, isolation,
MVCC) and companion Software Systems Handbook's §34 (Replication Mechanics: sync/async/semi-sync,
quorum) chapters. companion DSA Engineering Handbook's §14 (B-Trees), companion DSA Engineering
Handbook's §45 (PostgreSQL: How B+Trees, Heaps & MVCC Find Your Row), and companion DSA
Engineering Handbook's §46 (MySQL/InnoDB: Clustered Indexes & the B+Tree-as-Storage Model)
chapters for storage-engine internals specifically.

### Part VII: Caching & Redis
companion Python Backend Engineering Handbook's §35 (Redis for Backend Engineers) and companion
Python Backend Engineering Handbook's §47 (Caching Architecture) chapters. companion Software
Systems Handbook's §39 (Caching Mechanics: eviction, write strategies, stampede/avalanche)
chapter. companion DSA Engineering Handbook's §21 (Skip Lists) and companion DSA Engineering
Handbook's §23 (LRU Cache) chapters for the underlying data structures.

### Part VIII: Queues & Async Work
companion Python Backend Engineering Handbook's §36 (Message Brokers: RabbitMQ & Kafka) and
companion Python Backend Engineering Handbook's §48 (Background Workers, Scheduling &
Event-Driven Backends) chapters. companion Software Systems Handbook's §40 (Message Queue
Mechanics: delivery guarantees, ordering, DLQs) chapter. companion Cloud Engineering Playbook's
§14 (Queues & Pub/Sub: SQS & SNS) and companion Cloud Engineering Playbook's §15 (EventBridge)
chapters.

### Part IX: Observability & Production Incidents
companion Python Backend Engineering Handbook's §64 (Structured Logging & Log Design) and
companion Python Backend Engineering Handbook's §65 (Metrics, Tracing & Observability) chapters.
companion Software Systems Handbook's §16 (Mental Model: Observability) and companion Software
Systems Handbook's §48 (Observability Mechanics: metrics, OpenTelemetry, tracing, logging)
chapters. companion Cloud Engineering Playbook's §18 (Observability on AWS: CloudWatch & X-Ray)
chapter.

### Part X: Reliability, Scaling & Failure Handling
companion Python Backend Engineering Handbook's §67 (Retries, Timeouts & Circuit Breakers)
chapter. companion Software Systems Handbook's §52 (Reliability Engineering Deep Dive) and
companion Software Systems Handbook's §51 (Scalability Patterns Deep Dive) chapters. companion
Cloud Engineering Playbook's §23 (Auto Scaling) chapter and its entire Part VI, Cloud Failure
Engineering (§49-56).

### Part XI: Security & Permissions
companion Python Backend Engineering Handbook's §59 (Authentication & Authorization
Implementation Patterns), companion Python Backend Engineering Handbook's §60 (CSRF, CORS &
Security Headers), companion Python Backend Engineering Handbook's §62 (Secrets, Password Hashing
& Secure File Uploads), and companion Python Backend Engineering Handbook's §63 (Injection
Attacks, SSRF & the OWASP Top 10) chapters.

### Part XII: Cloud & Infrastructure
companion Cloud Engineering Playbook's §1 (EC2), companion Cloud Engineering Playbook's §4 (S3),
companion Cloud Engineering Playbook's §6 (VPC), companion Cloud Engineering Playbook's §16
(IAM), and companion Cloud Engineering Playbook's §17 (Secrets & Encryption: Secrets Manager &
KMS) chapters are the direct, deeper version of every chapter here, and companion Cloud
Engineering Playbook's §47 (Hard-Choice Decision Trees) chapter and its entire Part VI, Cloud
Failure Engineering, extend directly on this Part's material.

### Part XIII-XVI: Git, Testing, Files, Search & Data
companion Software Systems Handbook's §46 (CI/CD Mechanics: pipelines, blue-green, canary,
rolling) chapter. companion Python Backend Engineering Handbook's §49 (Testing Philosophy &
pytest Fundamentals), companion Python Backend Engineering Handbook's §51 (Integration, API &
Database Testing), and companion Python Backend Engineering Handbook's §41 (Multipart & Streaming
Uploads) chapters. companion Cloud Engineering Playbook's §25 (OpenSearch Service) chapter.
companion DSA Engineering Handbook's §53 (Elasticsearch: Inverted Indexes & Tries) chapter.
companion Software Systems Handbook's §53 (Data Pipelines Deep Dive) chapter.

### Part XVII: AI Product Engineering
companion AI Systems Handbook's §2 (Mental Model: Transformers & LLMs), companion AI Systems
Handbook's §6 (Mental Model: RAG), companion AI Systems Handbook's §15 (Token Economics Deep
Dive), companion AI Systems Handbook's §21 (Retrieval Mechanics: BM25, ANN, rerankers, ColBERT),
companion AI Systems Handbook's §23 (RAG Architectures Deep Dive), companion AI Systems
Handbook's §25 (Agent Mechanics: tool calling, memory, MCP, A2A), companion AI Systems Handbook's
§29 (AI Evaluation Mechanics: LLM-as-judge, RAGAS), companion AI Systems Handbook's §30 (AI
Security Mechanics: prompt injection, guardrails), companion AI Systems Handbook's §33
(Production Cost Engineering), companion AI Systems Handbook's §35 (Production Hallucination
Diagnosis & Mitigation), and companion AI Systems Handbook's §36 (Production Agent Reliability
Engineering) chapters cover every chapter in this Part in genuine depth.

### Part XVIII-XX: Time/i18n, Communication, Product Judgment
companion Python Backend Engineering Handbook's §38 (Structured Data Formats: CSV, Excel, JSON,
XML & ZIP) chapter. companion Software Systems Handbook's §102 (Engineering Decision Catalog: 10
worked decision trees) and companion Software Systems Handbook's §92 (High-Level Design (HLD):
The Architect's Repeatable Framework) chapters — the ADR discipline and requirements-first
methodology this Part summarizes are covered there in full, worked-example depth.

### Part XXI: Interview Fluency
companion Software Systems Handbook's §104 (Interview Translation: What the Interviewer Is
Actually Testing) chapter. companion Python Backend Engineering Handbook's §93 (The Backend
Interview Framework) chapter. companion AI Systems Handbook's §61 (The AI System Design Interview
Framework) chapter. companion DSA Engineering Handbook's §58 (Interview Pattern Recognition
Guide) chapter.

### Part XXII: Why Did This Happen
Every entry in this Part links back to its own specific mechanism chapter earlier in this book
(via plain "§N" self-references, no companion-book pointer needed); from there, the relevant
deep-dive above applies. There's no separate deep-dive for the incident-format Part itself — it's
a symptom index into everything above it.

### Part XXIII: Architecture, System Design Vocabulary & Design Patterns
companion Software Systems Handbook's §12 (Mental Model: Microservices vs Monoliths, DDD),
companion Software Systems Handbook's §80 (Capstone Intro: Requirements & Estimation
Methodology), companion Software Systems Handbook's §56 (Capacity Planning Deep Dive: Little's
Law, load testing), companion Software Systems Handbook's §41 (Event-Driven Architecture:
outbox/inbox, CQRS, Saga, event sourcing), companion Software Systems Handbook's §93 (Low-Level
Design (LLD) Foundations: SOLID, GRASP, DI, Repository), and companion Software Systems
Handbook's §94 (The Classic Design Pattern Catalog (Gang of Four)) chapters — the Gang-of-Four
catalog specifically lives here, not in the DSA or Python handbooks. companion Python Backend
Engineering Handbook's §29 (Repository Pattern & Unit of Work) and companion Python Backend
Engineering Handbook's §32 (HTTP Clients & REST Integration) chapters. Neither companion book has
a Kubernetes/service-mesh-specific chapter.

### Part XXIV: Python Practical Fluency
companion Python Backend Engineering Handbook's §2 (Functions, Closures & Decorators), companion
Python Backend Engineering Handbook's §3 (Context Managers, Iterators & Generators), companion
Python Backend Engineering Handbook's §4 (Dataclasses, Enums & Structural Typing (Protocols)),
companion Python Backend Engineering Handbook's §8 (Logging, Packaging, Virtual Environments &
Dependencies), companion Python Backend Engineering Handbook's §12 (AsyncIO Mental Model & the
Event Loop), companion Python Backend Engineering Handbook's §17 (Application Lifespan &
Configuration), companion Python Backend Engineering Handbook's §20 (Dependency Injection in
FastAPI), companion Python Backend Engineering Handbook's §21 (Pydantic: Validation &
Serialization), companion Python Backend Engineering Handbook's §25 (SQLAlchemy Core & ORM
Internals), companion Python Backend Engineering Handbook's §28 (Alembic & Migrations), companion
Python Backend Engineering Handbook's §37 (Celery, Scheduled Work, Object Storage & Search),
companion Python Backend Engineering Handbook's §44 (Configuration & Secrets Management), and
companion Python Backend Engineering Handbook's §49 (Testing Philosophy & pytest Fundamentals)
chapters are the direct, deeper version of every chapter in this Part, including the "Fieldnote"
capstone's worked examples. Neither companion book has a dedicated project-layout/`src`-directory
chapter.

### Part XXV: DSA Interview Surface Fluency
companion DSA Engineering Handbook's §1 (Arrays), companion DSA Engineering Handbook's §2
(Strings), companion DSA Engineering Handbook's §4 (Stacks), companion DSA Engineering Handbook's
§5 (Queues), companion DSA Engineering Handbook's §7 (Hash Tables), companion DSA Engineering
Handbook's §9 (Trees (General Concepts)), companion DSA Engineering Handbook's §16 (Heaps),
companion DSA Engineering Handbook's §19 (Graphs), companion DSA Engineering Handbook's §30 (Two
Pointers), companion DSA Engineering Handbook's §31 (Sliding Window (& Monotonic Stack/Queue)),
companion DSA Engineering Handbook's §35 (Recursion), companion DSA Engineering Handbook's §37
(Dynamic Programming), companion DSA Engineering Handbook's §38 (Backtracking), companion DSA
Engineering Handbook's §39 (Greedy Algorithms), companion DSA Engineering Handbook's §40
(Depth-First Search (DFS)), companion DSA Engineering Handbook's §41 (Breadth-First Search
(BFS)), and companion DSA Engineering Handbook's §58 (Interview Pattern Recognition Guide)
chapters, plus its Appendix C (Master Complexity Cheat Sheet, not individually linkable since
this book's cross-reference mechanism only resolves numbered chapters, not lettered appendices).

### Part XXVI: Cloud Hands-On Scenario Fluency
companion Cloud Engineering Playbook's §16 (IAM), companion Cloud Engineering Playbook's §4 (S3),
companion Cloud Engineering Playbook's §3 (Running Containers on AWS: ECS & EKS), companion Cloud
Engineering Playbook's §8 (CloudFront), companion Cloud Engineering Playbook's §17 (Secrets &
Encryption: Secrets Manager & KMS), and companion Cloud Engineering Playbook's §6 (VPC) chapters
are the direct, deeper mechanics behind every chapter in this Part. companion DSA Engineering
Handbook's §50 (Kubernetes: Heaps, Work Queues & the Scheduler) chapter for scheduler internals.

### Part XXVII: Managed AI Service Fluency
companion AI Systems Handbook's §10 (Mental Model: Inference Engineering), companion AI Systems
Handbook's §27 (Inference Engineering Mechanics: vLLM, quantization), companion AI Systems
Handbook's §44 (Stage 1: Simple Chatbot), companion AI Systems Handbook's §45 (Stage 2:
Conversation History), companion AI Systems Handbook's §46 (Stage 3: Streaming Responses),
companion AI Systems Handbook's §21 (Retrieval Mechanics), companion AI Systems Handbook's §23
(RAG Architectures Deep Dive), companion AI Systems Handbook's §30 (AI Security Mechanics),
companion AI Systems Handbook's §33 (Production Cost Engineering), and companion AI Systems
Handbook's §41 (Production AI Observability & Monitoring at Scale) chapters. companion Cloud
Engineering Playbook's §43 (AI/ML-Serving Patterns) and companion Cloud Engineering Playbook's
§38 (SageMaker) chapters are the closest real references for Bedrock-adjacent architecture —
neither companion book has a Bedrock-specific chapter.

### Part XXVIII: Architecture Pattern Extensions
companion Software Systems Handbook's §11 (Mental Model: Queues & Event-Driven Systems),
companion Software Systems Handbook's §20 (Mental Model: Data Pipelines & Streaming), companion
Software Systems Handbook's §39 (Caching Mechanics), companion Software Systems Handbook's §65
(Caching at Scale), companion Software Systems Handbook's §41 (Event-Driven Architecture:
outbox/inbox, CQRS, Saga, event sourcing), companion Software Systems Handbook's §67
(Microservices at Scale: mesh at scale, Conway's Law), companion Software Systems Handbook's §12
(Mental Model: Microservices vs Monoliths, DDD), companion Software Systems Handbook's §8 (Mental
Model: Replication & Sharding), companion Software Systems Handbook's §63 (Replication & Sharding
at Scale), companion Software Systems Handbook's §60 (Global API Platforms: rate limiting &
gateways at scale), and companion Software Systems Handbook's §42 (Microservices Mechanics)
chapters. companion Python Backend Engineering Handbook's §61 (Rate Limiting & Abuse Prevention)
chapter. companion DSA Engineering Handbook's §54 (Cloud Systems: Priority Queues, Work Queues &
Rate Limiters) chapter. Neither companion book has a single "architectural styles" or "legacy
migration" chapter covering these topics wholesale.

### Part XXIX: Design Pattern Extensions
companion Software Systems Handbook's §94 (The Classic Design Pattern Catalog (Gang of Four))
chapter for full code examples of Proxy, Composite, Command, Iterator, State, and Chain of
Responsibility. companion Python Backend Engineering Handbook's §107 (Engineering Heuristics &
Rules of Thumb) chapter for the anti-pattern/over-engineering discussion.

### Part XXX: Observability Pattern Vocabulary
companion Software Systems Handbook's §16 (Mental Model: Observability), companion Software
Systems Handbook's §71 (Observability at Scale: sampling, cardinality, telemetry cost), companion
Software Systems Handbook's §48 (Observability Mechanics: metrics, OpenTelemetry, tracing,
logging), and companion Software Systems Handbook's §57 (Incident Response Deep Dive: triage,
runbooks, postmortems, ADRs) chapters — the full framework history, OpenTelemetry propagation
setup, error-budget-based alerting methodology, and dashboard-as-code architecture.

### Part XXXI: Common Failure Vocabulary
companion Software Systems Handbook's §65 (Caching at Scale), companion Software Systems
Handbook's §36 (Consensus & Coordination: Paxos, Raft, ZAB, leases), and companion Software
Systems Handbook's §52 (Reliability Engineering Deep Dive) chapters. companion DSA Engineering
Handbook's §48 (Kafka: Queues, Append-Only Logs & Sequential I/O) and companion DSA Engineering
Handbook's §52 (Cassandra & Wide-Column Stores: LSM Trees, Bloom Filters & Consistent Hashing)
chapters for partition-design specifics. companion Python Backend Engineering Handbook's §54 (CPU
& Memory Profiling), companion Python Backend Engineering Handbook's §75 (Why Is Memory
Leaking?), companion Python Backend Engineering Handbook's §14 (Synchronization: Locks,
Semaphores & Queues), and companion Python Backend Engineering Handbook's §15 (Cancellation,
Timeouts, Race Conditions, Backpressure) chapters — DSA doesn't actually cover concurrency or
deadlocks; that territory belongs to Python Backend Engineering Handbook's own Concurrency Part.

---
