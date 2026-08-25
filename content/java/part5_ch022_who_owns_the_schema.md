## 22. Who Owns the Schema?

### 22.1 The Concept

Every entity in this book — `User` (§18), `Product`/`Category` (Part I §6),
`Cart`/`Order` (§19) — describes a table shape through annotations. Hibernate
*could* read those annotations and auto-generate `CREATE TABLE`/`ALTER TABLE`
statements to match, and by default, a fresh Spring Boot project does exactly
that. This codebase deliberately turns that off. This short chapter is about
why, now that you've read enough entities and migrations to see the tradeoff
concretely instead of abstractly.

### 22.2 In This Codebase

Two settings, already seen separately, are really one decision read together:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
  liquibase:
    enabled: true
    change-log: classpath:db/changelog/db.changelog-master.yaml
```

**Source:** `auth-service/src/main/resources/application.yml` (Part II §8.2)

`ddl-auto: validate` means: at startup, compare every `@Entity` class's
annotations against the database's actual current schema, and **fail to
start** if they disagree — but never issue a single `CREATE` or `ALTER`
statement itself. All actual schema changes flow through Liquibase's
changelogs instead (Part II §11.3's `db.changelog-v1.0.0.sql`, with its exact
`roles`/`users`/`user_role` tables matching `User`'s `@Table`/`@Column`
annotations from §18.2 field for field).

### 22.3 The Tradeoff, Concretely

The alternative — `ddl-auto: update` (Hibernate silently alters the schema to
match your entities on every startup) — sounds convenient and is genuinely
common in tutorials and small projects. This codebase's choice trades that
convenience for two guarantees that matter more as a system grows real users
and real data:

- **Reviewable, ordered history.** Every schema change is a checked-in file (Part II §11.3's `db.changelog-v1.0.0.sql`, `v1.1.0`, and so on) that goes through the same code review as application code — not something Hibernate decides silently at 2am when a new field gets added to an entity.
- **No silent, surprising drops.** Hibernate's auto-update can rename or drop a column it believes is no longer needed based on the entity — right when you actually meant to keep the underlying data and just renamed the Java field. A hand-written Liquibase changeset for a rename is explicit: `RENAME COLUMN`, not `DROP` + `CREATE`.

The cost is real too: every entity change now requires *remembering* to write
a matching changelog by hand — nothing forces that pairing at compile time.
`ddl-auto: validate` is what catches the case where a developer forgets: the
service simply refuses to start, loudly, rather than running against a
schema quietly out of sync with what the code expects.

### 22.4 Try It

Suppose a developer added a new `@Column(name = "loyalty_points") private Integer loyaltyPoints;`
field to `User` (§18.2), but forgot to write a matching Liquibase changeset
adding that column to the real `users` table. Walk through what
`ddl-auto: validate` would actually do the next time `auth-service` starts,
and contrast it with what would happen under `ddl-auto: update` instead.

---
