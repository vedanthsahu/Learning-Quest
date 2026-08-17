## Appendix B: Further Reading & Primary Sources

### B.1 How to Use This Appendix

Every chapter in this handbook cross-references its own companion chapters internally. This appendix instead points outward — to primary sources, official documentation, and foundational texts worth reading directly once a specific mechanism from this handbook needs deeper investigation than a single chapter can provide.

### B.2 Python Language & Runtime (Part I, Part IX)

The official CPython documentation's data model chapter, for the object/reference semantics behind §1's mutability and identity discussion. The `asyncio` documentation's own "Developing with asyncio" page, specifically its debug-mode section, directly underlying §12 and §55's diagnostic techniques. Raymond Hettinger's talks on Python's iterator protocol and generators, for the mechanism behind §3.

### B.3 Concurrency & the GIL (Part II)

David Beazley's published research and talks on the GIL's internal behavior are the primary source most CPython-level GIL claims in §9 ultimately trace back to. The CPython PEP for the removal of the GIL (PEP 703, "Making the Global Interpreter Lock Optional") is worth reading directly for readers tracking how §9's constraints may change in future Python versions.

### B.4 FastAPI, Starlette & ASGI (Part III)

The ASGI specification itself (asgi.readthedocs.io) is the primary source underlying §16's entire layering discussion — reading the spec directly clarifies exactly what a FastAPI application actually receives from Uvicorn. FastAPI's own documentation is unusually thorough for a web framework and is worth reading end-to-end alongside Part III, not only as a reference.

### B.5 PostgreSQL & SQLAlchemy (Part IV)

"PostgreSQL: Up and Running" (O'Reilly) for operational depth beyond §24's application-focused treatment. The PostgreSQL documentation's own chapter on transaction isolation levels is the primary source behind §27's entire discussion and is worth reading directly for the precise, formal definitions this handbook necessarily simplifies. The SQLAlchemy documentation's "ORM Querying Guide," specifically its section on relationship loading techniques, for depth beyond §29.6's summary.

### B.6 Distributed Systems Concepts (Part V, Part VII)

Martin Kleppmann's "Designing Data-Intensive Applications" remains the standard deeper reference for the delivery-guarantee (§36.5), caching (§47), and consistency concepts this handbook applies specifically to Python backends — read it for the general theory this handbook's chapters apply concretely. The companion Software Systems Engineering Handbook's own distributed-systems Parts cover this same theoretical ground in more depth than this handbook's implementation-focused treatment attempts.

### B.7 Testing (Part VIII)

"Testing Python" by David Sale, for pytest depth beyond §49-53's coverage. The Testcontainers project's own documentation, directly underlying §51.4's integration-testing pattern.

### B.8 Performance (Part IX)

Brendan Gregg's systems-performance work, particularly on profiling methodology, for the general diagnostic discipline underlying §54's Python-specific application of it. The `py-spy` project's own documentation for production-safe profiling techniques beyond §54.3's summary.

### B.9 Security (Part X)

The OWASP Top 10 project's own current documentation (owasp.org) — §63.7 explicitly maps this handbook's chapters onto it, and the primary source is updated more frequently than any book or handbook can track. "The Web Application Hacker's Handbook" for depth on the attack techniques §59-63 defend against.

### B.10 Production Engineering & SRE (Part XI, Part XII)

Google's "Site Reliability Engineering" book (freely available online) for the organizational and cultural practices surrounding the technical mechanisms in §64-69. The OpenTelemetry project's own documentation, directly underlying §65's tracing and metrics implementation.

### B.11 On Engineering Judgment Itself (Part XIII, Part XIV)

The companion Software Systems Engineering Handbook, whose own capstone established the ADR discipline this handbook's capstone (§78-92) directly inherits — read its capstone chapters alongside or before this handbook's Part XIII for the fuller theoretical grounding behind the five-question format. The companion AI Systems Engineering Handbook, for the parallel discipline applied to AI-specific systems, relevant directly to §89's AI Integration stage.

---
