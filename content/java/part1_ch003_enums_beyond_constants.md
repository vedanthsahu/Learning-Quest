## 3. Enums Beyond Constants

### 3.1 The Concept

Java's `enum` and Python's `enum.Enum` start from the same idea — a fixed,
named set of values — but Java's version is a full class. An enum constant can
carry its own fields, get them from a constructor, and every enum implicitly
extends `java.lang.Enum` and can implement interfaces. In practice this means
Java enums are used not just for simple tags (`RoleName.ADMIN`) but as compact,
type-safe lookup tables — which is exactly how the richest example in this
codebase uses one.

### 3.2 The Plain Form

The simplest enum in this codebase is exactly what you'd expect:

```java
package com.ecommerce.authservice.entity;

public enum RoleName {
    USER,
    PM,
    ADMIN
}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/entity/RoleName.java`

Worth noticing: `order-service` has its own, separately-defined `RoleName.java`
with the same three constants. Nothing in `common-lib` shares this enum across
services. That's not an oversight — in a microservices architecture, each
service is independently deployable, and a shared enum in `common-lib` would
mean every service redeploys whenever the role list changes. Small, stable
constants like this are often deliberately duplicated rather than centralized.

### 3.3 A Constant With Its Own Field

`PaymentStatus` steps up one level: each constant supplies an argument to the
enum's constructor, giving every value its own piece of state:

```java
package com.ecommerce.paymentservice.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum PaymentStatus {

    NOT_STARTED("not_started"),
    IN_PROGRESS("in_progress"),
    COMPLETED("completed");

    private final String status;

}
```

**Source:** `payment-service/src/main/java/com/ecommerce/paymentservice/entity/PaymentStatus.java`

Lombok's `@RequiredArgsConstructor` generates the constructor that accepts
`status` from Lombok's usual field-to-constructor-parameter convention — the
same annotation you'll see generating constructors for ordinary Spring beans in
Part III. `PaymentStatus.NOT_STARTED.getStatus()` returns `"not_started"`, the
lowercase wire-format string, separate from the constant's own Java name.

### 3.4 An Enum as a Full Catalog

`ErrorCode` is the largest enum in the codebase — every single error the
platform can return is one constant, each carrying three pieces of data at
once: a stable machine-readable code, an i18n message key, and the HTTP status
to respond with. Here's the complete file:

