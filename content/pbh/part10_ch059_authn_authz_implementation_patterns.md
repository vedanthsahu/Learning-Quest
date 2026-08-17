## 59. Authentication & Authorization Implementation Patterns

### 59.1 The Problem: §34 and §20 Gave You the Mechanisms; This Chapter Gives You the Complete, Assembled Pattern

§34 established JWT/OAuth2/OIDC mechanics; companion §20 established FastAPI's dependency-injection chain (`get_db_session` → `get_current_user` → `require_permission`). This chapter assembles both into the complete, production-shaped authentication and authorization pattern — specifically, the **RBAC (Role-Based Access Control)** implementation the actual Seat Management backend uses throughout, and the specific pitfalls that turn a superficially-correct implementation into a real vulnerability.

### 59.2 Python Mechanism: RBAC — Permissions Derived From a Role, Not Assigned Per-User Directly

**Role-Based Access Control** assigns a user a **role** (`EMPLOYEE`, `TENANT_ADMIN`, directly the actual backend's `app_users.role_name` column and its `chk_app_users_role` constraint), and permissions are derived from that role via a lookup (the actual backend's `roles`/`permissions`/`role_permissions` tables, companion §35's `fetch_permissions_for_role` query) rather than assigned individually to each user. This is a genuine, deliberate design choice with a real tradeoff: adding a user to a role instantly grants every permission that role has (simple, consistent, easy to audit "what can this role do") at the cost of less granularity than assigning permissions directly per-user would allow — a tradeoff RBAC accepts deliberately, since the audit-and-consistency benefit generally outweighs the granularity loss for most real organizational permission structures.

### 59.3 Engineering Constraint: Authorization Must Be Checked at Every Layer That Can Be Reached Independently, Not Just the "Front Door"

A permission check on the API route (companion §20.6's `require_permission` dependency) protects that specific route — but if the same underlying service or repository function is reachable through *any other path* (a background job, an admin script, a different route that calls the same service function without its own permission check), that second path bypasses the first path's protection entirely unless it performs its own, independent check. This is precisely why the actual backend's layered permission checks (present at the route level via `Depends(require_permission(...))`) must be understood as protecting *that specific entry point*, not as a system-wide guarantee automatically covering every possible way the underlying logic might be invoked.

### 59.4 Decision Framework: Object-Level Authorization — "Can This User Do X" vs. "Can This User Do X to This Specific Y"

RBAC (§59.2) answers "does this user's role permit the *action* generally" (`booking:cancel`) — it does not, by itself, answer "does this user have the right to cancel *this specific booking*" (their own booking, versus someone else's, versus a booking outside their tenant). This second, **object-level** check is a distinct piece of logic that must be applied *in addition to* the role-based permission check, typically inside the service layer (companion §43.6) once the specific object in question has actually been loaded — a common, real vulnerability class (an "IDOR," Insecure Direct Object Reference, companion §63's OWASP Top 10 chapter names this explicitly) results specifically from having the role-level check but forgetting the object-level one, letting an authenticated, permission-holding user act on an object (someone else's booking, another tenant's data) they were never meant to have access to.

### 59.5 Python Mechanism: Tenant Scoping as a Structural, Non-Optional Authorization Layer

Companion §31.4's tenant-scoping discussion established that every query must include `tenant_id` structurally, not as an easily-forgotten convention — this is, precisely, a specific and especially severe instance of §59.4's object-level authorization concern: a user with a valid `booking:view` permission and a valid, real booking ID should never be able to view that booking if it belongs to a *different* tenant than their own, and this check must happen regardless of whether the role-level permission check already passed. The actual backend's consistent inclusion of `tenant_id` in `WHERE` clauses throughout its repository layer *is* this object-level, tenant-scoped authorization check, implemented structurally at the data-access layer rather than as a separate, easily-omitted step layered on afterward.

### 59.6 Implementation

```python
from fastapi import Depends, HTTPException

def require_permission(permission: str):
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if permission not in user["permissions"]:      # §59.2: ROLE-level
            raise HTTPException(403, f"Missing permission: {permission}")   # check
        return user
    return checker


def get_booking_for_user_or_403(conn, *, booking_id: str, current_user: dict) -> dict:
    """Object-level authorization (§59.4-59.5) -- happens AFTER the route-level
    role check has already passed, using the loaded object's own attributes."""
    booking = booking_repository.get_booking_by_id(
        conn,
        booking_id=booking_id,
        tenant_id=current_user["tenant_id"],   # STRUCTURAL tenant scoping --
    )                                            # the query CANNOT return a
                                                    # different tenant's booking
                                                    # even if booking_id happens
                                                    # to be a valid ID (§59.5)
    if booking is None:
        # Deliberately the SAME error whether the booking doesn't exist at all
        # OR belongs to another tenant -- never reveal via a different error
        # message that a booking ID is "real but not yours" (an information
        # leak in its own right).
        raise HTTPException(404, "Booking not found")

    is_owner = booking["booked_for_user_id"] == current_user["user_id"]
    is_admin = "booking:manage_any" in current_user["permissions"]
    if not (is_owner or is_admin):                  # a SECOND, object-specific
        raise HTTPException(403, "Not authorized")    # check, beyond the
                                                          # role-level one
    return booking

def booking_repository(): ...
def get_current_user(): ...
```

`require_permission("booking:view")` at the route level checks only the *role-derived* permission — it says nothing yet about *which* booking. `get_booking_for_user_or_403` performs the genuinely distinct, second check §59.4 describes: even with a valid role-level permission, the specific loaded booking must belong to the requesting user's own tenant (enforced structurally via the `tenant_id` parameter in the repository query itself, §59.5) and either be owned by that user or the user must hold a broader `booking:manage_any` permission — two entirely separate authorization dimensions, both required, neither one sufficient alone.

### 59.7 Production Considerations

The deliberate choice to return an identical 404 (not a 403) when a booking either doesn't exist *or* belongs to a different tenant (§59.6's comment) is itself a security decision, not an oversight — a 403 response for "this booking exists but isn't yours" versus a 404 for "this booking doesn't exist" leaks information (confirming a specific booking ID is real) to a requester who shouldn't be able to confirm that at all; this specific, deliberate ambiguity is a standard, recommended practice for object-level authorization failures across essentially every serious API security guideline. Authorization logic — both role-level and object-level — deserves the same dedicated, thorough test coverage (companion §50) as any other business-critical logic, specifically including negative test cases (a user *without* the right role, a user *with* the role but for someone else's object) rather than only testing the successful, authorized path, since an authorization bug is, by its nature, invisible in normal, successful-case testing alone.

