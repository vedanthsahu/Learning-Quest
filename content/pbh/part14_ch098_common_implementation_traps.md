## 98. Common Implementation Traps (Python/FastAPI/SQLAlchemy-Specific)

### 98.1 Purpose: From Design Traps to Code-Level Traps

§97 covered traps in how a design is *reasoned about and communicated*. This chapter covers a different, narrower category: specific, concrete Python/FastAPI/SQLAlchemy code patterns that look correct, often pass casual review, and fail only under a specific condition a quick read-through won't surface — each one has already been taught properly earlier in this handbook, and each entry here exists purely to compress that lesson into an instantly-recognizable trap signature.

### 98.2 The Mutable Default Argument

```python
def add_tag(tags: list[str] = []):   # TRAP: this list is created ONCE, at function definition
    tags.append("new")
    return tags
```
Every call that doesn't supply `tags` shares the *same* list object across every invocation (companion §5.6) — a trap because the function looks correct on the first call and only reveals the bug on the second. **Signature**: any mutable default (`[]`, `{}`, a mutable dataclass instance) in a function signature. **Fix**: default to `None` and construct the mutable object inside the function body.

### 98.3 The Silently Blocking "Async" Call

```python
async def get_user(user_id: int):
    result = requests.get(f"https://api.example.com/users/{user_id}")  # TRAP: requests is sync
    return result.json()
```
This function is declared `async def` and can be awaited, but `requests.get` blocks the entire event loop for its full duration (companion §12.2, §73.6) — a trap because it type-checks, runs, and returns correct results, with the only symptom being every other concurrent request stalling during this call. **Signature**: any synchronous library call (`requests`, `psycopg2`, blocking file I/O) inside an `async def` function. **Fix**: use the library's async-native equivalent (`httpx`, `asyncpg`) or wrap the call in `run_in_executor` (companion §11.5).

### 98.4 The Implicit N+1 Lazy Load

```python
notes = await session.execute(select(NoteModel))
for note in notes.scalars():
    print(note.space.name)   # TRAP: triggers one additional query PER note
```
Each `note.space` access without an eager-load hint triggers its own database round-trip (companion §30.5, §82.7) — a trap because it works correctly and looks idiomatic, with the cost only becoming visible as result-set size grows. **Signature**: any relationship attribute access inside a loop over query results, without a preceding `selectinload`/`joinedload`. **Fix**: eager-load the relationship explicitly in the original query (companion §29.6).

### 98.5 The Missing `await`

```python
async def create_order(order: OrderIn):
    session.add(OrderModel(**order.model_dump()))
    session.commit()   # TRAP: missing "await" -- returns a coroutine object, never actually runs
```
`session.commit()` on an `AsyncSession` returns a coroutine that must be awaited to actually execute (companion §12.3's coroutine-versus-call distinction) — a trap because Python doesn't raise an error for an un-awaited coroutine by default in older versions, and the code appears to "run" while silently never committing. **Signature**: any async method call without `await`, particularly ones whose side effect (a write) isn't immediately, visibly checked. **Fix**: enable `asyncio` debug-mode warnings (companion §55.2) in development specifically to surface this class of bug, and never suppress the "coroutine was never awaited" warning.

### 98.6 The Overwritten Exception Context

```python
try:
    process_payment(order)
except Exception:
    raise ValueError("Payment failed")   # TRAP: loses the original exception and its traceback
```
Raising a new exception without `from` discards the original exception's type and traceback (companion §7.6) — a trap because the code "handles" the error and looks deliberate, while actually destroying the diagnostic information a real production incident (companion Part XII) would need. **Fix**: `raise ValueError("Payment failed") from exc`, preserving the causal chain.

### 98.7 The Route Order Shadowing Bug

```python
@app.get("/notes/{note_id}")
def get_note(note_id: str): ...

@app.get("/notes/search")     # TRAP: unreachable -- "search" matches {note_id} first
def search_notes(q: str): ...
```
FastAPI matches routes in declaration order (companion §18.4), so a parameterized route declared before a more specific literal path silently shadows it — a trap because both routes appear correctly defined and the bug only surfaces when a client actually calls the shadowed one. **Fix**: declare more specific literal paths before parameterized ones.

### 98.8 The Dependency That Isn't Actually Cached Per-Request

```python
def get_settings():           # TRAP: re-reads and re-validates config on EVERY request
    return Settings()

@app.get("/config")
def show_config(settings: Settings = Depends(get_settings)): ...
```
Without `@lru_cache` (companion §17.5), a "singleton-looking" settings dependency is actually reconstructed on every single request — a trap because it produces correct values and only wastes CPU, making it easy to miss in correctness-focused testing. **Fix**: `@lru_cache` on the settings factory function, or use FastAPI's dependency-override caching correctly for genuinely per-request state only.

### 98.9 Mini Lab

Search your own codebase (or the Fieldnote capstone's code from §79-91) for each of this chapter's eight trap signatures using a simple text search first (before relying on a linter) — count how many genuine instances you find, and for each, identify which specific earlier chapter in this handbook already taught the correct pattern that avoids it.

---
