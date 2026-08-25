## 29. One Place for All Errors

### 29.1 The Concept

`@RestControllerAdvice` is Spring's mechanism for a **global** exception
handler — one class, anywhere in the application, whose `@ExceptionHandler`
methods intercept exceptions thrown from *any* controller, so individual
controllers never need their own `try`/`catch` blocks just to shape an error
response. This is the single piece of machinery that turns every
`BusinessException.notFound(...)` call you've read throughout this book into
an actual HTTP response a client receives.

### 29.2 In This Codebase

`ApiExceptionHandler` is genuinely worth reading end to end once — it's the
one file that ties together `ApiResponse` (Part I §1.2), `ErrorCode`
(Part I §3.4), `BusinessException` (Part I §5.2), and `Messages` (§31 below)
into the single response shape every client of this platform actually sees:

```java
package com.ecommerce.commonlib.web.exception;

import com.ecommerce.commonlib.exception.BusinessException;
import com.ecommerce.commonlib.exception.ErrorCode;
import com.ecommerce.commonlib.i18n.Messages;
import com.ecommerce.commonlib.viewmodel.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;

import java.util.List;

@Order(Ordered.LOWEST_PRECEDENCE)
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final String ERROR_LOG_FORMAT = "ApiError uri={} status={} code={} message={} cause={}";

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex, WebRequest request) {
        return respond(ex.getStatus(), ex.getErrorCode(), ex.getMessage(), null, request, ex, false);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                          WebRequest request) {
        List<String> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .toList();
        return validationFailed(errors, request, ex);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex,
                                                                       WebRequest request) {
        List<String> errors = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .toList();
        return validationFailed(errors, request, ex);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex,
                                                                 WebRequest request) {
        return respond(HttpStatus.CONFLICT, ErrorCode.CONFLICT.getCode(),
                ex.getMostSpecificCause().getMessage(), null, request, ex, true);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        return respond(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN.getCode(),
                Messages.get(ErrorCode.FORBIDDEN.getMessageKey()), null, request, ex, false);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthentication(AuthenticationException ex, WebRequest request) {
        return respond(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED.getCode(),
                Messages.get(ErrorCode.UNAUTHORIZED.getMessageKey()), null, request, ex, false);
    }

    // ------------------------------------------------------------------
    // Fallback — catches anything not handled above
    // ------------------------------------------------------------------

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleOther(Exception ex, WebRequest request) {
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
                Messages.get(ErrorCode.INTERNAL_SERVER_ERROR.getMessageKey()), null, request, ex, true);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private ResponseEntity<ApiResponse<Void>> validationFailed(List<String> errors, WebRequest request, Exception ex) {
        return respond(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED.getCode(),
                Messages.get(ErrorCode.VALIDATION_FAILED.getMessageKey()), errors, request, ex, false);
    }

    private ResponseEntity<ApiResponse<Void>> respond(HttpStatus status, String code, String message,
                                                      List<String> errors, WebRequest request,
                                                      Exception ex, boolean withStack) {
        String path = resolvePath(request);
        Throwable root = getRootCause(ex);
        if (withStack) {
            log.error(ERROR_LOG_FORMAT, path, status.value(), code, message, root.getMessage(), ex);
        } else {
            log.warn(ERROR_LOG_FORMAT, path, status.value(), code, message, root.getMessage(), ex);
        }
        ApiResponse<Void> body = errors == null
                ? ApiResponse.error(code, message, path)
                : ApiResponse.error(code, message, errors, path);
        return ResponseEntity.status(status).body(body);
    }

    private static String resolvePath(WebRequest request) {
        return request instanceof ServletWebRequest swr ? swr.getRequest().getRequestURI() : null;
    }

    private static Throwable getRootCause(Throwable ex) {
        Throwable cause = ex.getCause();
        return cause != null ? getRootCause(cause) : ex;
    }
}
```

**Source:** `common-lib/common-spring/src/main/java/com/ecommerce/commonlib/web/exception/ApiExceptionHandler.java` (trimmed to the handlers discussed in this book; the real file has a few more — routing and upload-size handlers follow the identical shape)

The class-level Javadoc states the design principle plainly: *"one handler per
exception type instead of a generic mapper"* — the file could have been a
lookup table (`Map<Class<?>, ErrorCode>`), but a real method per exception
type lets each one make its own deliberate choice about log level (`warn` for
"this is the caller's fault," `error` — the `withStack` boolean — for "this is
our bug") and about whether to surface the exception's real message (§29's
validation handlers do) or hide it behind a canned one (`handleAuthentication`
never leaks *why* auth failed, deliberately).

Every path funnels through the same private `respond(...)` helper, which is
where `ApiResponse.error(...)` (Part I §1.2) actually gets constructed and
where `getRootCause(...)` — a small **recursive** method, walking down
`ex.getCause()` until it hits an exception with no further cause — finds the
*original* failure to log, even when it arrives wrapped in several layers of
translation (a `DataAccessException` wrapping a raw JDBC exception, say).

`@Order(Ordered.LOWEST_PRECEDENCE)` matters if more than one
`@RestControllerAdvice` class ever exists in a service (none currently do,
but the annotation is defensive) — it guarantees this one, the platform-wide
catch-all, only runs after any more specific advice a service might define,
never stealing an exception a service wanted to handle itself first.

### 29.3 Try It

`handleBusiness` reads `ex.getStatus()` and `ex.getErrorCode()` directly off
the exception instance rather than looking either up from a table keyed by
exception type. Looking back at `BusinessException`'s constructor (Part I
§5.2), explain where those two values actually came from — and why that
design means `handleBusiness` never needs to change, no matter how many new
`ErrorCode` constants get added to the catalog in Part I §3.4.

---
