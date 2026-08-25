## 37. Tracing a Request Across Services

### 37.1 The Concept

A single user action — "place an order" — can touch several services in this
platform: `order-service`, which might call `auth-service` and
`product-service` (§33) along the way. When something goes wrong, or is just
slow, being able to find *every* log line across *every* service that
belongs to that one specific request is the difference between a five-minute
investigation and an afternoon of grep. This chapter is where two pieces
mentioned in passing earlier — the `X-Correlation-Id` header (Part II §10.3)
and `MDC` (mentioned but not shown, Part V §21) — turn out to be the same
mechanism, read fully for the first time.

### 37.2 Assigning an ID at the Front Door

```java
package com.ecommerce.commonlib.web.filter;

import com.ecommerce.commonlib.constants.MdcKey;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.util.UUID;

/**
 * Propagates {@code X-Correlation-Id} / {@code X-Request-Id} headers across services
 * by storing them in {@link MDC} and echoing them back to the caller.
 *
 * <p>Ordered first so every downstream log line — including ones from the Spring
 * Security filter chain — carries the ids.</p>
 */
public final class CorrelationIdFilter extends OncePerRequestFilter implements Ordered {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    public static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String correlationId = headerOrNew(request, CORRELATION_ID_HEADER);
        String requestId = headerOrNew(request, REQUEST_ID_HEADER);

        MDC.put(MdcKey.CORRELATION_ID, correlationId);
        MDC.put(MdcKey.REQUEST_ID, requestId);
        if (MDC.get(MdcKey.TRACE_ID) == null) {
            MDC.put(MdcKey.TRACE_ID, correlationId);
        }

        response.setHeader(CORRELATION_ID_HEADER, correlationId);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MdcKey.CORRELATION_ID);
            MDC.remove(MdcKey.REQUEST_ID);
            MDC.remove(MdcKey.TRACE_ID);
        }
    }

    private static String headerOrNew(HttpServletRequest request, String header) {
        String value = request.getHeader(header);
        return StringUtils.hasText(value) ? value : UUID.randomUUID().toString();
    }
}
```

**Source:** `common-lib/common-spring/src/main/java/com/ecommerce/commonlib/web/filter/CorrelationIdFilter.java`

`OncePerRequestFilter` guarantees this logic runs exactly once per incoming
HTTP request, regardless of how many internal forwards happen. `getOrder()`
returning `Ordered.HIGHEST_PRECEDENCE` means this filter runs *before every
other filter*, including Spring Security's own JWT verification chain (Part
VII §24) — the Javadoc states why directly: so even a request that gets
rejected by security still has a correlation ID attached to whatever log line
records that rejection. `headerOrNew(...)` is the entry point to the whole
mechanism: if the incoming request already carries an `X-Correlation-Id`
(because it came *from* another service in this platform that already
assigned one), reuse it; otherwise, this request is the origin, and a fresh
UUID is minted here.

`MDC` (Mapped Diagnostic Context, from SLF4J) is a thread-local-like map every
log statement on the current thread automatically has access to, without
being passed explicitly — this is the actual mechanism, and it's what
`MdcKey.CORRELATION_ID` (§37.3) gets stored under. The `finally` block's
`MDC.remove(...)` calls matter specifically because request-handling threads
are typically pooled and reused across many different requests — without
explicitly clearing MDC at the end of each request, a later, unrelated
request handled by the same physical thread could inherit a stale
correlation ID from whatever request ran there previously.

### 37.3 The Shared Key Names

```java
package com.ecommerce.commonlib.constants;

public final class MdcKey {

    public static final String CORRELATION_ID = "correlationId";
    public static final String REQUEST_ID = "requestId";
    public static final String TRACE_ID = "traceId";
    public static final String SPAN_ID = "spanId";
    public static final String USER_ID = "userId";

    private MdcKey() {
    }
}
```

**Source:** `common-lib/common-core/src/main/java/com/ecommerce/commonlib/constants/MdcKey.java`

A small class, but a real one: five string constants, `final`, `private`
no-args constructor (Part II §9.3's static-holder idiom, again). Its Javadoc's
one line matters — *"keep both the constant names and the literal values in
sync with the log pattern in `logback-spring.xml`"* — these exact string keys
have to match whatever the logging configuration expects to find in MDC in
order to actually print them into log lines, a coupling that lives entirely
outside the type system (nothing would catch a typo here at compile time; it
would just silently show up as a missing field in every log line).

### 37.4 The Full Path, Traced

Put together, one request's journey: `CorrelationIdFilter` (§37.2) assigns or
reuses a correlation ID the moment a request hits any service, and stores it
in MDC. `ApiResponse` (Part I §1.2) reads it back out via `MDC.get(MdcKey.TRACE_ID)`
into `currentTraceId()`, attaching it to every response body. If this
service, in the course of handling that request, calls another one through
`CallAPI`'s pooled `RestClient` (§33.3), `CorrelationIdPropagationInterceptor`
(Part II §10.3) reads the *same* MDC value and forwards it as an outbound
header — so the *next* service's own `CorrelationIdFilter` sees an existing
`X-Correlation-Id` already present and reuses it (§37.2's `headerOrNew`)
rather than minting a new one. One ID, generated once, carried automatically
through every hop, with no application code anywhere explicitly threading it
through method calls.

### 37.5 Try It

If `order-service` calls `auth-service` (§33), which in turn calls a third
service neither of you have read about in this book, would that third
service's own logs still carry the *same* correlation ID as the original
request into `order-service` — or would it start a new one? Trace the
mechanism from §37.2 through §37.4 to justify your answer.

---