```java
package com.ecommerce.commonlib.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Centralized error catalog. Each entry is the contract between services and clients:
 * a stable machine-readable {@code code}, an i18n message key, and the HTTP status to return.
 *
 * <p>Why an enum: gives compile-time exhaustiveness checks at every {@code switch} site
 * and prevents typos in {@code code} / {@code messageKey} drift.</p>
 */
@Getter
public enum ErrorCode {

    // ---- Generic ----
    BAD_REQUEST("ERR-0400", "error.bad.request", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED("ERR-0401", "error.unauthorized", HttpStatus.UNAUTHORIZED),
    FORBIDDEN("ERR-0403", "error.forbidden", HttpStatus.FORBIDDEN),
    NOT_FOUND("ERR-0404", "error.not.found", HttpStatus.NOT_FOUND),
    METHOD_NOT_ALLOWED("ERR-0405", "error.method.not.allowed", HttpStatus.METHOD_NOT_ALLOWED),
    NOT_ACCEPTABLE("ERR-0406", "error.not.acceptable", HttpStatus.NOT_ACCEPTABLE),
    CONFLICT("ERR-0409", "error.conflict", HttpStatus.CONFLICT),
    UNSUPPORTED_MEDIA_TYPE("ERR-0415", "error.unsupported.media.type", HttpStatus.UNSUPPORTED_MEDIA_TYPE),
    UNPROCESSABLE_ENTITY("ERR-0422", "error.unprocessable.entity", HttpStatus.UNPROCESSABLE_ENTITY),
    VALIDATION_FAILED("ERR-0422-V", "error.validation.failed", HttpStatus.BAD_REQUEST),
    TOO_MANY_REQUESTS("ERR-0429", "error.too.many.requests", HttpStatus.TOO_MANY_REQUESTS),
    PAYLOAD_TOO_LARGE("ERR-0413", "error.payload.too.large", HttpStatus.PAYLOAD_TOO_LARGE),
    INTERNAL_SERVER_ERROR("ERR-0500", "error.internal.server", HttpStatus.INTERNAL_SERVER_ERROR),
    SERVICE_UNAVAILABLE("ERR-0503", "error.service.unavailable", HttpStatus.SERVICE_UNAVAILABLE),
    GATEWAY_TIMEOUT("ERR-0504", "error.gateway.timeout", HttpStatus.GATEWAY_TIMEOUT),
    ACCESS_DENIED("ERR-0403-A", "access.denied", HttpStatus.FORBIDDEN),

    // ---- Auth domain ----
    AUTH_TOKEN_INVALID("AUTH-1001", "auth.token.invalid", HttpStatus.UNAUTHORIZED),
    AUTH_TOKEN_EXPIRED("AUTH-1002", "auth.token.expired", HttpStatus.UNAUTHORIZED),
    AUTH_USERNAME_EXISTS("AUTH-1003", "auth.username.exists", HttpStatus.CONFLICT),
    AUTH_EMAIL_EXISTS("AUTH-1004", "auth.email.exists", HttpStatus.CONFLICT),
    AUTH_PHONE_EXISTS("AUTH-1005", "auth.phone.exists", HttpStatus.CONFLICT),
    AUTH_USER_NOT_FOUND("AUTH-1006", "auth.user.not.found", HttpStatus.NOT_FOUND),
    AUTH_ROLE_NOT_FOUND("AUTH-1007", "auth.role.not.found", HttpStatus.NOT_FOUND),
    AUTH_PASSWORD_MANAGED_BY_KEYCLOAK("AUTH-1008", "auth.password.managed.by.keycloak", HttpStatus.BAD_REQUEST),
    AUTH_INVALID_CREDENTIALS("AUTH-1009", "auth.invalid.credentials", HttpStatus.UNAUTHORIZED),

    // ---- Product domain ----
    PRODUCT_NOT_FOUND("PRD-2001", "product.not.found", HttpStatus.NOT_FOUND),
    PRODUCT_NAME_EXISTS("PRD-2002", "product.name.exists", HttpStatus.CONFLICT),
    CATEGORY_NOT_FOUND("PRD-2003", "category.not.found", HttpStatus.NOT_FOUND),

    // ---- Inventory domain ----
    WAREHOUSE_NOT_FOUND("INV-3001", "warehouse.not.found", HttpStatus.NOT_FOUND),
    STOCK_INSUFFICIENT("INV-3002", "stock.insufficient", HttpStatus.CONFLICT),

    // ---- Order domain ----
    ORDER_NOT_FOUND("ORD-4001", "order.not.found", HttpStatus.NOT_FOUND),
    CART_NOT_FOUND("ORD-4002", "cart.not.found", HttpStatus.NOT_FOUND),

    // ---- Payment domain ----
    PAYMENT_FAILED("PAY-5001", "payment.failed", HttpStatus.BAD_REQUEST),
    PAYMENT_NOT_FOUND("PAY-5002", "payment.not.found", HttpStatus.NOT_FOUND);

    private final String code;
    private final String messageKey;
    private final HttpStatus httpStatus;

    ErrorCode(String code, String messageKey, HttpStatus httpStatus) {
        this.code = code;
        this.messageKey = messageKey;
        this.httpStatus = httpStatus;
    }
}
```

**Source:** `common-lib/common-core/src/main/java/com/ecommerce/commonlib/exception/ErrorCode.java`

This one, unlike `PaymentStatus`, spells out its constructor by hand rather than
using Lombok — with three constructor arguments instead of one, an explicit
constructor reads more clearly than a generated one. The Javadoc at the top of
the file states the payoff directly: using an enum here "gives compile-time
exhaustiveness checks at every `switch` site and prevents typos in `code` /
`messageKey` drift" — a typo in a string literal scattered across the codebase
would only surface at runtime; a typo in an enum constant name fails to
compile. `BusinessException` (Part VIII) is built entirely on top of this enum.
Notice too how the comments group constants by domain (`Generic`, `Auth domain`,
`Product domain`...) even though nothing in the language enforces that grouping
— it's a convention the team chose for readability as the catalog grew.

### 3.5 Try It

Look at `PRODUCT_NOT_FOUND` above. Without running any code, state the exact
HTTP status a client would receive if a service threw an exception carrying
this error code — then check yourself against the third constructor argument
on that line.

---
