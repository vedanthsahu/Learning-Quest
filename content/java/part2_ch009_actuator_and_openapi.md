## 9. Actuator & OpenAPI

### 9.1 The Concept

Two operational concerns every production backend needs, Python or Java:
**health/metrics endpoints** for infrastructure to check whether the service
is alive, and **API documentation** generated from the code itself rather than
hand-maintained separately. Spring Boot's answers are Actuator (health,
metrics, and other operational endpoints, auto-exposed with almost no code)
and springdoc-openapi (generates an OpenAPI/Swagger spec by reading your
`@RestController` classes and annotations at runtime).

### 9.2 In This Codebase: Actuator on Its Own Port

```yaml
management:
  server:
    port: ${MANAGEMENT_PORT:9000}
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
```

**Source:** `auth-service/src/main/resources/application.yml` (management section)

`auth-service` itself listens on port 8088 (§8.2), but Actuator's endpoints
(`/actuator/health`, `/actuator/metrics`, `/actuator/prometheus`) are exposed
on a *separate* port, 9000. This is a deliberate production pattern: the
management port can be firewalled off from public traffic and reachable only
by internal infrastructure (a Kubernetes liveness probe, a Prometheus
scraper), while the main API port stays exposed to the outside world —
without either concern having to share exposure rules with the other.
`endpoints.web.exposure.include` is itself a safety mechanism: Actuator can
expose far more than these four endpoints (including ones that reveal
internal configuration), so this line is an explicit allow-list, not a
default-everything-on posture.

### 9.3 In This Codebase: Generating Docs From Code

```yaml
springdoc:
  swagger-ui:
    path: /swagger-ui.html
    oauth:
      use-pkce-with-authorization-code-grant: true
      client-id: swagger-ui
  packagesToScan: com.ecommerce.authservice
  oauthflow:
    authorization-url: ${KEYCLOAK_SERVER_URL:http://localhost:8080}/realms/${KEYCLOAK_REALM:ecommerce}/protocol/openid-connect/auth
    token-url: ${KEYCLOAK_SERVER_URL:http://localhost:8080}/realms/${KEYCLOAK_REALM:ecommerce}/protocol/openid-connect/token
```

**Source:** `auth-service/src/main/resources/application.yml` (springdoc section)

`packagesToScan` tells springdoc which package to inspect for `@RestController`
classes and build a live OpenAPI spec from — no separate `.yaml`/`.json` spec
file is hand-maintained anywhere in this repo; it's generated from the actual
controller code every time the service starts, so it can never drift out of
sync with reality the way a hand-written spec can. The `oauth`/`oauthflow`
block wires the Swagger UI itself to be able to obtain a real JWT from
Keycloak and use it to call the documented endpoints interactively, using the
same OAuth2 Authorization Code flow real clients use (Part VII §7.5 covers
that flow properly).

The bean that actually assembles the spec's metadata (title, version,
description, and the bearer-JWT security scheme every endpoint needs) is
shared, not duplicated per service:

```java
public final class OpenApiFactory {

    private static final String BEARER_AUTH = "bearerAuth";

    private OpenApiFactory() {
    }

    public static OpenAPI build(OpenApiProperties props) {
        return new OpenAPI()
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH))
                .components(new Components().addSecuritySchemes(BEARER_AUTH,
                        new SecurityScheme()
                                .name(BEARER_AUTH)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .info(new Info()
                        .title(props.title())
                        .version(props.version())
                        .description(props.description()));
    }
}
```

**Source:** `common-lib/common-spring/src/main/java/com/ecommerce/commonlib/openapi/OpenApiFactory.java`

Two small things worth naming: the class is `final` with a `private`
no-args constructor (`private OpenApiFactory() {}`) — a common Java idiom for
"this class exists purely to hold a `static` method, and should never be
instantiated," similar in spirit to `ProductMappingHelper`'s static-only
interface from Part I §6.2, just expressed as a class instead. And
`build(OpenApiProperties props)` reads `title`/`version`/`description` from a
properties object rather than hardcoding "Auth Service API" — that's how the
`ecommerce.openapi.*` block at the bottom of `application.yml` (§8.2) reaches
this shared factory: each service supplies its own title/description through
config, but every service gets the identical bearer-JWT security scheme
without redefining it.

### 9.4 Try It

`management.server.port` defaults to `9000`, and the main API listens on
`8088`. If a Kubernetes liveness probe were misconfigured to check `8088/actuator/health`
instead of `9000/actuator/health`, what would you expect to happen — and why
would splitting the ports in the first place have been meant to prevent
exactly this kind of exposure question?

---
