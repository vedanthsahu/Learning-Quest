## 31. Messages That Aren't Hardcoded

### 31.1 The Concept

Every `Messages.get(messageKey, args)` call you've read throughout this book —
inside `BusinessException`'s factory methods (Part I §5.2), inside
`ApiExceptionHandler` (§29.2) — resolves a short string key like
`"product.not.found"` into an actual, human-readable, locale-appropriate
sentence. This chapter is about that one small utility class itself: how it
resolves a key, and why it has more than one fallback path instead of just
reading a properties file directly.

### 31.2 In This Codebase

```java
package com.ecommerce.commonlib.i18n;

import lombok.Setter;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.context.i18n.LocaleContextHolder;

import java.text.MessageFormat;
import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;

/**
 * Static i18n facade used from non-Spring contexts (exception constructors, utility code).
 *
 * <p>Resolution order:</p>
 * <ol>
 *   <li>Spring-managed {@link MessageSource} if it has been installed via {@link #setMessageSource}.
 *       This is the path that runs at request time — it uses the locale resolver,
 *       respects cached bundles, and supports nested fallbacks.</li>
 *   <li>A {@link ResourceBundle} loaded from {@code messages/messages_*.properties} on the
 *       classpath — used during early bootstrap, in unit tests, and from non-web modules.</li>
 *   <li>The raw {@code messageKey} when nothing else matches, so error responses always
 *       contain <em>something</em> instead of crashing the handler.</li>
 * </ol>
 *
 * <p>Format placeholders use {@link MessageFormat} {@code {0}} indexed syntax — the same
 * syntax Spring's {@code MessageSource} understands so templates are interpreted identically
 * on both lookup paths.</p>
 */
public final class Messages {

    private static final String BUNDLE_BASENAME = "messages.messages";

    @Setter
    private static volatile MessageSource messageSource;

    private Messages() {
    }

    public static String get(String messageKey, Object... args) {
        if (messageKey == null) {
            return null;
        }
        Locale locale = LocaleContextHolder.getLocale();

        MessageSource source = messageSource;
        if (source != null) {
            try {
                return source.getMessage(messageKey, args, locale);
            } catch (NoSuchMessageException ignored) {
                // fall through to the bundle path
            }
        }

        return fromBundle(messageKey, locale, args);
    }

    private static String fromBundle(String messageKey, Locale locale, Object[] args) {
        try {
            ResourceBundle bundle = ResourceBundle.getBundle(BUNDLE_BASENAME, locale);
            String template = bundle.getString(messageKey);
            return args == null || args.length == 0
                    ? template
                    : new MessageFormat(template, locale).format(args);
        } catch (MissingResourceException ex) {
            return messageKey;
        }
    }
}
```

**Source:** `common-lib/common-core/src/main/java/com/ecommerce/commonlib/i18n/Messages.java`

The class-level Javadoc names the actual problem this solves: **"used from
non-Spring contexts."** Spring's own `MessageSource` (its standard i18n
mechanism) is only reliably available once the full application context has
started — but `BusinessException`'s constructors (Part I §5.2) can run during
early startup, in a unit test with no Spring context at all, or in any plain
utility code that isn't itself a Spring bean. `Messages` is a `static` facade
specifically so any code, anywhere, can call `Messages.get(...)` without being
a Spring-managed bean able to have a `MessageSource` injected into it.

`@Setter private static volatile MessageSource messageSource;` is worth
reading carefully — a `static` field holding shared state that something
*installs* into this class after Spring finishes starting (likely a small
`@PostConstruct` or `ApplicationListener` elsewhere in `common-lib`, wiring
the real `MessageSource` in once it exists). `volatile` here is a concurrency
correctness detail: it guarantees that once one thread sets this field, every
other thread immediately sees the new value rather than a possibly-stale
cached copy — necessary specifically because this field is written once, from
one thread, during startup, but read from every request-handling thread
afterward.

The three-step fallback in `get(...)` mirrors the Javadoc's numbered list
exactly: try the real Spring `MessageSource` first (locale-aware, respects
whatever `LocaleContextHolder` resolved from the request — tying back to
`spring.web.locale-resolver: accept-header` in Part II §8.2's `application.yml`);
if that's not installed yet or doesn't have the key, fall back to loading a
`ResourceBundle` directly from the classpath; if even *that* fails (a typo'd
key, a missing bundle entirely), return the raw key string itself rather than
throwing. That last fallback is a deliberate reliability choice: a broken i18n
lookup should never be the reason an error response fails to render at all —
worst case, a client sees the literal key `"product.not.found"` instead of a
translated sentence, which is a much smaller problem than an unhandled
exception inside the exception handler itself.

### 31.3 Try It

`fromBundle(...)` only calls `new MessageFormat(template, locale).format(args)`
when `args` is non-empty — for a zero-argument message key, it returns
`template` directly, unformatted. Given that `MessageFormat.format` treats
literal `{` and `}` characters in a template as the start of a placeholder,
explain what would break for a message template that legitimately needed to
contain a literal curly brace, if this code *always* ran every template
through `MessageFormat` regardless of whether `args` was empty.

---
