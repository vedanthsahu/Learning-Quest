## 27. Keycloak Integration

### 27.1 The Concept

Everything in Part VII so far has assumed a valid JWT with the right claims
just shows up. This chapter covers the two pieces that make that true:
translating what Keycloak puts *inside* a JWT into something Spring Security
understands, and the admin-level client that talks to Keycloak's own REST API
to actually create/manage users in the first place (as opposed to just
verifying tokens it already issued).

### 27.2 Translating Keycloak's Roles Into Spring Authorities

```java
package com.ecommerce.commonlib.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Maps Keycloak's {@code realm_access.roles} claim into Spring's {@link GrantedAuthority}s.
 *
 * <p>For each role we emit <strong>two</strong> authorities:</p>
 * <ul>
 *   <li>The raw role name (so {@code .hasAuthority("admin")} works for scope-style checks)</li>
 *   <li>The {@code ROLE_} prefixed form (so {@code .hasRole("admin")} works too)</li>
 * </ul>
 * Emitting both keeps the converter compatible with both styles services already use.
 */
public class KeycloakRealmRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private static final String REALM_ACCESS = "realm_access";
    private static final String ROLES = "roles";
    private static final String ROLE_PREFIX = "ROLE_";

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap(REALM_ACCESS);
        if (realmAccess == null) {
            return List.of();
        }
        Object rolesClaim = realmAccess.get(ROLES);
        if (!(rolesClaim instanceof List<?> rawRoles) || rawRoles.isEmpty()) {
            return List.of();
        }

        List<GrantedAuthority> authorities = new ArrayList<>(rawRoles.size() * 2);
        for (Object raw : rawRoles) {
            if (raw == null) {
                continue;
            }
            String role = Objects.toString(raw);
            authorities.add(new SimpleGrantedAuthority(role));
            authorities.add(new SimpleGrantedAuthority(role.startsWith(ROLE_PREFIX) ? role : ROLE_PREFIX + role));
        }
        return authorities;
    }
}
```

**Source:** `common-lib/common-security/src/main/java/com/ecommerce/commonlib/security/KeycloakRealmRoleConverter.java`

This is the class `BaseSecurityConfig.jwtAuthenticationConverter()` (§24.2)
installs, and it's the reason `@PreAuthorize("hasAuthority('ADMIN')")` (Part IV
§15) works at all — without this specific translation running, a JWT's roles
would just be inert claims data, never becoming the `GrantedAuthority` objects
Spring Security's `hasAuthority(...)`/`hasRole(...)` expressions actually
check against. `jwt.getClaimAsMap("realm_access")` reads directly into
Keycloak's own JWT structure — `{"realm_access": {"roles": ["USER", "ADMIN"]}}`
— which is Keycloak-specific, not a generic OAuth2/JWT standard; a different
identity provider would nest roles differently, and this class would need to
change with it. Emitting *both* the raw name and the `ROLE_`-prefixed form is
a small defensive choice: Spring Security's `hasAuthority("ADMIN")` and
`hasRole("ADMIN")` (which implicitly checks for `"ROLE_ADMIN"`) are two
different-looking checks for what's conceptually the same permission, and this
converter makes both work without every caller needing to remember which
form to use.

### 27.3 Talking to Keycloak's Admin API

`KeycloakAuthClient` is the largest single class in this book — worth reading
in full once, since it's a genuinely complete example of wrapping a
third-party HTTP API cleanly: one shared client, consistent error handling,
and no exposed internals.

