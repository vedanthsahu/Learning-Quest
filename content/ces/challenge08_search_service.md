## Project 08: Search Service

### Problem Statement

An application has a growing collection of text documents (articles, product descriptions, support tickets), and users need to find relevant ones by typing keywords. The business wants search results that are fast and reasonably relevant, without requiring every search to scan the entire document collection from scratch, and without slowing down the creation of new documents.

### Functional Requirements

- Accept a document for indexing so it becomes findable.
- Accept a search query and return matching documents, ranked by relevance.
- Reflect a newly created or updated document in search results within a reasonably short time — not necessarily instantly.
- Support updating or deleting a document and having that reflected in future search results.

### Non-Functional Requirements

- **Write-path latency**: creating a document must not be slowed down by the cost of making it searchable.
- **Read-path relevance**: results should be ranked so the most relevant documents appear first, not in arbitrary or purely chronological order.
- **Consistency between systems**: if documents are stored in one place and indexed separately for search, think about what could cause these two views of the data to drift apart over time.
- **Scalability**: search query volume may grow independently of, and potentially much larger than, document creation volume.

### Project Scope

**In scope**: indexing, keyword search with relevance ranking, keeping the index reasonably in sync with document changes. **Out of scope**: semantic/vector similarity search (that's a related but distinct problem), search result personalization, faceted search/filtering by structured attributes.

### Engineering Questions (Answer Them Yourself First)

- If indexing a document takes 500ms and you have 1,000 document creations per second, what happens if indexing runs synchronously inside the create-document request?
- What are the two different things that need to be "true together" for search to return correct results — and what specifically could cause them to disagree?
- Should search results be ranked purely by keyword match count, or does relevance mean something more than that?
- If your document store and your search index are two separate systems, what happens when a write to one succeeds but a write to the other fails?

### Architecture Thinking

Sketch the path from "a document is created" to "that document appears in search results" — is indexing part of the same request/transaction that creates the document, or does it happen separately? If separately, sketch exactly what carries the information from one system to the other. Consider what your search query path actually needs to check before returning a result — does it need to touch the primary document store at all, or can it be answered entirely from the search index? Estimate: if your document collection is small (a few thousand documents), does a dedicated search engine seem justified, or would a simpler mechanism suffice — and at what collection size or query complexity would your answer change?

### Progressive Hint System

**Level 1**: Consider separating "make the document exist" from "make the document findable" into two different steps that don't have to happen at exactly the same instant. **Level 2**: Look into how a database's own text-search capabilities compare to a dedicated, purpose-built search engine — what does each optimize for, and what does each give up? **Level 3**: Research the dual-write consistency problem (writing to two systems that need to agree) and patterns for solving it, such as the Outbox pattern. **Level 4**: A standard design indexes documents asynchronously after creation (via a queue or a database-native full-text search column that updates automatically with the write), ranks results using a relevance function like `ts_rank` or a search engine's built-in scoring, and — if using two separate systems — uses an outbox-style pattern to guarantee the index eventually reflects every document write even if the indexing step temporarily fails.

### Common Engineering Traps

- **Indexing a document synchronously inside the same request that creates it** — what does this do to document-creation latency as indexing cost grows?
- **Introducing a dedicated search engine (with all its operational complexity) for a small document collection with simple search needs** — is this solving a problem you actually have, or one you might have someday?
- **Ranking results purely by exact keyword match count with no consideration of term rarity or document length** — can you think of a case where this produces an unintuitive, unhelpful ranking?
- **Assuming a document store and a search index will always stay in sync without an explicit mechanism ensuring it** — what real-world event (a crash, a network blip) could cause them to silently drift apart?

### Reflection Questions

- If a user searches for something and gets zero results, how would you distinguish "genuinely no matching documents exist" from "the document exists but hasn't been indexed yet"?
- Would your design change if you learned that search queries would need to support phrases spanning multiple words, not just single keywords?
- What would you need to add to detect that your document store and search index have drifted out of sync, before a user notices missing results?

### Completion Checklist

- [ ] I have decided whether indexing happens synchronously or asynchronously, and can justify why.
- [ ] I understand what "eventual consistency between two systems" means concretely in this context.
- [ ] I have a specific relevance-ranking approach beyond raw keyword count.
- [ ] I have considered how document deletion is reflected in search results.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
