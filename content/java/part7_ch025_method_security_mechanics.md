## 25. Method Security Mechanics

### 25.1 The Concept

Part IV §15 already showed `@PreAuthorize` in heavy use across
`OrderController` — different rules per endpoint, evaluated before the method
body runs. This chapter is about the *mechanism* underneath that annotation,
since understanding it explains both why it works and the single most common
way to accidentally break it.

### 25.2 How `@PreAuthorize` Actually Runs

Spring never modifies your compiled `OrderController` class to insert a
permission check. Instead, when `@EnableMethodSecurity` is active (seen
already, unexplained, on both `SecurityAutoConfiguration` in Part II §10.2 and
`auth-service`'s own `SecurityConfig` in §26), Spring wraps every bean that has
at least one `@PreAuthorize`-annotated method in a **dynamically generated
proxy object** at startup. Every call into that bean from anywhere else in the
application goes through the proxy first, not directly to your class — the
proxy evaluates the `@PreAuthorize` expression, and only forwards the call to
your actual method if it passes; otherwise it throws `AccessDeniedException`
before your code ever executes.

```java
@GetMapping
@PreAuthorize("hasAuthority('ADMIN') or hasAuthority('USER')")
public ResponseEntity<List<OrderDto>> findAll() {
    // this line never runs at all if the check above fails —
    // the proxy intercepts the call before it gets here
    log.info("*** OrderDto List, controller; fetch all orders *");
    return ResponseEntity.ok(orderService.findAll());
}
```

**Source:** `order-service/src/main/java/com/ecommerce/orderservice/controller/OrderController.java` (Part IV §15.2)

`AccessDeniedException`, once thrown, is caught by `ApiExceptionHandler`
(Part VIII §29) and turned into the same `ApiResponse` error envelope as
everything else — the caller sees a clean HTTP 403, not a stack trace.

### 25.3 The Proxy Boundary — the One Thing Worth Internalizing

Because the check happens at the proxy, calling a `@PreAuthorize`-annotated
method **from another method on the exact same object** (`this.someMethod()`,
inside the same class) bypasses the proxy entirely and skips the check —
Java's `this` reference points straight at the real object, never routing back
through the proxy that wraps it from the outside. This is a well-known Spring
gotcha, not specific to this codebase, but worth stating plainly here because
it's exactly the kind of bug that passes every manual test (calling the
endpoint directly, from outside, always goes through the proxy correctly) and
only surfaces if another method on the same class starts calling the
protected one internally.

### 25.4 Try It

If a new method were added to `OrderController` that internally calls
`this.findAll()` directly (not through an HTTP request, just a normal Java
method call within the same class) as a shortcut to reuse its logic, would
the `@PreAuthorize("hasAuthority('ADMIN') or hasAuthority('USER')")` check on
`findAll()` still run? Reason from §25.2 and §25.3's explanation of where the
proxy actually sits relative to `this`.

---
