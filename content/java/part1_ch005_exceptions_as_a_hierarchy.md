## 5. Exceptions as a Hierarchy

### 5.1 The Concept

Python has one kind of exception: raise it, and either something catches it or
the program crashes. Java splits exceptions into two kinds, and the difference
is enforced by the compiler, not just convention:

- **Checked exceptions** (subclasses of `Exception` but not `RuntimeException`)
  — a method that can throw one must either catch it or declare it with
  `throws`, or the code doesn't compile. `IOException` is the classic example.
- **Unchecked exceptions** (subclasses of `RuntimeException`) — no such
  requirement. They can be thrown from anywhere without the method signature
  saying so, exactly like a Python `raise`.

Every custom exception in this codebase is unchecked — every single one extends
`RuntimeException`, directly or indirectly, which is the conventional choice
for a web backend: forcing every controller method to declare
`throws BusinessException` on every method would add noise without adding
safety, since a global handler (Part VIII) catches everything centrally anyway.

### 5.2 In This Codebase: The Modern Pattern

`BusinessException` is the shared exception every service in `common-lib`'s
"modern layer" throws. Its constructors are all `private` — the only way to
create one is through a static factory method. Here's the complete file:

```java
package com.ecommerce.commonlib.exception;

import com.ecommerce.commonlib.i18n.Messages;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Single business-level exception thrown by services. Carries:
 * <ul>
 *   <li>{@link ErrorCode} — machine-readable code + HTTP status</li>
 *   <li>Resolved, locale-aware message (computed eagerly at throw site)</li>
 * </ul>
 *
 * <h3>Throw sites — pick the smallest API that fits</h3>
 * <pre>{@code
 * throw BusinessException.of(ErrorCode.PRODUCT_NOT_FOUND);                     // canonical
 * throw BusinessException.of(ErrorCode.AUTH_USERNAME_EXISTS, "alice");         // with i18n args
 * throw BusinessException.notFound("auth.user.not.found.with.username", "x"); // ad-hoc + status
 * }</pre>
 *
 * <p>We <strong>do not</strong> wrap an arbitrary message + arbitrary status in a no-code
 * constructor — every error must map to an {@link ErrorCode} so dashboards stay consistent.</p>
 */
@Getter
public class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    private BusinessException(ErrorCode code, String message) {
        super(message);
        this.status = code.getHttpStatus();
        this.errorCode = code.getCode();
    }

    private BusinessException(ErrorCode code, String message, Throwable cause) {
        super(message, cause);
        this.status = code.getHttpStatus();
        this.errorCode = code.getCode();
    }

    private BusinessException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    // ------------------------------------------------------------------
    // Canonical factory — preferred entry point
    // ------------------------------------------------------------------

    public static BusinessException of(ErrorCode code, Object... messageArgs) {
        return new BusinessException(code, Messages.get(code.getMessageKey(), messageArgs));
    }

    /**
     * Use when a single {@link ErrorCode} maps to multiple i18n keys depending on context
     * (e.g. {@code AUTH_USER_NOT_FOUND} surfaces as different sentences per endpoint).
     */
    public static BusinessException ofKey(ErrorCode code, String messageKey, Object... messageArgs) {
        return new BusinessException(code, Messages.get(messageKey, messageArgs));
    }

    // ------------------------------------------------------------------
    // Status shortcuts — all funnel through ErrorCode so the catalog stays canonical
    // ------------------------------------------------------------------

    public static BusinessException badRequest(String messageKey, Object... args) {
        return new BusinessException(ErrorCode.BAD_REQUEST, Messages.get(messageKey, args));
    }

    public static BusinessException badRequest(String messageKey, Throwable cause, Object... args) {
        return new BusinessException(ErrorCode.BAD_REQUEST, Messages.get(messageKey, args), cause);
    }

    public static BusinessException unauthorized(String messageKey, Object... args) {
        return new BusinessException(ErrorCode.UNAUTHORIZED, Messages.get(messageKey, args));
    }

    public static BusinessException unauthorized(String messageKey, Throwable cause, Object... args) {
        return new BusinessException(ErrorCode.UNAUTHORIZED, Messages.get(messageKey, args), cause);
    }

    public static BusinessException forbidden(String messageKey, Object... args) {
        return new BusinessException(ErrorCode.FORBIDDEN, Messages.get(messageKey, args));
    }

    public static BusinessException forbidden(String messageKey, Throwable cause, Object... args) {
        return new BusinessException(ErrorCode.FORBIDDEN, Messages.get(messageKey, args), cause);
    }

    public static BusinessException notFound(String messageKey, Object... args) {
        return new BusinessException(ErrorCode.NOT_FOUND, Messages.get(messageKey, args));
    }

    public static BusinessException notFound(String messageKey, Throwable cause, Object... args) {
        return new BusinessException(ErrorCode.NOT_FOUND, Messages.get(messageKey, args), cause);
    }

    public static BusinessException conflict(String messageKey, Object... args) {
        return new BusinessException(ErrorCode.CONFLICT, Messages.get(messageKey, args));
    }

    public static BusinessException conflict(String messageKey, Throwable cause, Object... args) {
        return new BusinessException(ErrorCode.CONFLICT, Messages.get(messageKey, args), cause);
    }

    public static BusinessException internalServerError(String messageKey, Object... args) {
        return new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, Messages.get(messageKey, args));
    }

    public static BusinessException internalServerError(String messageKey, Throwable cause, Object... args) {
        return new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, Messages.get(messageKey, args), cause);
    }
}
```

