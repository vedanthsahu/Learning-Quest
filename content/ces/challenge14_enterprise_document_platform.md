## Project 14: Enterprise Document Platform

### Problem Statement

Teams across a company need a shared place to upload, organize, and collaborate on documents — contracts, reports, spreadsheets — of varying sizes and formats, with control over who can see or edit what, a record of who changed what and when, and the ability to find a specific document later among potentially tens of thousands.

### Functional Requirements

- Upload a document of various common formats, storing it durably.
- Organize documents into folders or collections, shared with specific teams or individuals.
- Track every version of a document as it's edited, allowing a previous version to be viewed or restored.
- Search across document content and metadata (title, author, tags) to find relevant documents.
- Enforce that only authorized users can view or edit a given document or folder.

### Non-Functional Requirements

- **Storage efficiency for versioning**: keeping every version of every document should not multiply storage costs by the total number of edits made to every document ever uploaded, without limit.
- **Authorization correctness**: a user must never be able to access a document or folder they haven't been granted access to, including indirectly (e.g., via a search result revealing a document's existence or content).
- **Upload reliability at scale**: large documents must upload reliably without excessive memory use on the server.
- **Search relevance and freshness**: newly uploaded or edited documents should become searchable promptly, and search results must respect the same access boundaries as direct document access.

### Project Scope

**In scope**: document upload/storage, folder-based sharing and permissions, version history, content-and-metadata search with access-boundary enforcement. **Out of scope**: real-time collaborative co-editing (multiple people editing the same document simultaneously, like a live document editor), OCR for scanned documents, e-signature workflows.

### Engineering Questions (Answer Them Yourself First)

- If a document is edited ten times, does keeping ten full independent copies of the entire file seem reasonable? What if the document is very large and each edit is a tiny change?
- If a search result reveals a matching document's title and a content snippet, but the searching user doesn't actually have permission to view that document, what has gone wrong?
- What has to be true about how folders and their permissions relate to the documents inside them, so that adding one person to a folder doesn't require individually updating permissions on every document already inside it?
- If two people are editing metadata (like a document's tags) on the same document at nearly the same moment, what could go wrong, and does it matter as much as the seat-booking project's double-booking concern?

### Architecture Thinking

Sketch how folder-level permissions and document-level access should relate — does a document need its own independent permission list, or can it inherit access from the folder(s) it belongs to? Consider what a search query actually needs to check before returning any result, and where exactly that check needs to happen relative to the search itself. Estimate: if a 50 MB document is edited 20 times over its lifetime, and each edit changes only a small portion of the file, what's the difference in storage cost between storing 20 full copies versus storing one full copy plus 19 sets of changes?

### Progressive Hint System

**Level 1**: Consider whether every version of a document truly needs to be a completely independent, full copy, or whether there's a way to store only what changed between versions for most edits. **Level 2**: Research permission inheritance models, where a document's effective access is determined by combining its own explicit permissions (if any) with its containing folder's permissions. **Level 3**: Research applying the same authorization-boundary-at-the-query-level pattern used in a prior enterprise-scale project in this series (hint: think about how a search or listing query can be filtered so it structurally cannot return unauthorized results) — and research delta/diff-based storage for versioning. **Level 4**: A standard design stores only the initial full version plus subsequent diffs for text-based or moderately-sized documents (falling back to full copies for binary formats where diffing isn't meaningful), inherits permissions from folder membership by default with optional per-document overrides, and applies the access-boundary check as a mandatory filter within the search query itself — never as a separate step after results are already fetched — mirroring the same "authorization inside the query, not after it" pattern used for search in an AI-and-search-heavy capstone project referenced by the companion handbooks.

### Common Engineering Traps

- **Storing a completely independent full copy of a document for every single version, regardless of file type or edit size** — what does this do to storage costs for a frequently-edited, large document over its lifetime?
- **Checking a user's access to a document only when it's directly opened, but not applying the same check to search results** — what could a user learn about documents they can't access just from a search results list?
- **Requiring every document's permissions to be set individually, with no inheritance from its folder** — what happens when someone needs to grant a team access to 10,000 existing documents in a folder?
- **Applying authorization as a filter on already-fetched search results, in application code, rather than as part of the search query itself** — what performance and correctness risks does "fetch everything, then filter" carry compared to filtering at the query level?

### Reflection Questions

- If a document's version history needs to be restorable to any prior point, does your storage-efficiency approach (if using diffs) make old-version restoration slower than viewing the current version? Is that an acceptable tradeoff?
- How would you test that search results never leak a document's existence to a user without access, not just that direct access is blocked?
- What would need to change about your design to support real-time collaborative co-editing, and why is that explicitly out of scope rather than a small extension?

### Completion Checklist

- [ ] I have a versioning storage strategy that doesn't multiply cost linearly and unboundedly with edit count for large documents.
- [ ] I have a permission-inheritance model from folders to documents, with override capability.
- [ ] I have verified, in my design, that search results are filtered by authorization at the query level, not after fetching.
- [ ] I have a streaming upload approach consistent with this series' earlier File Storage Service project.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
