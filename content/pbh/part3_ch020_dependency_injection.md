## 20. Dependency Injection in FastAPI

### 20.1 The Problem: Route Handlers Need Shared Setup Without Duplicating It Everywhere

Many route handlers need the same things — a database session, the currently authenticated user, a validated pagination query — and each of these needs its own construction logic (checking a token, opening a session from the pool). Writing that setup code at the top of every single handler is exactly the duplication problem §2.1 raised for cross-cutting function behavior, but here it needs to happen *per request*, produce a real object the handler body uses directly (not just wrap the handler's execution), and needs to be selectively applicable per-route — precisely the gap §19.3 identified middleware as the wrong tool for.

### 20.2 Python Mechanism: A Dependency Is Just a Callable FastAPI Calls For You

A FastAPI **dependency** is any callable (a function, or a class's `__call__`) that FastAPI invokes automatically before running the route handler, passing its return value in as a parameter via `Depends(...)`. This is dependency injection in its most literal sense: the handler function declares *what it needs* as a typed parameter, and FastAPI is responsible for constructing and supplying it — the handler's own code never calls the dependency function directly, it simply receives the already-resolved result.

### 20.3 Decision Framework: Dependencies Compose, and FastAPI Resolves Them in the Right Order Automatically

A dependency can itself declare its own dependencies (a `get_current_user` dependency that itself depends on a `get_db_session` dependency, to look up the user in the database) — FastAPI resolves this entire chain automatically, in the correct order, calling each dependency exactly once per request even if multiple other dependencies in the same request also depend on it (a genuine, useful optimization: a shared dependency like a database session isn't constructed redundantly just because three different route-level dependencies all need it). This composability is precisely why the actual Seat Management backend's `require_permission("guest:manage")` pattern works cleanly — it's a dependency that itself depends on `get_current_user`, which itself depends on a token-decoding dependency, each layer adding its own check on top of what the previous layer already resolved.

### 20.4 Python Mechanism: A Dependency Using `yield` Provides Setup-and-Teardown, Not Just Setup

A dependency function using `yield` instead of `return` gets the same context-manager-style guarantee companion §3.2 established generally: code before `yield` runs as setup (providing the value the handler receives), and code after `yield` runs as teardown — guaranteed to run after the request completes, success or failure — making this the standard pattern for a per-request database session dependency specifically: yield the session for the handler to use, then close it afterward regardless of whether the handler raised an exception.

### 20.5 Tradeoff: Dependencies Scale Cleanly, But Overusing Them Obscures a Handler's Real Requirements

A route handler with eight `Depends(...)` parameters technically works, but each additional dependency is another indirection a reader must trace to understand what the handler actually needs and does — the discipline worth maintaining is keeping each dependency genuinely focused (one clear responsibility: "get the current user," not "get the current user and also check five unrelated feature flags") so that a handler's dependency list remains a readable, honest summary of its actual requirements rather than a junk drawer of loosely-related setup code.

### 20.6 Implementation

```python
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, Header

app = FastAPI()

def get_db_session():
    session = open_db_session()          # setup phase
    try:
        yield session                     # handler runs here, using `session`
    finally:
        session.close()                   # teardown -- GUARANTEED (§20.4),
                                            # exactly like companion §3.2

def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    session=Depends(get_db_session),      # a dependency depending on another
                                            # dependency (§20.3) -- resolved
                                            # automatically, in order
):
    if authorization is None:
        raise HTTPException(401, "Missing Authorization header")
    user = look_up_user_from_token(session, authorization)
    if user is None:
        raise HTTPException(401, "Invalid token")
    return user

def require_permission(permission: str):
    """A dependency FACTORY -- returns a dependency parameterized by `permission`."""
    def checker(user=Depends(get_current_user)):
        if permission not in user["permissions"]:
            raise HTTPException(403, f"Missing permission: {permission}")
        return user
    return checker


@app.patch("/admin/floor-layouts/{layout_id}/activate")
def activate_layout(
    layout_id: int,
    user: Annotated[dict, Depends(require_permission("layout:publish"))],
):
    return {"layout_id": layout_id, "activated_by": user["user_id"]}

def open_db_session(): ...
def look_up_user_from_token(session, token): ...
```

`get_db_session` uses `yield` so the session is guaranteed closed after the request (§20.4), regardless of what happens inside the handler. `get_current_user` depends on `get_db_session` directly — FastAPI resolves this chain automatically (§20.3), meaning `activate_layout`'s single `Depends(require_permission("layout:publish"))` transitively triggers session creation, user lookup, and permission checking, all without the handler itself writing any of that logic. `require_permission(permission)` is a **dependency factory** — a function that returns a dependency configured with a specific argument, exactly the pattern the actual Seat Management backend uses for its permission strings throughout `api/deps.py`.

### 20.7 Production Considerations

A `yield`-based dependency's teardown code must handle the case where the handler itself raised an exception — an unhandled exception inside the `try` block still triggers the `finally`, but a dependency wanting to distinguish "clean completion" from "the handler failed" (to decide whether to commit or rollback a transaction, for instance) needs an explicit `try`/`except`/`finally` structure rather than a bare `finally` alone, directly mirroring companion §3.6's transaction context-manager pattern. Dependencies resolved per-request (like `get_current_user`) should avoid doing unnecessarily expensive work on every single call if that work could instead be cached at a coarser scope (companion §47's caching architecture) — a permission check hitting the database on literally every request, for a permission set that rarely changes, is a common, addressable latency cost once traffic grows.

### 20.8 Debugging

**Symptoms:** A database session dependency appears to leak connections under load despite using the `yield` pattern; a permission check that should reject a request appears to occasionally let it through. **Investigation:** For leaking sessions, verify the teardown code is in a `finally` block (or otherwise guaranteed to run on every exit path, including exceptions) rather than only on the successful-completion path. For permission-check bypass, check the dependency chain's actual composition — a route accidentally depending on `get_current_user` directly instead of `require_permission(...)` skips the permission check entirely while still "looking" protected at a glance. **Root cause:** A teardown path that isn't actually exception-safe, or a route wired to the wrong dependency in the composition chain. **Fix:** Ensure every `yield`-based dependency's cleanup is in a `finally` block; audit route-level `Depends(...)` declarations against the specific permission each route is actually supposed to require.

### 20.9 Interview Thinking

"How would you implement authentication and permission checking in FastAPI?" is testing whether dependency injection (§20.2-20.3), specifically a composable chain (token → user → permission) rather than a single monolithic function, is your default design — a strong answer explains why this belongs in a dependency rather than middleware (§19.3): different routes need different permissions, which a single blanket middleware layer can't naturally express.

### 20.10 Mini Lab

Implement §20.6's three-layer dependency chain (`get_db_session` → `get_current_user` → `require_permission`) against simple stand-in functions (an in-memory dict instead of a real database), and wire two routes: one requiring `"read"` permission, one requiring `"write"` permission. Test with a user object that has only `"read"` permission and confirm the read-route succeeds while the write-route correctly returns a 403 — then add a print statement inside `get_db_session`'s setup and teardown to confirm it's called and cleaned up exactly once per request, even though both `get_current_user` and `require_permission` reference it in the chain.

---