**Source:** `common-lib/common-core/src/main/java/com/ecommerce/commonlib/exception/BusinessException.java`

This is the exception equivalent of the private-constructor-plus-factory
pattern already seen on `ApiResponse` in Part I §1 — and for the same reason.
A private constructor makes it *impossible* to construct a `BusinessException`
that isn't backed by a real `ErrorCode` (Part I §3.4), so every exception in the
system carries a stable machine-readable code and a correct HTTP status by
construction, not by convention that a developer might forget to follow.
Notice the shortcut methods (`notFound`, `conflict`, `badRequest`...) all funnel
through the *same* small set of `ErrorCode` constants (`NOT_FOUND`, `CONFLICT`,
`BAD_REQUEST`) — they exist purely so a throw site can write
`BusinessException.notFound("auth.user.not.found", id)` instead of the more
verbose `BusinessException.of(ErrorCode.NOT_FOUND, id)` with a matching
messageKey lookup.

### 5.3 Worth Noticing: The Legacy Pattern

`product-service`'s `ProductNotFoundException` shows what exception handling
looked like before `BusinessException` existed:

```java
package com.ecommerce.productservice.exception.wrapper;

import java.io.Serial;

public class ProductNotFoundException extends RuntimeException {
    @Serial
    private static final long serialVersionUID = 1L;

    public ProductNotFoundException() {
        super();
    }

    public ProductNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    public ProductNotFoundException(String message) {
        super(message);
    }

    public ProductNotFoundException(Throwable cause) {
        super(cause);
    }
}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/exception/wrapper/ProductNotFoundException.java`

Three concrete differences from `BusinessException`, all worth naming
explicitly:

1. **Public constructors, plain strings.** Anyone can `new ProductNotFoundException("oops")` with an arbitrary message — nothing ties it to a stable error code or a specific HTTP status.
2. **One class per error case.** `payment-service` has its own `PaymentNotFoundException`, `order-service` has `CartNotFoundException` and `OrderNotFoundException` — the pattern doesn't scale the way one `BusinessException` plus an `ErrorCode` enum entry does.
3. **No i18n.** The message is whatever string the throw site hardcoded, in whatever language that developer wrote it in — compare to `BusinessException`'s `Messages.get(messageKey, args)` (Part VIII §8.3).

Both styles are still live in the codebase today — this is the "why did they
build `common-lib`" story mentioned in the front matter, visible in exception
handling specifically.

### 5.4 Try It

Look at both files above. `ProductServiceImpl` (Part I §4) throws
`ProductNotFoundException` when a product lookup fails. If `product-service`
were migrated to use `BusinessException` instead, which existing `ErrorCode`
constant from Part I §3.4 would be the obvious replacement?

---