```java
package com.ecommerce.commonlib.keycloak;

import com.ecommerce.commonlib.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;

import static org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames.*;

/**
 * Adapter over Keycloak's admin + token endpoints.
 *
 * <h3>Design notes</h3>
 * <ul>
 *   <li><strong>Reuses one {@link RestClient}</strong> built at construction time —
 *       the previous implementation rebuilt the client on every call.</li>
 *   <li>Bubbles up vendor errors as {@link BusinessException} with i18n keys so the
 *       global {@code ApiExceptionHandler} renders a consistent envelope.</li>
 *   <li>Pure adapter — keeps no in-memory state; if a service needs admin token caching
 *       it should wrap this with its own decorator.</li>
 * </ul>
 */
public class KeycloakAuthClient {

    private static final Logger log = LoggerFactory.getLogger(KeycloakAuthClient.class);

    private static final String BEARER_SCHEME = "Bearer ";
    private static final String GRANT_AUTHORIZATION_CODE = "authorization_code";
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestClient restClient;
    private final KeycloakClientProperties properties;

    public KeycloakAuthClient(RestClient.Builder restClientBuilder, KeycloakClientProperties properties) {
        this.restClient = restClientBuilder.build();
        this.properties = properties;
    }

    // ------------------------------------------------------------------
    // Token endpoints
    // ------------------------------------------------------------------

    public KeycloakTokenResponse login(String username, String password) {
        MultiValueMap<String, String> form = baseClientForm();
        form.add(GRANT_TYPE, PASSWORD);
        form.add(USERNAME, Objects.requireNonNull(username, "username"));
        form.add(PASSWORD, Objects.requireNonNull(password, "password"));
        return postToken(form);
    }

    /**
     * Exchanges an OIDC {@code authorization_code} for tokens. Used by the
     * backend-mediated SSO flow: the browser logs in at Keycloak, Keycloak
     * redirects back to our callback with a {@code code}, and we swap it here.
     */
    public KeycloakTokenResponse exchangeAuthorizationCode(String code, String redirectUri) {
        MultiValueMap<String, String> form = baseClientForm();
        form.add(GRANT_TYPE, GRANT_AUTHORIZATION_CODE);
        form.add(CODE, Objects.requireNonNull(code, "code"));
        form.add(REDIRECT_URI, Objects.requireNonNull(redirectUri, "redirectUri"));
        return postToken(form);
    }

    public KeycloakTokenResponse refreshToken(String refreshToken) {
        MultiValueMap<String, String> form = baseClientForm();
        form.add(GRANT_TYPE, REFRESH_TOKEN);
        form.add(REFRESH_TOKEN, Objects.requireNonNull(refreshToken, "refreshToken"));
        return postToken(form);
    }

    public void logout(String refreshToken) {
        MultiValueMap<String, String> form = baseClientForm();
        form.add(REFRESH_TOKEN, Objects.requireNonNull(refreshToken, "refreshToken"));
        execute(() -> restClient.post()
                .uri(properties.logoutEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .toBodilessEntity());
    }

    // ------------------------------------------------------------------
    // Admin operations
    // ------------------------------------------------------------------

    public String createUser(String username, String email, String fullName,
                             String password, List<String> realmRoles) {
        Objects.requireNonNull(username, "username");
        Objects.requireNonNull(email, "email");
        Objects.requireNonNull(password, "password");

        String adminToken = fetchAdminAccessToken();
        Map<String, Object> payload = buildUserPayload(username, email, fullName, password);

        URI location = execute(() -> restClient.post()
                .uri(properties.adminUsersEndpoint())
                .header(HttpHeaders.AUTHORIZATION, BEARER_SCHEME + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity())
                .getHeaders()
                .getLocation();

        if (location == null) {
            throw BusinessException.badRequest("keycloak.create.user.failed");
        }

        String keycloakUserId = extractUserIdFromLocation(location.toString());
        assignRealmRoles(adminToken, keycloakUserId, realmRoles);
        return keycloakUserId;
    }

    public void deleteUser(String keycloakUserId) {
        String adminToken = fetchAdminAccessToken();
        execute(() -> restClient.delete()
                .uri(properties.adminUserByIdEndpoint(keycloakUserId))
                .header(HttpHeaders.AUTHORIZATION, BEARER_SCHEME + adminToken)
                .retrieve()
                .toBodilessEntity());
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private KeycloakTokenResponse postToken(MultiValueMap<String, String> form) {
        return execute(() -> restClient.post()
                .uri(properties.tokenEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(KeycloakTokenResponse.class));
    }

    private MultiValueMap<String, String> baseClientForm() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add(CLIENT_ID, properties.getClientId());
        if (StringUtils.hasText(properties.getClientSecret())) {
            form.add(CLIENT_SECRET, properties.getClientSecret());
        }
        return form;
    }

    private String fetchAdminAccessToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add(CLIENT_ID, properties.getAdminClientId());
        form.add(USERNAME, properties.getAdminUsername());
        form.add(PASSWORD, properties.getAdminPassword());
        form.add(GRANT_TYPE, PASSWORD);

        KeycloakTokenResponse response = execute(() -> restClient.post()
                .uri(properties.adminTokenEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(KeycloakTokenResponse.class));

        if (response == null || !StringUtils.hasText(response.accessToken())) {
            throw BusinessException.unauthorized("keycloak.admin.token.failed");
        }
        return response.accessToken();
    }

    private void assignRealmRoles(String adminToken, String keycloakUserId, List<String> realmRoles) {
        if (realmRoles == null || realmRoles.isEmpty()) {
            return;
        }
        List<Map<String, Object>> reps = new ArrayList<>(realmRoles.size());
        for (String roleName : realmRoles) {
            Map<String, Object> rep = execute(() -> restClient.get()
                    .uri(properties.adminRoleByNameEndpoint(roleName))
                    .header(HttpHeaders.AUTHORIZATION, BEARER_SCHEME + adminToken)
                    .retrieve()
                    .body(MAP_TYPE));
            if (rep != null) {
                reps.add(rep);
            }
        }
        execute(() -> restClient.post()
                .uri(properties.adminUserRealmRoleMappingEndpoint(keycloakUserId))
                .header(HttpHeaders.AUTHORIZATION, BEARER_SCHEME + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(reps)
                .retrieve()
                .toBodilessEntity());
    }

    private static Map<String, Object> buildUserPayload(String username, String email,
                                                        String fullName, String password) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("enabled", true);
        payload.put("username", username);
        payload.put("email", email);
        payload.put("emailVerified", true);
        payload.put("credentials", List.of(Map.of(
                "type", "password", "value", password, "temporary", false
        )));
        if (StringUtils.hasText(fullName)) {
            String normalized = fullName.trim().replaceAll("\\s+", " ");
            int idx = normalized.lastIndexOf(' ');
            if (idx > 0) {
                payload.put("firstName", normalized.substring(0, idx));
                payload.put("lastName", normalized.substring(idx + 1));
            } else {
                payload.put("firstName", normalized);
                payload.put("lastName", normalized);
            }
        }
        return payload;
    }

    private static String extractUserIdFromLocation(String location) {
        int idx = location.lastIndexOf('/');
        if (idx < 0 || idx == location.length() - 1) {
            throw BusinessException.badRequest("keycloak.invalid.user.location");
        }
        return location.substring(idx + 1);
    }

    private static <T> T execute(Supplier<T> supplier) {
        try {
            return supplier.get();
        } catch (RestClientResponseException ex) {
            throw translate(ex);
        }
    }

    private static BusinessException translate(RestClientResponseException ex) {
        log.warn("Keycloak HTTP {} — body: {}", ex.getStatusCode().value(), ex.getResponseBodyAsString());
        return switch (ex.getStatusCode().value()) {
            case 400 -> BusinessException.badRequest("keycloak.bad.request", ex, ex.getResponseBodyAsString());
            case 401 -> BusinessException.unauthorized("keycloak.unauthorized", ex);
            case 403 -> BusinessException.forbidden("keycloak.forbidden", ex);
            case 404 -> BusinessException.notFound("keycloak.not.found", ex);
            case 409 -> BusinessException.conflict("keycloak.conflict", ex);
            default  -> BusinessException.badRequest("keycloak.request.failed", ex, ex.getMessage());
        };
    }
}
```

