## 39. Aspects and Annotations

### 39.1 The Concept

Part VII §25.2 already explained the *mechanism* behind `@PreAuthorize` —
Spring wrapping a bean in a proxy that intercepts calls before they reach
your code. That's actually a specific application of a more general
technique, **Aspect-Oriented Programming (AOP)**: writing cross-cutting
logic (logging, timing, security checks) once, as an "aspect," and having it
automatically apply anywhere a matching annotation appears — rather than
hand-writing the same `try`/`timing`/`logging` boilerplate inside every
method that needs it. This codebase's own logging infrastructure is built
directly on AOP, and unlike `@PreAuthorize` (built into Spring Security),
this one is hand-written, which makes it a good place to actually see the
mechanism instead of trusting it as a black box.

### 39.2 In This Codebase

`LogPerformance` is a custom annotation — just a marker with a few
configurable attributes, no behavior of its own:

```java
package com.ecommerce.commonlib.logging;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a method (or all methods in a class) for performance logging.
 *
 * <p>The AOP aspect logs duration and result only when execution time exceeds
 * {@code ecommerce.web.logging.performance.threshold-ms} (default 50ms),
 * keeping logs quiet for fast, healthy calls.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface LogPerformance {

    String title() default "";
    boolean logInput() default false;
    boolean logOutput() default false;
}
```

**Source:** `common-lib/common-logging/src/main/java/com/ecommerce/commonlib/logging/LogPerformance.java`

`@interface` (not `interface`) declares a new annotation type. `@Retention(RUNTIME)`
is what makes it usable by AOP at all — it means this annotation's presence
is preserved in the compiled `.class` file and readable via reflection at
runtime, unlike an annotation retained only at compile time. `@Target({METHOD, TYPE})`
restricts where it can legally be placed — on a method, or on a whole class
(applying it to every method in that class). Recall from Part I §4.3:
`UserServiceImpl.register` carries `@LogPerformance(title = "register user", logInput = true)` —
this annotation is what that was.

### 39.3 The Aspect That Actually Does the Work

```java
@Aspect
@RequiredArgsConstructor
public class LoggerAspect {

    private static final Logger perfLog = LoggerFactory.getLogger("perfLogger");

    private final PerformanceLogProperties props;

    @Around("@annotation(logPerformance)")
    public Object aroundLogPerformance(ProceedingJoinPoint pjp,
                                       LogPerformance logPerformance) throws Throwable {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        String action = pjp.getTarget().getClass().getSimpleName() + "." + sig.getName();
        String title  = logPerformance.title().isBlank() ? action : logPerformance.title();

        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            long duration = System.currentTimeMillis() - start;
            if (duration >= props.getThresholdMs()) {
                String inputs  = logPerformance.logInput()  ? stringify(pjp.getArgs()) : "-";
                String output  = logPerformance.logOutput() ? stringify(result)         : "-";
                logPerf(action, title, duration, LogField.SUCCESS, inputs, output);
            }
            return result;
        } catch (Throwable t) {
            long duration = System.currentTimeMillis() - start;
            logPerf(action, title, duration, LogField.ERROR, "-",
                    t.getClass().getSimpleName() + ": " + t.getMessage());
            throw t;
        }
    }

    private void logPerf(String action, String title, long durationMs,
                         String result, String inputs, String output) {
        String corrId = MDC.get(MdcKey.CORRELATION_ID);
        perfLog.info("[action={}] [duration={}ms] [result={}] [title={}] [corrId={}] [input={}] [output={}]",
                action, durationMs, result, title, corrId, inputs, output);
    }
}
```

**Source:** `common-lib/common-logging/src/main/java/com/ecommerce/commonlib/logging/LoggerAspect.java` (trimmed — the file also has a near-identical `aroundLoggable` method for a separate `@Loggable` annotation, entry/exit tracing rather than timing)

`@Around("@annotation(logPerformance)")` is the piece that ties §39.2's
annotation to this method: it tells Spring "run this advice **around** any
method call that carries `@LogPerformance`," and binds that specific
annotation instance to the `logPerformance` parameter — which is exactly how
`aroundLogPerformance` can read `logPerformance.title()`,
`logPerformance.logInput()` for the *specific* call currently happening.

`ProceedingJoinPoint pjp` is the AOP framework's handle on "the actual method
call that was intercepted." `pjp.proceed()` is the line that **actually
invokes the real method** — everything before it in this method is "before"
logic (recording the start time), everything after is "after" logic
(computing duration, logging). This is the concrete mechanics behind the
abstract description in Part VII §25.2: the proxy Spring generates for any
bean with a `@LogPerformance`-annotated method routes calls through code
exactly like this, before ever reaching your real method body — and
`pjp.proceed()` is the literal moment control passes from the aspect into
your code.

Notice the `try`/`catch` wraps `pjp.proceed()` specifically so a failing
method still gets its duration logged (at `ERROR` level, via the `catch`
block) before the exception is rethrown (`throw t;`) unchanged — the aspect
observes the call without altering its outcome either way; a caller of an
annotated method sees the exact same return value or exception it would have
without `@LogPerformance` ever being applied, just with a log line emitted
alongside.

### 39.4 Try It

`aroundLogPerformance` only calls `logPerf(...)` inside the success path when
`duration >= props.getThresholdMs()` — but *always* calls it inside the
`catch` block, regardless of duration. Explain, in your own words, why a slow
successful call and a failed call (even a fast one) are treated
asymmetrically here — what's the operational reasoning for always wanting to
know about a failure, but only wanting to know about success when it was
unusually slow?

---
