## 17. A Non-CRUD Controller: OAuth2 Redirects

### 17.1 The Concept

Every controller so far has returned data — JSON, wrapped or not. Not every
endpoint's job is to return data at all: an HTTP redirect (status 302, with a
`Location` header telling the browser where to go next) is itself a valid,
common response shape, and it's exactly how a browser-based login flow works.
`AuthController`'s SSO endpoints are worth a full read as a real, working
three-step Authorization Code flow implementation — the kind of thing usually
only seen explained in the abstract.

### 17.2 In This Codebase

```java
package com.ecommerce.authservice.controller;

import com.ecommerce.authservice.config.SsoProperties;
import com.ecommerce.authservice.service.SsoSessionStore;
import com.ecommerce.commonlib.keycloak.KeycloakAuthClient;
import com.ecommerce.commonlib.keycloak.KeycloakClientProperties;
import com.ecommerce.commonlib.keycloak.KeycloakTokenResponse;
import com.ecommerce.commonlib.viewmodel.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final KeycloakAuthClient keycloakAuthClient;
    private final KeycloakClientProperties keycloakProperties;
    private final SsoProperties ssoProperties;
    private final SsoSessionStore ssoSessionStore;

    /**
     * Step 1. Browser hits this; we 302 to the Keycloak login page. The frontend
     * page to return to is remembered server-side against a random {@code state}.
     */
    @GetMapping("/login")
    public ResponseEntity<Void> ssoLogin(
            @RequestParam(value = "redirect_uri", required = false) String redirectUri) {
        String frontendRedirect = resolveFrontendRedirect(redirectUri);
        String state = ssoSessionStore.createLoginState(frontendRedirect);
        String authorizeUrl = UriComponentsBuilder.fromUriString(keycloakProperties.authorizationEndpoint())
                .queryParam("client_id", keycloakProperties.getClientId())
                .queryParam("response_type", "code")
                .queryParam("scope", ssoProperties.getScope())
                .queryParam("redirect_uri", ssoProperties.getBackendCallbackUrl())
                .queryParam("state", state)
                .build()
                .encode()
                .toUriString();
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(authorizeUrl)).build();
    }

    /**
     * Step 2. Keycloak redirects here with {@code code}. We swap it for tokens, stash
     * them behind a single-use ticket and bounce the browser back to the frontend.
     */
    @GetMapping("/callback")
    public ResponseEntity<Void> ssoCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error) {

        if (StringUtils.hasText(error)) {
            return redirectTo(appendQuery(ssoProperties.getDefaultFrontendRedirect(), "error", error));
        }

        String frontendRedirect = ssoSessionStore.consumeLoginState(state);
        KeycloakTokenResponse tokens = keycloakAuthClient.exchangeAuthorizationCode(code, ssoProperties.getBackendCallbackUrl());
        String ticket = ssoSessionStore.storeTokens(tokens);

        return redirectTo(appendQuery(frontendRedirect, "ticket", ticket));
    }

    /**
     * Step 3. Frontend swaps the single-use ticket for the actual tokens (JSON).
     */
    @GetMapping("/session")
    public ApiResponse<KeycloakTokenResponse> ssoSession(@RequestParam("ticket") String ticket) {
        return ApiResponse.ok(ssoSessionStore.consumeTokens(ticket));
    }

    /** Anti open-redirect: only bounce to a pre-registered frontend callback. */
    private String resolveFrontendRedirect(String requested) {
        if (StringUtils.hasText(requested) && ssoProperties.getAllowedRedirectUris().contains(requested)) {
            return requested;
        }
        return ssoProperties.getDefaultFrontendRedirect();
    }

    private static ResponseEntity<Void> redirectTo(String url) {
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(url)).build();
    }

    private static String appendQuery(String url, String key, String value) {
        return UriComponentsBuilder.fromUriString(url).queryParam(key, value).build().encode().toUriString();
    }
}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/controller/AuthController.java` (SSO section; `/signup`, `/refresh`, `/logout` follow the ordinary `ApiResponse<T>` pattern from §16.3 and aren't shown again here)

Walking the three steps as a single story, not three separate endpoints:

1. **`GET /login`** — the browser lands here first (usually via a frontend "Log in" button). The method builds Keycloak's own authorization URL by hand, using `UriComponentsBuilder` to safely assemble query parameters, and returns `ResponseEntity.status(FOUND).location(...)` — `FOUND` is HTTP 302, and `.location(...)` sets the `Location` header the browser follows automatically. `ssoSessionStore.createLoginState(...)` generates a random `state` value and remembers, server-side, which frontend URL to eventually return to — this is what lets step 2 know where "back" means, since the browser itself carries no memory of it beyond the `state` value.
2. **`GET /callback`** — Keycloak redirects the browser *here* after a successful login, carrying an authorization `code`. `keycloakAuthClient.exchangeAuthorizationCode(...)` swaps that code for real tokens server-to-server (never exposed to the browser directly at this point) — and `ssoSessionStore.storeTokens(tokens)` stashes them behind a fresh, single-use `ticket`, then 302s the browser back to the frontend with that ticket in the URL, not the tokens themselves.
3. **`GET /session`** — the frontend's own JavaScript calls this endpoint directly (not a redirect — it returns the ordinary `ApiResponse<KeycloakTokenResponse>` envelope from §16.3) to exchange the one-time ticket for the actual tokens, which it can then store for making authenticated API calls.

The reason tokens never appear directly in a redirect URL is exactly what
`ssoSessionStore`'s ticket indirection avoids: a URL can end up in browser
history, server access logs, or a Referer header — putting a real, reusable
access token there would leak it into all of those places. A single-use
ticket, consumed exactly once by `/session`, is safe to put in a URL because
even if it leaked, it would already be spent.

### 17.3 Worth Noticing: A Real Security Check

`resolveFrontendRedirect` is a small method carrying real weight — its
Javadoc-equivalent inline comment says it plainly: **"Anti open-redirect: only
bounce to a pre-registered frontend callback."** Without it, `ssoLogin` would
accept an arbitrary `redirect_uri` query parameter from *any* caller and
faithfully redirect a real, successful Keycloak login back to it — an
open-redirect vulnerability, where an attacker crafts a link that starts a
real login flow on your legitimate domain but ends by handing the resulting
ticket to an attacker-controlled site. Checking the requested URI against
`ssoProperties.getAllowedRedirectUris()` (an explicit allow-list, sourced from
the `SSO_ALLOWED_REDIRECT_URIS` config seen in Part II §8.2's `application.yml`)
closes that off — an unrecognized `redirect_uri` silently falls back to the
platform's own default rather than being honored.

### 17.4 Try It

`ssoCallback` (step 2) checks for an `error` query parameter and bounces back
to the frontend with it *before* ever touching `code` or `state`. Based on
what an OAuth2 provider is doing when it redirects back with `error` set
instead of `code`, explain in your own words what real-world user action
would cause Keycloak to take that branch instead of the success path.

---
