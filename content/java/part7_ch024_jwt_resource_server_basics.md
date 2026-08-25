## 24. JWT Resource Server Basics

### 24.1 The Concept

A **resource server**, in OAuth2 terms, is a service that accepts a bearer
token (a JWT, here) on incoming requests and trusts it without ever handling a
username/password itself — authentication happened elsewhere (Keycloak, in
this platform), and every service in this book is purely a *consumer* of the
resulting token. Spring Security's `oauth2ResourceServer(...)` configuration
is the piece that verifies a JWT's signature, checks it hasn't expired, and
makes its claims available to the rest of the request — all before your
controller code ever runs.

### 24.2 In This Codebase

`BaseSecurityConfig`, in `common-security`, is the default filter chain every
service gets automatically through `SecurityAutoConfiguration` (Part II
§10.2) — unless, as §26 shows next, a service defines its own:

```java
package com.ecommerce.commonlib.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

public class BaseSecurityConfig {

    private final SecurityProperties properties;

    public BaseSecurityConfig(SecurityProperties properties) {
        this.properties = properties;
    }

    @Bean
    @ConditionalOnMissingBean(SecurityFilterChain.class)
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthenticationConverter converter) throws Exception {
        if (properties.csrfDisabled()) {
            http.csrf(AbstractHttpConfigurer::disable);
        }
        if (properties.statelessSession()) {
            http.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        }
        http.authorizeHttpRequests(auth -> auth
                        .requestMatchers(properties.resolvedPublicPaths().toArray(new String[0])).permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(converter)));
        return http.build();
    }

    @Bean
    @ConditionalOnMissingBean(JwtAuthenticationConverter.class)
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRealmRoleConverter());
        return converter;
    }
}
```

**Source:** `common-lib/common-security/src/main/java/com/ecommerce/commonlib/security/BaseSecurityConfig.java`

Reading `securityFilterChain` as four decisions, in order:

1. **`csrf(...disable)`** — CSRF protection defends against a browser being tricked into submitting a cookie-authenticated form to your site from another page. It's irrelevant here because this platform authenticates with a bearer token in an `Authorization` header, not a cookie — there's no session for another site to ride along on.
2. **`sessionManagement(STATELESS)`** — tells Spring Security never to create or use an `HttpSession`. Every request carries its own complete proof of identity (the JWT), so there's nothing to remember between requests.
3. **`authorizeHttpRequests(...)`** — `properties.resolvedPublicPaths()` (Part I §1.2's `SecurityProperties` record) supplies the allow-list; everything not on it requires authentication.
4. **`oauth2ResourceServer(oauth2 -> oauth2.jwt(...))`** — this is the actual verification step: Spring Security fetches Keycloak's public keys (from the `issuer-uri` in `application.yml`, Part II §8.2), verifies the JWT's signature against them, checks its expiry, and — via the `jwtAuthenticationConverter` — turns its claims into a Spring `Authentication` object the rest of the request can read (§28 covers reading it back out).

`jwtAuthenticationConverter()` is the second bean this class defines, and it's
where `KeycloakRealmRoleConverter` (§27.2) actually gets wired in — without
this bean, a valid JWT would still authenticate successfully, but none of its
Keycloak roles would become Spring `GrantedAuthority` objects, and every
`@PreAuthorize("hasAuthority(...)")` check from Part IV §15 would fail for
everyone.

### 24.3 Why This Lives in `common-lib`

Every one of these four decisions is genuinely identical across a JWT-based
microservices platform — there's no reason `order-service` and
`payment-service` should each hand-write their own CSRF-disable,
stateless-session, JWT-verification boilerplate. Writing it once, here, and
letting `SecurityAutoConfiguration` (Part II §10.2) pull it in automatically
is what keeps eleven-plus services from silently drifting into eleven
slightly-different security configurations — a real risk borne out by §26,
which shows two services that *did* drift.

### 24.4 Try It

`securityFilterChain` reads `properties.csrfDisabled()` and
`properties.statelessSession()` as `if` conditions rather than always
disabling CSRF and always forcing stateless sessions unconditionally. Given
that `SecurityProperties` (Part I §1.2) is a `@ConfigurationProperties` record
bound from `ecommerce.security.*` YAML, what would a service need to put in
its own `application.yml` to keep CSRF protection turned **on** — something no
service in this codebase actually does, but the code visibly supports?

---
