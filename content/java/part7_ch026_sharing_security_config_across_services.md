## 26. Sharing Security Config Across Services

### 26.1 The Concept

Part II §10.2's `@ConditionalOnMissingBean` pattern was introduced abstractly
there. This chapter is the payoff: a real service that deliberately overrides
the shared default, and a real service that never adopted the shared default
at all — read together, they show both a healthy and an unhealthy version of
the same override mechanism.

### 26.2 A Deliberate Override: `auth-service`

`auth-service` needs public endpoints no other service has — the SSO login,
callback, and session endpoints from Part IV §17 can't require authentication
(a user isn't authenticated *yet* when hitting `/login`). So it defines its
own `SecurityFilterChain` bean instead of relying on `BaseSecurityConfig`'s:

```java
package com.ecommerce.authservice.config;

import com.ecommerce.commonlib.constants.ApiPaths;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
            "/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**",
            "/actuator/**",
            ApiPaths.AUTH + "/signup",
            ApiPaths.AUTH + "/login",
            ApiPaths.AUTH + "/callback",
            ApiPaths.AUTH + "/session",
            ApiPaths.AUTH + "/refresh",
            ApiPaths.AUTH + "/logout"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));
        return http.build();
    }
}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/config/SecurityConfig.java`

Compare this line by line against `BaseSecurityConfig` (§24.2) — CSRF
disabled, stateless sessions, `oauth2ResourceServer(...).jwt(...)` with the
same `JwtAuthenticationConverter` type — it's the *same shape*, just with a
hardcoded `PUBLIC_ENDPOINTS` array instead of reading `SecurityProperties.resolvedPublicPaths()`.
Because this class defines its own `SecurityFilterChain` `@Bean`,
`BaseSecurityConfig`'s own `@ConditionalOnMissingBean(SecurityFilterChain.class)`
(§24.2) sees a bean already exists and steps aside entirely — this is the
override mechanism actually firing, not a conflict or an error. Worth
noticing: `auth-service` still injects `JwtAuthenticationConverter` as a
parameter rather than redefining it, so it still gets `BaseSecurityConfig`'s
`KeycloakRealmRoleConverter`-backed one (§24.2's second `@Bean`) — the
override is deliberately partial, replacing only the piece that genuinely
needed to differ.

### 26.3 An Independent Legacy Config: `product-service`

`product-service`'s `SecurityConfig` doesn't override the shared default —
it never depends on `common-security` at all:

```java
package com.ecommerce.productservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                        .requestMatchers("/actuator/**", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));
        return http.build();
    }
}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/config/SecurityConfig.java`

The overall shape still rhymes — CSRF disabled, stateless, JWT resource
server — but look closely at the last line: `oauth2.jwt(jwt -> {})`, an
**empty** customizer. There's no `jwtAuthenticationConverter(...)` call at
all, which means this service never installs `KeycloakRealmRoleConverter`
(§27.2) — a valid JWT still authenticates here, but its Keycloak realm roles
are never translated into Spring `GrantedAuthority` objects the way §24.2's
converter does everywhere else. Concretely: if this controller ever grew a
`@PreAuthorize("hasAuthority('ADMIN')")` check (today it has none — every
non-`GET` endpoint just requires *any* authenticated caller), that check would
silently never pass for anyone, no matter their actual Keycloak role, because
the authorities it's checking were never populated in the first place. This
is exactly the kind of quiet drift centralizing security config in
`common-lib` (§24.3) is meant to prevent — and exactly why it's worth being
able to recognize when reading a service you haven't touched before.

### 26.4 Try It

If you were assigned to bring `product-service`'s `SecurityConfig` in line
with the rest of the platform, name the two concrete changes to make —
one to how public paths are declared, and one to the `oauth2ResourceServer(...)`
call — using `auth-service`'s `SecurityConfig` (§26.2) as your reference for
what "in line" looks like.

---
