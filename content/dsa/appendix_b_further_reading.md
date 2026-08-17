## Appendix B: Further Reading & Primary Sources

### B.1 How to Use This Appendix

This book deliberately omits mathematical proofs and exhaustive derivations in favor of
engineering intuition. This appendix points to where the deeper, more rigorous treatment lives
for readers who want it, without requiring that depth to use this book effectively day to day.

### B.2 Classic Algorithms References (for derivations and proofs this book intentionally skips)

*Introduction to Algorithms* (Cormen, Leiserson, Rivest, Stein — "CLRS") remains the standard
reference for formal proofs of every complexity bound this book states without derivation,
including Red-Black Tree invariant proofs (§13), Union-Find's inverse-Ackermann analysis (§20),
and the Master Theorem (§36). *The Algorithm Design Manual* (Skiena) is a more engineering-
oriented companion, closer in spirit to this book's own framing, with a strong "which algorithm
for which real problem" orientation.

### B.3 Database Internals (Part IV, §45-46)

*Database Internals* (Petrov) is the direct, deeper source behind this book's B+Tree (§15),
LSM Tree (§25), and PostgreSQL/MySQL (§45-46) chapters — covering storage engine internals in
far more depth than this field guide's scope allows. The PostgreSQL and MySQL/InnoDB official
documentation's own internals sections are the primary, most current sources for exact
implementation details as each database evolves.

### B.4 Distributed Systems (Part IV, §52)

*Designing Data-Intensive Applications* (Kleppmann) is the standard deeper reference behind this
book's Consistent Hashing (§24), LSM Tree (§25), and Cassandra (§52) chapters, covering
replication, partitioning, and consistency models in far more depth. The original Amazon Dynamo
paper and the Google Bigtable paper are the primary sources behind the wide-column/eventually-
consistent store design this book's §52 summarizes practically.

### B.5 AI Infrastructure & Vector Search (Part IV, §55, and §27)

The companion **AI Systems Engineering Handbook** is the deeper reference for everything §27 and
§55 touch only at the structural/integration level — embedding generation, RAG architecture, and
production AI system design are covered there in full depth, not repeated here. The original HNSW
paper (Malkov & Yashunin) and the FAISS project's own documentation are the primary sources for
implementation-level detail beyond this book's engineering-intuition framing.

### B.6 Operating Systems (Part IV, §49)

*Operating Systems: Three Easy Pieces* (Arpaci-Dusseau) is a freely available, practically-
oriented reference for the scheduling concepts underlying §49's Linux CFS discussion. The Linux
kernel's own `Documentation/scheduler/` source tree is the authoritative, most current source for
CFS implementation details as the kernel evolves.

### B.7 Companion Handbooks in This Series

The **Software Systems Engineering Handbook**, **Python Backend Engineering Handbook**, **AI
Systems Engineering Handbook**, and **Cloud Engineering Playbook** are this book's direct
companions — each assumes this book's DSA foundations and builds further in its own domain
(distributed systems design, backend engineering practice, AI system architecture, and AWS-
primary cloud engineering, respectively) without re-deriving the structures and algorithms
covered here.

### B.8 Practice (used deliberately, not as this book's own focus)

This book is explicitly not a problem-solving manual (front_matter.md §0.2) — for problem-
solving practice once the underlying structures and patterns here are understood, standard
platforms (LeetCode, and similar) are the appropriate next step, applying §58's pattern-
recognition guide to real problems under time pressure.

---
