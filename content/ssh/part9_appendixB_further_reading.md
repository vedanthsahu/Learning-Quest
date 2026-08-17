## Appendix B: Further Reading and Primary Sources

*A consolidated bibliography of every source cited across this handbook's chapter-level "Further Reading" sections, organized by subject area. Each entry notes the chapter(s) where it was originally cited.*

### Foundational Texts

- Martin Kleppmann, *Designing Data-Intensive Applications* — cited across §6.10, §7.8, §8.8, §9.9, §31.10, §32.9, §34.9, §35.9, §37.9, §53.9, §62.9. The single most-referenced book in this handbook; read in full if only one book is read beyond this one.
- Jim Gray & Andreas Reuter, *Transaction Processing: Concepts and Techniques* — §6.10, §32.9
- Alex Petrov, *Database Internals* — §31.10
- Silberschatz, Galvin, Gagne, *Operating System Concepts* — §2.10, §25.9
- Kurose & Ross, *Computer Networking: A Top-Down Approach* — §3.9, §27.10
- Maurice Herlihy & Nir Shavit, *The Art of Multiprocessor Programming* — §26.10
- Alex Xu, *System Design Interview* (Volumes 1-2) — §80.8

### Distributed Systems and Consensus

- Leslie Lamport, "Time, Clocks, and the Ordering of Events in a Distributed System" (1978) — §9.9, §37.9
- Michael Fischer, Nancy Lynch, Michael Paterson, "Impossibility of Distributed Consensus with One Faulty Process" (1985) — §36.10
- Diego Ongaro & John Ousterhout, "In Search of an Understandable Consensus Algorithm" (2014, the Raft paper) — §36.10
- Mike Burrows, "The Chubby Lock Service for Loosely-Coupled Distributed Systems" (2006) — §64.9
- Shapiro, Preguiça, Baquero, Zawirski, "Conflict-Free Replicated Data Types" (2011) — §37.9
- Giuseppe DeCandia et al., "Dynamo: Amazon's Highly Available Key-value Store" (2007) — §8.8, §34.9
- Eric Brewer, "CAP Twelve Years Later: How the 'Rules' Have Changed" (2012) — §38.9
- Daniel Abadi, "Consistency Tradeoffs in Modern Distributed Database System Design" (2012, the PACELC paper) — §38.9
- James Corbett et al., "Spanner: Google's Globally-Distributed Database" (2012) — §62.9
- Kyle Kingsbury (Jepsen), database partition-tolerance testing reports (jepsen.io) — §32.9, §63.9

### Networking

- Cloudflare Learning Center, "What Happens When You Type a URL Into Your Browser" — §3.9
- Daniel Stenberg, "HTTP/3 Explained" — §27.10
- David Karger et al., "Consistent Hashing and Random Trees" (1997) — §28.9
- NGINX, "Load Balancing Methods" (official documentation) — §28.9
- Cloudflare Learning Center, "What Is Anycast?" and "What Is Edge Computing?" — §59.10
- Akamai, "Content Delivery Network (CDN) — How It Works" — §59.10

### APIs, Auth, and Security

- Roy Fielding, *Architectural Styles and the Design of Network-based Software Architectures* (2000) — §4.9
- Martin Fowler, "Consumer-Driven Contracts" — §4.9
- OWASP, "Broken Access Control" and "OWASP Top 10" — §5.8, §49.10
- Google, *BeyondCorp* papers / Rory Ward & Betsy Beyer, "BeyondCorp" (2014) — §5.8, §61.8
- RFC 6749 (OAuth 2.0) and the OpenID Connect Core specification — §30.10
- Google, "Zanzibar: Google's Consistent, Global Authorization System" (2019) — §30.10
- Leonard Richardson & Sam Ruby, *RESTful Web APIs* — §29.12
- Stripe API Documentation, "Idempotent Requests" — §29.12, §91.E
- Adam Shostack, *Threat Modeling: Designing for Security* — §17.9, §49.10
- NIST SP 800-207, "Zero Trust Architecture" — §61.8
- NIST SP 800-53 — §72.9
- AICPA, "SOC 2" Trust Services Criteria — §72.9

### Storage, Databases, and Data Platforms

- Markus Winand, *SQL Performance Explained* — §33.10
- PostgreSQL Official Documentation, "Using EXPLAIN" — §33.10
- HashiCorp, "Terraform State" (official documentation) — §47.9
- Weaveworks, "GitOps - Operations by Pull Request" — §47.9
- Matei Zaharia et al., "Lakehouse: A New Generation of Open Platforms" (2021) — §75.9
- Apache Airflow official documentation, "Concepts" — §75.9
- Twitter Engineering, "Announcing Snowflake" (2010) — §35.9

### Caching and Messaging

