## Project 15: Enterprise RAG Platform

### Problem Statement

Employees want to ask natural-language questions and get answers grounded in the company's own internal documents (policies, reports, wikis) rather than generic knowledge — and, critically, an answer must never be built from a document the asking employee isn't authorized to see, even though those documents may all live in the same underlying knowledge base.

### Functional Requirements

- Ingest a large, growing collection of internal documents into a form that supports finding relevant passages for a given question.
- Accept a natural-language question and return an answer grounded in relevant internal content.
- Cite which specific documents or passages the answer was based on.
- Respect each document's existing access permissions when deciding what can inform an answer for a specific user.

### Non-Functional Requirements

- **Authorization correctness is the single highest-stakes requirement in this entire project** — an answer synthesizing and restating content from a document the user can't access is a more severe, less obviously detectable leak than a plain search result would be, since a generated answer can paraphrase content in ways that obscure its unauthorized source.
- **Freshness**: documents that are updated or newly added should be reflected in future answers within a reasonable time.
- **Answer groundedness**: an answer should be traceable to specific source material, not presented as authoritative without any indication of where it came from.
- **Cost and latency**: retrieving and processing content for every single question has a real computational cost — avoid doing more work than necessary to answer well.

### Project Scope

**In scope**: document ingestion and chunking, retrieval of relevant passages for a query, authorization-scoped retrieval, answer generation with citations. **Out of scope**: fine-tuning a language model on internal data, multi-turn conversational memory across separate sessions, automatic document summarization as a standalone feature.

### Engineering Questions (Answer Them Yourself First)

- If a document a user can't access happens to be the most relevant one for their question, what should happen — is "return no answer" different from "return a plausible-sounding answer built from documents you could access, even if less relevant"?
- Why might building a completely separate, newly-authorized retrieval system be a riskier engineering choice than reusing an already-authorization-scoped search capability from an earlier system?
- If a document is deleted or a user's access to it is revoked, what has to happen to previously-generated answers or cached retrieval results that were based on it?
- What's the actual difference between "the retrieval step returned the right passages" and "the generated answer is factually correct" — can one be right while the other is wrong?

### Architecture Thinking

Sketch where, specifically, the authorization check needs to happen relative to retrieval — does it happen before content is retrieved, or is content retrieved broadly and then filtered afterward? Consider what happens to answer quality and trustworthiness if the system never tells the user which documents it used — would you trust an answer with no citations the same way as one with them? Estimate: if your organization has 50,000 internal documents and a single question needs to be answered in under 3 seconds, does sending the full content of every accessible document to a language model for every single question seem feasible?

### Progressive Hint System

**Level 1**: Consider what "authorization at the point of retrieval" means, specifically, versus checking authorization only after some content has already been gathered. **Level 2**: Research retrieval-augmented generation (RAG) as a pattern, and specifically consider reusing an authorization-scoped search mechanism (like the kind built in an earlier, related project in this series) as your retrieval step, rather than building retrieval and authorization as two separate systems that both need to be independently verified as correct. **Level 3**: Research chunking strategies for breaking documents into retrievable passages, and research explicitly instructing a language model to answer only from provided context and to indicate when it cannot find an answer in that context. **Level 4**: A standard design retrieves a small number of the most relevant document chunks using a search mechanism whose query is *already* scoped to only the documents the requesting user can access (reusing the same authorization-filtering approach as a permission-aware search system, not a separate, newly-built check), includes those chunks in a prompt with explicit instructions to answer only from them, and returns the answer alongside the specific source chunks/documents used — directly enabling citation and giving the user a way to verify groundedness themselves.

### Common Engineering Traps

- **Retrieving relevant content broadly first, then checking authorization on what was retrieved before including it in the answer** — what's the actual risk if this "check afterward" step is ever skipped, forgotten, or buggy in one code path?
- **Building an entirely separate, new authorization mechanism for retrieval instead of reusing an already-tested, permission-aware search or query system** — what's the risk of maintaining two independent implementations of the same authorization logic?
- **Sending every accessible document's full content to the language model for every question, rather than retrieving only the most relevant, small subset** — what does this do to cost, latency, and the model's actual ability to focus on what matters?
- **Presenting a generated answer with no indication of its sources** — what does this cost the user's ability to verify or trust the answer, especially if the model is ever wrong?

### Reflection Questions

- How would you test, specifically, that an answer for a low-privilege user never contains information exclusively found in a document they don't have access to — not just that direct document access is blocked?
- If two authorization logic implementations (one for search, one for this new AI feature) ever diverge even slightly, what's the actual risk, and how would you prevent that divergence in the first place?
- What should the system say to a user whose question has a genuinely good answer, but only in documents they don't have access to? Is silence the right answer, or is there a better option that doesn't leak anything?

### Completion Checklist

- [ ] I have authorization enforced at the retrieval query itself, not as a post-retrieval filter.
- [ ] I am reusing an existing, already-scoped search/retrieval mechanism rather than building a second, independent authorization check.
- [ ] I have a citation mechanism so answers are traceable to specific sources.
- [ ] I have tested (at least in reasoning, if not in code) that a low-privilege user's question never surfaces restricted content.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