**Source:** `common-lib/common-keycloak/src/main/java/com/ecommerce/commonlib/keycloak/KeycloakAuthClient.java`

Three things worth calling out specifically:

- **`createUser`'s return value comes from a `Location` header, not a response body.** Keycloak's admin API responds to a successful user creation with `201 Created` and a `Location` header pointing at the new user's URL (`.../users/{id}`) rather than a JSON body containing the ID — `extractUserIdFromLocation` parses that URL to pull the ID back out. This is what `UserServiceImpl.register` (Part I §4.3) receives as `keycloakUserId`, and what it passes to `deleteUser` in its compensating-rollback `catch` block if the local database save fails afterward.
- **`execute(Supplier<T> supplier)`** is a small generic helper (`<T>`, Part I §2) that wraps *every* outbound call in this class with the same `try`/`catch` — write the HTTP call once as a lambda, get consistent error translation for free, rather than repeating a `try`/`catch` block around each of the eight or so calls this class makes.
- **`translate(...)` maps raw HTTP status codes to `BusinessException` factory methods** (Part I §5.2) using a `switch` expression — this is the boundary where a third-party system's own error vocabulary (plain HTTP status codes from Keycloak) gets translated into this platform's own (`BusinessException` + `ErrorCode`), so nothing downstream of this class ever has to know or care that Keycloak was involved at all.

### 27.4 Try It

`fetchAdminAccessToken()` is called from both `createUser` and `deleteUser`,
and fetches a fresh admin token from Keycloak on every single call — there's
no caching. Given the class's own Javadoc ("keeps no in-memory state; if a
service needs admin token caching it should wrap this with its own
decorator"), explain why the author might have deliberately chosen *not* to
cache the admin token inside this class itself, even though it would be an
easy, obvious performance win.

---
