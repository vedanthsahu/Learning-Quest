## 101. Code Review Exercises

### 101.1 How to Use These Exercises

Each snippet below is a realistic pull-request diff. Review it exactly as you would a real colleague's code — note every issue you'd raise as a comment — before reading the discussion. Some snippets have more than one issue; finding only the most obvious one is a normal, incomplete first pass, not a failure.

### 101.2 Exercise 1

```python
@app.get("/users/{user_id}/orders")
async def get_orders(user_id: int, session: AsyncSession = Depends(get_session)):
    orders = await session.execute(
        text(f"SELECT * FROM orders WHERE user_id = {user_id}")
    )
    return orders.fetchall()
```
**Discussion**: String-interpolating `user_id` directly into SQL is a textbook SQL injection vector (companion §24.2) even though `user_id` is typed as `int` in the function signature — FastAPI's type coercion happens at the routing layer, but nothing prevents this same pattern being copy-pasted into a context with a string parameter later, and the habit itself is the real issue, not just this one call site. **Fix**: parameterized query (`text("SELECT * FROM orders WHERE user_id = :uid").bindparams(uid=user_id)`) or, better, the ORM query builder directly. A second, smaller issue: `SELECT *` and returning raw rows bypasses response-model validation (companion §21.5) entirely.

### 101.3 Exercise 2

```python
async def process_upload(file: UploadFile):
    contents = await file.read()          # reads the ENTIRE file into memory
    if len(contents) > MAX_SIZE:
        raise HTTPException(413, "File too large")
    await save_to_storage(contents)
```
**Discussion**: The size check happens *after* the entire file has already been read into memory (companion §35.7, §77.2) — a large enough file exhausts memory or causes unacceptable latency before the rejection ever occurs, defeating the size limit's actual purpose. **Fix**: stream the upload in chunks, checking cumulative size as each chunk arrives and aborting early, exactly as companion §87.4's capstone implementation does.

### 101.4 Exercise 3

```python
class UserService:
    _cache = {}

    async def get_user(self, user_id: int):
        if user_id not in self._cache:
            self._cache[user_id] = await self._fetch_from_db(user_id)
        return self._cache[user_id]
```
**Discussion**: `_cache` is a class attribute, unbounded, with no eviction and no TTL — this is companion §75.2's exact unbounded-in-process-cache memory-leak pattern, and it will grow for the entire lifetime of the process as new, unique `user_id`s are seen. A second, subtler issue: if `UserService` is instantiated per-request (a common FastAPI dependency pattern), every instance shares the *same* class-level dictionary, meaning stale data for one user is never refreshed even after their underlying data changes — no invalidation path exists at all. **Fix**: a bounded cache with an explicit maximum size and TTL (companion §47.3), or route this through the same Redis-backed pattern the capstone uses at §83.4.

### 101.5 Exercise 4

```python
async def transfer_funds(from_account: int, to_account: int, amount: Decimal, session: AsyncSession):
    from_acct = await session.get(Account, from_account)
    to_acct = await session.get(Account, to_account)
    from_acct.balance -= amount
    to_acct.balance += amount
    await session.commit()
```
**Discussion**: No row locking (companion §27.7) — two concurrent transfers touching the same account can race, with one transaction's read-modify-write overwriting the other's, producing an incorrect final balance. This is precisely the double-booking-shaped race companion §27's transaction-isolation chapter demonstrates. **Fix**: `SELECT ... FOR UPDATE` on both accounts (in a consistent order, to avoid companion §76.2's lock-ordering deadlock risk) before modifying either balance.

### 101.6 Exercise 5

```python
def get_settings() -> Settings:
    try:
        return Settings()
    except Exception:
        return Settings(debug=True, database_url="sqlite:///fallback.db")
```
**Discussion**: Silently falling back to a debug configuration and a completely different database on *any* settings-validation failure is dangerous — a genuine, production-relevant misconfiguration (a missing required secret, companion §17.4-17.5) is swallowed and replaced with a configuration that could route production traffic to a throwaway SQLite database without any visible error at all. **Fix**: let configuration errors fail loudly at startup (companion §17.4's explicit intent), never silently substitute a different environment's configuration.

### 101.7 Mini Lab

Find a real pull request from your own project's history — ideally one that was approved and merged without extensive comments — and re-review it cold against this chapter's five exercise categories (injection risk, unbounded buffering, unbounded caching, missing locking, silent configuration fallback); finding zero issues is a legitimate, useful outcome too, since it calibrates how much residual risk your team's existing review process is already catching.

---
