## 28. Reading the Current User

### 28.1 The Concept

Once a request has passed authentication (Part VII §24), every layer inside
that request — a controller, a service, anything running on the same
thread — can ask "who is making this call?" without the caller having to pass
identity around as an explicit parameter. Spring Security stores the current
request's `Authentication` in a thread-bound holder,
`SecurityContextHolder`, and anything can read it back at any point during
that request's processing.

### 28.2 In This Codebase

`order-service`'s `JwtTokenFilter` is a small, static-only utility (the same
private-constructor idiom from Part II §9.3's `OpenApiFactory`) that reads the
raw token back out, for re-forwarding to another service:

```java
package com.ecommerce.orderservice.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public final class JwtTokenFilter {

    private JwtTokenFilter() {
    }

    public static String getTokenFromRequest() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthenticationToken)) {
            return "";
        }
        return "Bearer " + jwtAuthenticationToken.getToken().getTokenValue();
    }
}
```

**Source:** `order-service/src/main/java/com/ecommerce/orderservice/security/JwtTokenFilter.java`

`SecurityContextHolder.getContext().getAuthentication()` returns whatever the
JWT resource server filter (Part VII §24.2) placed there after successfully
verifying the incoming token — a `JwtAuthenticationToken` specifically, one of
several `Authentication` subtypes Spring Security can produce depending on how
authentication happened. The `instanceof ... jwtAuthenticationToken` pattern
match (Java 16+ syntax — no separate cast needed once the check passes) guards
against the type being something else entirely; returning `""` rather than
throwing keeps this safe to call even somewhere that, for whatever reason,
has no authenticated context at all.

`rating-service`'s `OrderService` reads the same context differently — going
straight for the `Jwt` object itself rather than the token string:

```java
@Service
@RequiredArgsConstructor
public class OrderService extends AbstractCircuitBreakFallbackHandler {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @CircuitBreaker()
    public OrderExistsByProductAndUserGetVm checkOrderExistsByProductAndUserWithStatus(final Long productId) {
        final String jwt = ((Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                .getTokenValue();
        final URI url = UriComponentsBuilder
                .fromHttpUrl(serviceUrlConfig.order())
                .path("/storefront/orders/completed")
                .queryParam("productId", productId.toString())
                .buildAndExpand()
                .toUri();
        return restClient.get()
                .uri(url)
                .headers(h -> h.setBearerAuth(jwt))
                .retrieve()
                .body(OrderExistsByProductAndUserGetVm.class);
    }

    @Override
    public OrderExistsByProductAndUserGetVm handleFallback(Throwable t) throws Throwable {
        return new OrderExistsByProductAndUserGetVm(false);
    }
}
```

**Source:** `rating-service/src/main/java/com/ecommerce/rating/service/OrderService.java`

`.getAuthentication().getPrincipal()` returns `Object` generically (an
`Authentication`'s principal can be many different types depending on the auth
mechanism), so this code casts it directly to `Jwt` — a blunter approach than
`JwtTokenFilter`'s safe `instanceof` check, one that would throw a
`ClassCastException` if this method were ever called from a context where the
principal wasn't a `Jwt` at all. Both approaches read from the exact same
`SecurityContextHolder`; the difference is entirely in how carefully each one
handles the type at the boundary. This method's real job — forwarding the
current user's own JWT onward to `order-service` to check something on their
behalf, with a `@CircuitBreaker()` guarding the call — is Part X §32's proper
subject; this chapter only cares about where `jwt` on the first line of the
method body actually comes from.

### 28.3 Try It

Both `JwtTokenFilter.getTokenFromRequest()` and `OrderService`'s inline cast
read from `SecurityContextHolder.getContext().getAuthentication()` — neither
one is passed the current user's identity as a method parameter from the
controller down. Explain, using what Part VII §24.2 established about
`SessionCreationPolicy.STATELESS`, why this pattern (reading from a
thread-bound holder rather than threading identity through every method
signature) is safe here specifically, in a way it might not be in a
different concurrency model.

---
