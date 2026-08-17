## Project 14: Enterprise Document Platform — Solution Guide

### Business Reasoning

The business need is a shared, organized, access-controlled home for company documents at real scale. Two requirements dominate the design: authorization must be airtight (including against indirect leaks through search), and versioning must not make storage cost scale unboundedly with edit frequency for large files — both requirements that are easy to satisfy naively and expensively, or violate subtly and dangerously.

### Requirements Analysis

The authorization-correctness requirement explicitly calls out indirect leaks via search results, not just direct access — this is the same insecure-direct-object-reference concern this series has touched in prior projects, now applied to a search context specifically. The storage-efficiency-for-versioning requirement, combined with the observation that most edits to a large document are small, points toward diff-based storage rather than full-copy-per-version.

### Architecture

```
Upload -> [stream to object storage] -> initial full version stored
Edit -> [compute diff from previous version] -> store diff, not full copy (where diffing applies)
Folder permissions -> Document inherits by default, can override per-document
Search query -> [access-boundary filter applied WITHIN the query] -> [content/metadata match] -> results
```

### Tradeoff Discussion

**Full-copy-per-version vs. diff-based versioning.** Full copies are simple and make restoring any version trivially fast (just read that version's stored bytes), but storage grows linearly with version count times file size — expensive for large, frequently-edited documents. Diff-based storage (storing only what changed between versions) dramatically reduces storage cost for that case, at the cost of restoration requiring replaying diffs from a base version, meaningfully more complex and slightly slower for old versions specifically. This tradeoff is resolved differently by file type: diffing is meaningful and effective for text-based formats; for opaque binary formats (many image or video formats) a diff often isn't meaningfully smaller than the full file, so full-copy storage remains the pragmatic choice there.

**Permission inheritance vs. fully independent per-document permissions.** Independent per-document permissions give maximum per-document control but require updating potentially thousands of individual records when a team's folder-level access changes. Inheritance (documents default to their folder's permissions, with optional overrides) matches the actual, common real-world need (share a whole folder with a team) far more directly, at the cost of a slightly more complex effective-permission computation (folder permission combined with any document-level override) at read time.

### Alternative Designs Considered and Rejected

**Filtering search results for authorization after fetching them from the search index.** Rejected outright — this is the challenge's fourth named trap: fetching unauthorized results at all (even if filtered before display) means the search index itself returned data the requester shouldn't have access to, a real risk if any part of the display or logging path doesn't perfectly apply the post-fetch filter; building the authorization check into the query itself makes the leak structurally impossible rather than dependent on remembering a separate filtering step. **Requiring explicit, independent permission grants on every single document with no folder-level inheritance.** Rejected — this is the challenge's third named trap: granting a team access to an existing folder of 10,000 documents would require 10,000 individual permission updates instead of one folder-level change.

### Chosen Design

Diff-based versioning for text-based document types with full-copy fallback for binary types (matching storage strategy to what diffing can actually help with); folder-based permission inheritance with per-document override capability; search implemented with the authorization boundary as a mandatory clause within the query itself, never a post-fetch filter.

### Implementation Walkthrough

```python
async def save_new_version(document_id: UUID, new_content: bytes, content_type: str, session):
    previous = await get_latest_version(document_id, session)
    if is_diffable(content_type) and previous:
        diff = compute_diff(previous.reconstructed_content, new_content)   # e.g., a text/byte diff
        version = VersionModel(document_id=document_id, diff=diff, base_version_id=previous.id)
    else:
        key = await object_storage.store(new_content)      # full copy for binary/first version
        version = VersionModel(document_id=document_id, storage_key=key, base_version_id=None)
    session.add(version)
    await session.commit()
    return version

def get_effective_permissions(document, folder) -> set[str]:
    if document.permission_override is not None:
        return document.permission_override            # explicit override wins
    return folder.permissions                            # otherwise, inherit from the folder

async def search_documents(query: str, user_id: str, session) -> list[DocumentModel]:
    accessible_folder_ids = await get_accessible_folder_ids(user_id, session)   # user's actual access
    stmt = (
        select(DocumentModel)
        .where(                                            # AUTHORIZATION INSIDE the query itself
            or_(
                DocumentModel.folder_id.in_(accessible_folder_ids),
                DocumentModel.permission_override.contains(user_id),
            )
        )
        .where(DocumentModel.search_vector.match(query))    # content/metadata match, same pattern
        .order_by(text("ts_rank(search_vector, plainto_tsquery('english', :q)) DESC"))
        .params(q=query)
    )
    result = await session.execute(stmt)
    return list(result.scalars())
```

`save_new_version` stores a diff against the previous version for diffable content types, falling back to a full copy only where diffing genuinely doesn't help — directly addressing the storage-efficiency requirement without over-applying diffing where it wouldn't be effective. `get_effective_permissions` implements folder-level inheritance with an explicit override path, closing the third named trap. `search_documents`'s authorization filter (`accessible_folder_ids` / `permission_override`) is combined with the content-match filter in the *same query* — a document the user can't access is never fetched from the database in the first place, structurally closing the fourth named trap rather than relying on a later filtering step.

### Production Improvements

Periodically compact long diff chains into a new full "checkpoint" version (e.g., every 20 diffs) to bound how many diffs must be replayed to reconstruct a current or recent version, trading a small amount of extra storage for bounded reconstruction time as edit count grows large. Add streaming upload handling identical to this series' Project 04 for the initial document upload and any subsequent full-content edits.

### Scaling Path

Document metadata and version-diff chains scale via the same database-scaling techniques as any relational workload; the underlying document bytes (base versions and full-copy versions) live in object storage, scaling independently exactly as in Project 04; search scales using the same PostgreSQL-full-text-search-versus-dedicated-engine tradeoff analyzed in Project 08, reapplied here at potentially larger document-count scale.

### Interview Discussion

This project combines three separately-taught concerns (versioning, permission inheritance, and access-scoped search) into one system — a strong interview answer explicitly separates these three concerns when discussing tradeoffs, rather than treating "build a document platform" as one monolithic decision, exactly the decomposition this solution guide performs.

### Lessons Learned

The core lesson is that authorization must be enforced at the *query* level for any listing or search feature, not as a post-processing filter — a lesson this series first established in Project 13's admin filtering and now extends specifically to the higher-stakes case where a listing feature (search) could otherwise leak a protected resource's existence. The diff-based versioning strategy here directly informs Project 15's approach to managing large, evolving knowledge bases for retrieval.

---
