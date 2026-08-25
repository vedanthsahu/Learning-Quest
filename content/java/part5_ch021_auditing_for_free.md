## 21. Auditing for Free

### 21.1 The Concept

"Who created this row, and when? Who last touched it, and when?" is one of
the most common pieces of metadata any real table ends up needing — and one
of the most tedious to hand-write on every entity, every time. Spring Data
JPA has a built-in feature for exactly this: a `@MappedSuperclass` any entity
can extend, combined with a small interface telling it *who* the current user
is, and every timestamp/subject field is then populated automatically on
every save, with no per-entity code at all.

### 21.2 In This Codebase: The Shared Base Class

```java
package com.ecommerce.commonlib.data;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.ZonedDateTime;

/**
 * Mapped superclass for entities that need {@code createdOn/Off + createdBy/lastModifiedBy} columns.
 *
 * <p>Auditing wiring:</p>
 * <ul>
 *   <li>Timestamps populated by Hibernate ({@code @CreationTimestamp}, {@code @UpdateTimestamp}).
 *       These run inside the persistence layer and do not need a Spring context.</li>
 *   <li>Subjects populated by Spring Data's {@link AuditingEntityListener} which delegates
 *       to whatever {@code AuditorAware<String>} bean is registered (see {@code AuditorAwareImpl}).</li>
 * </ul>
 *
 * <p>We deliberately use the stock {@link AuditingEntityListener} rather than a custom
 * AspectJ-weaved listener — it works without compile-time weaving and survives
 * AOT/native-image processing without extra hints.</p>
 */
@MappedSuperclass
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public abstract class AbstractAuditEntity {

    @CreationTimestamp
    @Column(updatable = false)
    private ZonedDateTime createdOn;

    @CreatedBy
    @Column(updatable = false)
    private String createdBy;

    @UpdateTimestamp
    private ZonedDateTime lastModifiedOn;

    @LastModifiedBy
    private String lastModifiedBy;
}
```

**Source:** `common-lib/common-spring/src/main/java/com/ecommerce/commonlib/data/AbstractAuditEntity.java`

`@MappedSuperclass` is different from `@Entity` in one crucial way: it has no
table of its own. Its fields are folded directly into whatever table belongs
to the concrete subclass extending it — recall `Product` and `Category` from
Part I §6.3, both declared `extends AbstractMappedEntity` (a sibling class in
the same package, following the same pattern). Any entity extending it
automatically gets four columns (`createdOn`, `createdBy`, `lastModifiedOn`,
`lastModifiedBy`) added to its own table, without repeating these four field
declarations by hand on every entity in the codebase.

The Javadoc's split matters and is worth reading closely: the two timestamp
fields are populated by **Hibernate itself** (`@CreationTimestamp`/
`@UpdateTimestamp` are Hibernate-specific annotations, not standard JPA — they
work at the moment a row is actually written, with no Spring involvement at
all), while the two "who did it" fields are populated by **Spring Data's**
`AuditingEntityListener`, which needs to ask *something* who the current user
is.

### 21.3 In This Codebase: Answering "Who Is the Current User?"

```java
package com.ecommerce.commonlib.data.audit;

import com.ecommerce.commonlib.security.AuthenticationUtils;
import org.springframework.data.domain.AuditorAware;
import org.springframework.lang.NonNull;

import java.util.Optional;

/**
 * Resolves the current auditor from Spring Security: returns the JWT {@code sub} claim
 * for authenticated users, {@code "system"} for background jobs / tests with no security
 * context.
 */
public final class AuditorAwareImpl implements AuditorAware<String> {

    private static final String SYSTEM = "system";

    @Override
    public @NonNull Optional<String> getCurrentAuditor() {
        return Optional.of(AuthenticationUtils.currentUserId().orElse(SYSTEM));
    }
}
```

**Source:** `common-lib/common-spring/src/main/java/com/ecommerce/commonlib/data/audit/AuditorAwareImpl.java`

`AuditorAware<String>` is a one-method interface — `getCurrentAuditor()` —
that `AuditingEntityListener` (§21.2) calls automatically every time an
audited entity is saved, to fill in `createdBy`/`lastModifiedBy`. The
implementation here is a small, honest piece of defensive design: it tries to
read the current authenticated user's ID (from the JWT's `sub` claim, via
`AuthenticationUtils`, which reaches into the same `SecurityContextHolder`
Part VII covers properly), and falls back to the literal string `"system"`
when there isn't one — a background job, a scheduled task, or a test running
with no HTTP request and no security context at all. Note the return type is
itself `Optional<String>` (Part I §4.1), wrapping a value that's *never*
actually empty here (`.orElse(SYSTEM)` already guarantees a value before it's
wrapped) — `AuditorAware<String>`'s own interface contract requires an
`Optional`, so this method honors that contract even though, in this
particular implementation, the "empty" case can never actually occur.

### 21.4 Try It

`createdOn` and `createdBy` both carry `@Column(updatable = false)`, but
`lastModifiedOn` and `lastModifiedBy` don't. Explain, in your own words, why
that specific pair — and only that pair — needs to be locked against updates
for the auditing fields to mean what their names claim.

---
