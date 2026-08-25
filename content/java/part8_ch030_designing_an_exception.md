## 30. Designing an Exception — A Real Gap, Not a Hypothetical One

### 30.1 The Concept

Part I §5.3 already contrasted `BusinessException` against the legacy
per-service exceptions (`ProductNotFoundException`, `PaymentNotFoundException`,
`CartNotFoundException`, `OrderNotFoundException`) on style — public
constructors versus private-plus-factory, one class per error versus one
class total, no i18n versus i18n-aware. Now that you've read
`ApiExceptionHandler` in full (§29.2), that stylistic difference turns out to
have a real, checkable *behavioral* consequence — not a hypothetical one.

### 30.2 Tracing What Actually Happens

`ApiExceptionHandler` has explicit `@ExceptionHandler` methods for
`BusinessException`, several Spring/validation exception types, and a final
catch-all for plain `Exception` (§29.2). `ProductNotFoundException` (Part I
§5.3) is declared as:

```java
public class ProductNotFoundException extends RuntimeException {
```

It extends `RuntimeException` directly — not `BusinessException`, not any
type `ApiExceptionHandler` has a specific handler for. Walk `ProductServiceImpl.findById`
(Part I §4.2) forward: it throws a `ProductNotFoundException` when a product
doesn't exist. That exception propagates up through the controller
(Part IV §14), uncaught, until it reaches `ApiExceptionHandler`. Spring
matches it against each `@ExceptionHandler` in turn, looking for the most
specific match — and finds none of the specific ones apply, because
`ProductNotFoundException` isn't a `BusinessException` and isn't any of the
other named types. It falls all the way through to the final handler:

```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ApiResponse<Void>> handleOther(Exception ex, WebRequest request) {
    return respond(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
            Messages.get(ErrorCode.INTERNAL_SERVER_ERROR.getMessageKey()), null, request, ex, true);
}
```

**Source:** `common-lib/common-spring/src/main/java/com/ecommerce/commonlib/web/exception/ApiExceptionHandler.java` (§29.2)

Which means: a client asking for a product that doesn't exist gets back HTTP
**500 Internal Server Error** — a status that's supposed to mean "something
unexpected broke on the server," logged at `error` level with a full stack
trace (`withStack = true`, the last argument to `respond(...)`) — not the HTTP
**404 Not Found** the situation actually calls for, and not the clean,
consistent `ApiResponse` message shape a `BusinessException.notFound(...)`
call would have produced automatically. This isn't a hypothetical bug found
by reading the code abstractly; it's the literal, traceable behavior of two
real files in this repository, read together.

### 30.3 Why This Matters More Than a Style Preference

This is exactly the cost Part I §5.3 gestured at without being able to prove
yet — every service still using the legacy exception pattern
(`product-service`, `payment-service`, `order-service`, per the front
matter's §0.2 "legacy layer") is silently returning `500` for what should be
ordinary, expected `404`s, `409`s, and `400`s, and logging every one of them
as if it were a real server bug worth paging someone over. A monitoring
dashboard alerting on 500-rate, or an on-call engineer paged for "elevated
server errors," would be reacting to completely normal "this product ID
doesn't exist" traffic. Migrating a service from its legacy exceptions to
`BusinessException` isn't just a style cleanup — it's a real, current
production-correctness gap, verifiable by reading exactly these two files.

### 30.4 Try It

Using `BusinessException`'s factory methods (Part I §5.2) and the existing
`ErrorCode.PRODUCT_NOT_FOUND` constant (Part I §3.4), write the single line
of code that would replace
`throw new ProductNotFoundException(String.format("Product with id[%d] not found", productId));`
in `ProductServiceImpl.findById` (Part I §4.2) — and state which
`@ExceptionHandler` method in `ApiExceptionHandler` would catch it once
that change is made, instead of falling through to `handleOther`.

---