- Facebook Engineering, "Scaling Memcache at Facebook" (2013) — §10.8, §39.11, §65.9
- Redis documentation, "Cache invalidation" and "Client-side caching" — §39.11
- Gregor Hohpe & Bobby Woolf, *Enterprise Integration Patterns* — §11.9, §40.9
- Apache Kafka documentation, "Consumer Groups" and "Delivery Semantics" — §40.9
- Confluent, "Kafka: The Definitive Guide" — §66.9
- LinkedIn Engineering, "Kafka: a Distributed Messaging System for Log Processing" (2011) — §66.9
- Chris Richardson, *Microservices Patterns* — §41.10
- Martin Fowler, "Event Sourcing" — §41.10

### Microservices, Cloud, and Infrastructure

- Martin Fowler & James Lewis, "Microservices" — §12.8
- Eric Evans, *Domain-Driven Design* — §12.8
- Melvin Conway, "How Do Committees Invent?" (1968) — §67.9
- Matthew Skelton & Manuel Pais, *Team Topologies* — §67.9
- Michael Nygard, *Release It!* — §42.9
- William Morgan (Linkerd), "What's a service mesh?" — §42.9
- Docker, "What is a Container?" — §14.8
- Kelsey Hightower, Brendan Burns, Joe Beda, *Kubernetes: Up and Running* — §14.8, §45.11
- Kubernetes Operator Pattern (official docs) / CNCF Operator Framework — §45.11
- CNCF, "Multi-Cluster Kubernetes" whitepapers — §69.9
- NIST SP 800-145, "The NIST Definition of Cloud Computing" — §13.8
- Corey Quinn (Last Week in AWS) — §13.8
- The FinOps Foundation, "FinOps Framework" — §23.8, §68.9, §78.8
- Jez Humble & David Farley, *Continuous Delivery* — §15.8, §46.10
- Pete Hodgson, "Feature Toggles" (martinfowler.com) — §46.10
- Google Engineering, "Why Google Stores Billions of Lines of Code in a Single Repository" (2016) — §70.9

### Observability, Performance, and Reliability

- OpenTelemetry official documentation — §48.9
- Charity Majors, Liz Fong-Jones, George Miranda, *Observability Engineering* — §16.8
- Cindy Sridharan, writing on cardinality and sampling — §71.9
- Honeycomb Engineering blog — §71.9
- Brendan Gregg, *Systems Performance* — §50.9, §58.9
- Ulrich Drepper, "What Every Programmer Should Know About Memory" (2007) — §58.9
- Jeffrey Dean & Luiz André Barroso, "The Tail at Scale" (2013) — §50.9, §73.8
- Julia Evans, "Async IO on Linux" — §2.10, §25.9
- Martin Thompson et al., "Mechanical Sympathy" blog / LMAX Disruptor whitepaper — §26.10, §51.9
- Google, *Site Reliability Engineering* (the "SRE book") — §1.10, §16.8, §19.8, §24.8, §50.9, §52.10, §57.11, §73.8, §74.9, §79.10
- Google, *The Site Reliability Workbook* — §79.10
- Netflix Technology Blog, "The Netflix Simian Army" — §19.8, §74.9
- Casey Rosenthal & Nora Jones, *Chaos Engineering* — §52.10
- John Allspaw, "Blameless PostMortems and a Just Culture" — §24.8
- Michael Nygard, "Documenting Architecture Decisions" (2011) — §57.11
- Neil Gunther, "Guerrilla Capacity Planning" / *The Practical Performance Analyst* — §18.8, §23.8, §56.9
- Cary Millsap & Jeff Holt, *Optimizing Oracle Performance* — §56.9

### Search, Vector Databases, and AI Infrastructure

- Manning, Raghavan, Schütze, *Introduction to Information Retrieval* — §21.8
- Malkov & Yashunin, "Efficient and Robust ANN Search Using HNSW" (2016) — §21.8, §54.10
- Stephen Robertson & Hugo Zaragoza, "The Probabilistic Relevance Framework: BM25 and Beyond" — §54.10
- Elasticsearch/OpenSearch official documentation — §76.8
- Facebook Engineering, "Faiss" and distributed vector search posts — §76.8
- Kwon et al., "Efficient Memory Management for LLM Serving with PagedAttention" (2023) — §22.10, §55.11, §77.8
- Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020) — §22.10, §55.11
- Tyler Akidau et al., "The Dataflow Model" (2015) — §20.8
- Tyler Akidau, Slava Chernyak, Reuven Lax, *Streaming Systems* — §53.9

### Incidents, Capacity, and Organizational Practice

- Richard Cook, "How Complex Systems Fail" — §1.10
- Jim Gray, "Why Do Computers Stop and What Can Be Done About It?" (1985) — §1.10

---
