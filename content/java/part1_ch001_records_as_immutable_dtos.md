## 1. Records as Immutable DTOs

### 1.1 The Concept

A Java `record` declares an immutable data carrier in one line. Write:

```java
record Point(int x, int y) {}
```

and the compiler generates, for free: a constructor taking `x` and `y`, accessor
methods `x()` and `y()` (not `getX()` — no "get" prefix), `equals()`/`hashCode()`
based on the fields, and a `toString()`. There's no way to reassign `x` or `y`
after construction — every field is implicitly `final`.

If you know Python's `@dataclass(frozen=True)`, that's the closest analogy: a
class whose entire job is holding a fixed bundle of values, with the boilerplate
(constructor, equality, printing) generated instead of hand-written. The
difference is that a record's immutability is enforced by the compiler, not a
runtime check — there's no way to bypass it the way Python lets you reach into
`object.__setattr__` on a frozen dataclass.

### 1.2 In This Codebase

`ApiResponse<T>` is the response envelope every endpoint in this platform
returns. It's a record with eight fields, and no code anywhere in the codebase
calls its constructor directly — every call site uses one of its static
factory methods instead. Here's the complete file:

```java
package com.ecommerce.commonlib.viewmodel;

import com.ecommerce.commonlib.constants.MdcKey;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.slf4j.MDC;

import java.time.Instant;
import java.util.List;

/**
 * Unified response envelope returned by every endpoint in the platform.
 * Fields with {@code null} values are omitted from the JSON payload.
 *
 * @param success   outcome flag — {@code true} for 2xx, {@code false} for error responses
 * @param code      stable application code (e.g. {@code "AUTH-1001"}) or {@code "OK"} for success
 * @param message   human-readable, locale-aware summary
 * @param data      response payload (omitted on error)
 * @param errors    list of field-level / detail errors (omitted on success)
 * @param path      request URI that produced this response
 * @param traceId   correlation id propagated via MDC for distributed tracing
 * @param timestamp ISO-8601 instant the response was built
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String code,
        String message,
        T data,
        List<String> errors,
        String path,
        String traceId,
        Instant timestamp
) {

    public static final String SUCCESS_CODE = "OK";

    public static <T> ApiResponse<T> ok(T data) {
        return success(SUCCESS_CODE, null, data);
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        return success(SUCCESS_CODE, message, data);
    }

    public static ApiResponse<Void> message(String message) {
        return success(SUCCESS_CODE, message, null);
    }

    public static ApiResponse<Void> error(String code, String message, String path) {
        return new ApiResponse<>(false, code, message, null, null, path, currentTraceId(), Instant.now());
    }

    public static ApiResponse<Void> error(String code, String message, List<String> errors, String path) {
        return new ApiResponse<>(false, code, message, null, errors, path, currentTraceId(), Instant.now());
    }

    private static <T> ApiResponse<T> success(String code, String message, T data) {
        return new ApiResponse<>(true, code, message, data, null, null, currentTraceId(), Instant.now());
    }

    private static String currentTraceId() {
        return MDC.get(MdcKey.TRACE_ID);
    }
}
```

**Source:** `common-lib/common-core/src/main/java/com/ecommerce/commonlib/viewmodel/ApiResponse.java`

This is the record equivalent of Python's "private constructor, use a
`classmethod` instead" pattern — nothing stops external code from calling
`new ApiResponse<>(...)` directly with all eight positional fields, but every
real call site in the repo goes through `ok(...)`, `message(...)`, or
`error(...)` instead, because getting eight positional booleans/strings right by
hand invites mistakes the factory methods prevent. `currentTraceId()` is a
private helper every factory method funnels through, so the correlation ID
(Part X §10.5) gets attached automatically without every call site having to
remember to add it.

A second record in the same module, `SecurityProperties`, shows a feature plain
records don't get for free: validation. Its **compact constructor** — a
constructor with no parameter list, just a body — runs before the fields are
assigned, and can normalize incoming values:

```java
package com.ecommerce.commonlib.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Per-service security configuration bound from {@code ecommerce.security.*}.
 *
 * <p>Endpoint allow-lists live here (not hardcoded inside {@code BaseSecurityConfig})
 * so each service decides which routes are public. The defaults open the actuator
 * health/info endpoints and OpenAPI documentation only — everything else is denied.</p>
 *
 * <pre>{@code
 * ecommerce:
 *   security:
 *     public-paths:
 *       - /api/v1/auth/login
 *       - /api/v1/auth/refresh
 *     public-method-paths:
 *       GET:
 *         - /api/v1/products/**
 * }</pre>
 */
@ConfigurationProperties(prefix = "ecommerce.security")
public record SecurityProperties(
        boolean enabled,
        List<String> publicPaths,
        boolean csrfDisabled,
        boolean statelessSession
) {

    private static final List<String> ALWAYS_PUBLIC = List.of(
            "/actuator/health",
            "/actuator/health/**",
            "/actuator/info",
            "/actuator/prometheus",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-resources/**"
    );

    public SecurityProperties {
        if (publicPaths == null) {
            publicPaths = List.of();
        }
    }

    /**
     * Effective allow-list = service-provided paths ∪ platform-wide unconditionally public paths.
     */
    public List<String> resolvedPublicPaths() {
        return java.util.stream.Stream
                .concat(ALWAYS_PUBLIC.stream(), publicPaths.stream())
                .distinct()
                .toList();
    }
}
```

**Source:** `common-lib/common-security/src/main/java/com/ecommerce/commonlib/security/SecurityProperties.java`

Reassigning `publicPaths` inside the compact constructor (line 43 in the real
file) is legal precisely because this code runs *before* the implicit field
assignment — it's rewriting the incoming argument, not mutating an
already-constructed, already-immutable record. `resolvedPublicPaths()` is an
ordinary instance method a record can have just like any class — records only
restrict how the *fields* behave, not what methods you can add.

### 1.3 Worth Noticing: Not Everything Is a Record

`DtoCollectionResponse<T>`, in `product-service`, does a similar job to
`ApiResponse<T>` (wrapping data for an HTTP response) but is a plain
Lombok-annotated class, not a record:

```java
package com.ecommerce.productservice.dto.response.collection;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collection;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class DtoCollectionResponse<T> {
    private Collection<T> collection;
}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/dto/response/collection/DtoCollectionResponse.java`

This is `product-service`'s "legacy layer" style (see front matter §0.2):
`@Data` generates getters *and* setters, so this object is mutable, and
`@Builder` gives it a fluent construction API records don't have built in.
Neither approach is a mistake — records didn't exist in Java until version 16,
so any DTO written before then, or by a team not yet using records, looks like
this instead. You'll see both throughout this book.

### 1.4 Try It

Look back at `ApiResponse.java` above. Find `ok(T data)` and
`message(String message)`. Without running anything, write down what JSON key
would be present in one but missing from the other — then check your answer
against the `@JsonInclude(NON_NULL)` annotation at the top of the record.

---