### 59.8 Debugging

**Symptoms:** A user can access or modify a resource that should belong exclusively to another user or tenant, despite the application "having" a permission system that appears to be functioning correctly for other checks. **Investigation:** Trace the specific code path the successful, unauthorized access took — check specifically whether it performs only a role-level check (§59.2) or also a genuine object-level check (§59.4) against the actual loaded resource's ownership/tenant attributes, and check whether tenant scoping was structurally present in the underlying repository query (§59.5) or merely assumed. **Root cause:** A route or service function with a correct role-level permission check but a missing object-level (often specifically tenant-scoping) check, allowing any user holding the general permission to act on any object, not just their own. **Fix:** Add the missing object-level authorization check immediately, following §59.6's pattern precisely (load the object with structural tenant scoping, then explicitly verify ownership/tenant match before permitting the action) — treat this class of bug with the same severity classification the companion AI Systems Handbook's §42.5 and §54.6 assign to cross-tenant data exposure generally, since that is precisely what this vulnerability class is.

### 59.9 Interview Thinking

"A user with 'view bookings' permission can somehow view another user's booking by guessing its ID — what's wrong?" is a direct IDOR/object-level-authorization test (§59.4) — a strong answer immediately identifies the missing second check (role permission alone was verified, but not whether *this specific* booking belongs to the requesting user or their tenant) rather than assuming the role-permission system itself is broken, since the actual bug is almost always this specific, common gap rather than the RBAC mechanism failing generally.

### 59.10 Mini Lab

Implement `require_permission` and `get_booking_for_user_or_403` as in §59.6, with a small in-memory stand-in for `booking_repository` seeded with bookings belonging to two different users across two different tenants. Write test cases confirming: a user can access their own booking; a user cannot access another user's booking within the same tenant (403); a user cannot access a booking belonging to a different tenant even with a technically-valid booking ID (404, not revealing existence); and a user holding `booking:manage_any` can access any booking within their own tenant but still not a different tenant's booking.

---
