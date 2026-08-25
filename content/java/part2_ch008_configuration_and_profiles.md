## 8. Configuration & Profiles

### 8.1 The Concept

Python backends typically read configuration from environment variables
directly (`os.environ.get("DATABASE_URL")`) or a `.env` file loaded by a
library like `python-dotenv`. Spring Boot centralizes this into one file —
conventionally `application.yml` — with a specific, powerful feature: any
value in it can reference an environment variable *with a fallback default*,
using `${VAR_NAME:default}` syntax, so the same file works unmodified whether
an environment variable is set (in production/Docker) or not (running locally).

A single `application.yml` can also hold **multiple documents**, separated by
a bare `---` line — each document is merged into the final configuration, and
splitting it this way is purely for organization (grouping server settings
separately from database settings, for instance), not a functional
requirement.

### 8.2 In This Codebase

`auth-service`'s `application.yml` uses both features throughout. Here's the
core of it:

```yaml
server:
  port: 8088
  shutdown: graceful
  servlet:
    context-path: /auth
---
spring:
  application:
    name: AUTH-SERVICE
  threads:
    virtual:
      enabled: true
  lifecycle:
    timeout-per-shutdown-phase: 30s
  web:
    locale: vi_VN
    locale-resolver: accept-header
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://${POSTGRES_HOST:localhost}:${POSTGRES_PORT:5432}/authservice}
    username: ${POSTGRES_USER:admin}
    password: ${POSTGRES_PASSWORD:admin}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: false
    show-sql: false
  liquibase:
    enabled: true
    change-log: classpath:db/changelog/db.changelog-master.yaml
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${JWT_ISSUER_URI:http://localhost:8080/realms/ecommerce}
---
keycloak:
  client:
    server-url: ${KEYCLOAK_SERVER_URL:http://localhost:8080}
    public-server-url: ${KEYCLOAK_PUBLIC_SERVER_URL:http://keycloak.ecommerce.local}
    realm: ${KEYCLOAK_REALM:ecommerce}
    client-id: ${KEYCLOAK_CLIENT_ID:ecommerce-client}
    client-secret: ${KEYCLOAK_CLIENT_SECRET:}
```

**Source:** `auth-service/src/main/resources/application.yml`

Notice `spring.datasource.url` nests a `${...:default}` expression *inside*
another one — `${SPRING_DATASOURCE_URL:jdbc:postgresql://${POSTGRES_HOST:localhost}:${POSTGRES_PORT:5432}/authservice}`.
Read from the outside in: if the environment variable `SPRING_DATASOURCE_URL`
is set, use it as-is and stop; otherwise, fall back to building a connection
string from `POSTGRES_HOST` and `POSTGRES_PORT` (each with their own
independent defaults). This lets a developer running the service locally with
no environment variables set at all still connect to `localhost:5432`, while a
Docker Compose or Kubernetes deployment can override every piece
independently.

`spring.threads.virtual.enabled: true` turns on Java 21's **virtual threads**
— lightweight threads managed by the JVM rather than the operating system,
letting a single service handle far more concurrent blocking requests (like a
slow database query) than traditional OS threads would allow, without
rewriting any code to be asynchronous. This is a genuinely recent feature —
virtual threads only became stable in Java 21 — and it's a one-line opt-in
here specifically because Spring Boot already built the integration.

`spring.jpa.hibernate.ddl-auto: validate` is worth flagging now and returning
to properly in Part V §5.5: it tells Hibernate to check the database schema
matches the entity classes at startup and fail if it doesn't, but never to
*create or alter* tables itself — that job belongs entirely to Liquibase
(`spring.liquibase.change-log`), covered in §8.5 below.

### 8.3 `@ConfigurationProperties`, Revisited

Part I §1.2 already showed `SecurityProperties` — a record bound directly onto
a YAML section via `@ConfigurationProperties(prefix = "ecommerce.security")`.
That's the general mechanism this whole file feeds: any `ecommerce.*` block
here binds onto a corresponding `@ConfigurationProperties` class somewhere in
`common-lib`, the same way `spring.*` and `keycloak.*` blocks bind onto
Spring's and this platform's own configuration classes respectively. You
never see application code calling `System.getenv(...)` directly anywhere in
this codebase — every setting flows through this one typed path instead.

### 8.4 Try It

Look at the `spring.datasource.url` line above. If this service were started
with no environment variables set at all, write out the exact JDBC URL it
would connect to — then check your answer by resolving each `${...:default}`
expression from the inside out.

---
