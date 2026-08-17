## 81. Stage 3: Authorization

### 81.1 Stage Goal

Stage 2 established *who* is making a request; every user can still read and modify every other user's notes, since ownership is recorded but never checked. This stage adds the missing check — and introduces **spaces**, the shared-ownership unit Fieldnote's product concept (§78.2) actually requires, since real note-taking tools are collaborative, not single-user silos.

### 81.2 New Requirements

Functional: `POST /spaces` (create a space), `POST /spaces/{id}/members` (add a collaborator); notes now belong to a space, not directly to a single owner; a user may only read or modify a note if they are a member of that note's space. Non-functional: an authorization failure must be indistinguishable, from the requester's point of view, from the resource not existing at all (companion §59.7's IDOR-prevention pattern) — never leaking a resource's existence to a non-member via a distinct "403 Forbidden" response.

### 81.3 ADR-3: Space-Level Roles vs. Per-Note Permissions

**(1) Deciding:** Should authorization be granted per-space (a member can access every note in a space) or per-note (individual notes can have individually distinct access lists)? **(2) Options considered:** (a) space-level membership only — being a member grants access to every note in that space, uniformly; (b) per-note access control lists, allowing a note to be shared more narrowly than its containing space. **(3) Tradeoffs:** Space-level membership is dramatically simpler to implement and reason about, and matches how the product is actually described (§78.2's "shared spaces"); per-note ACLs support a genuinely finer-grained sharing model some products need, at the cost of a meaningfully more complex authorization check on every single note access (a join or lookup per note, rather than a single space-membership check). **(4) Chosen:** Space-level membership only — no stated requirement (§81.2) calls for narrower-than-space sharing, and companion §108.10's proportionality principle argues directly against building the more complex mechanism speculatively. **(5) Revisit when:** A genuine product requirement for narrower-than-space sharing is stated — not before.

### 81.4 Implementation

```python
_spaces: dict[UUID, dict] = {}      # {id: {"members": set[str]}}

class SpaceIn(BaseModel):
    name: str

@app.post("/spaces", status_code=201)
def create_space(payload: SpaceIn, owner: str = Depends(get_current_user)) -> dict:
    space_id = uuid4()
    _spaces[space_id] = {"name": payload.name, "members": {owner}}
    return {"id": space_id, "name": payload.name}

@app.post("/spaces/{space_id}/members", status_code=204)
def add_member(space_id: UUID, email: str, requester: str = Depends(get_current_user)) -> None:
    space = _spaces.get(space_id)
    if space is None or requester not in space["members"]:
        raise HTTPException(status_code=404, detail="Space not found")   # never 403 (§81.2)
    space["members"].add(email)

def require_space_member(note: Note, requester: str) -> None:
    space = _spaces.get(note.space_id)
    if space is None or requester not in space["members"]:
        raise HTTPException(status_code=404, detail="Note not found")    # same IDOR-safe pattern

@app.get("/notes/{note_id}", response_model=Note)
def get_note(note_id: UUID, requester: str = Depends(get_current_user)) -> Note:
    note = _notes.get(note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    require_space_member(note, requester)
    return note
```

Every authorization failure raises the identical `404 Note not found` (or `404 Space not found`) a genuinely-missing resource would raise (companion §59.7) — a non-member attempting to guess valid note IDs learns nothing about which IDs exist versus which exist-but-are-forbidden, closing the exact object-level authorization gap companion §59.7 names directly. `require_space_member` is a small, reusable check rather than inlined logic repeated in every route, anticipating that every future route touching a note (search in §88, AI queries in §89) will need the identical check.

### 81.5 What Changed in the Architecture

`Note` gains a `space_id` replacing the bare `owner` field from Stage 2 — ownership is now mediated through space membership rather than recorded directly per-note, a genuine, if small, data-model migration one stage after that field was first introduced, directly illustrating §78.6's point that even a deliberately-incremental capstone still requires occasional revision of an earlier stage's specific choice, not just pure, unmodified addition.

### 81.6 Production Considerations

The identical-404 pattern (§81.4) must be applied *consistently* across every route touching a note or space — a single route that leaks a distinct 403 response reintroduces the exact enumeration vulnerability this stage otherwise closes; this is exactly the kind of easy-to-miss consistency requirement that a dedicated authorization test suite (companion §59.7's negative-case testing) exists to catch mechanically rather than relying on manual review alone.

### 81.7 Debugging

**Symptoms:** A legitimate space member receives a 404 for a note that genuinely exists. **Investigation:** Confirm the member's email is actually present in `_spaces[space_id]["members"]` — the most common cause is a case-sensitivity mismatch between the email used at registration (§80.4) and the email used when adding a member (§81.4), since neither normalizes case; a second common cause is checking membership against the *note's* `space_id` field before it was actually migrated from the old `owner` field, a stale-data artifact of §81.5's schema change. **Fix:** Normalize email case at every entry point (registration, member-add, login) rather than only at read time.

### 81.8 Mini Lab

Write a negative-case test (companion §59.7) asserting that a user who is *not* a space member receives an identical 404 response — with an identical response body — for both a genuinely nonexistent note ID and a real note ID belonging to a space they don't belong to, directly verifying §81.2's non-functional requirement in an automated, repeatable way rather than only by manual inspection.

---
