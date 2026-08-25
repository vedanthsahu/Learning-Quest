## 34. When Calls Fail: Circuit Breakers

### 34.1 The Concept

`CallAPI` (§33) assumes the service it's calling is up. In a distributed
system, that assumption eventually breaks — a downstream service can be slow,
overloaded, or entirely down. A naive caller retries forever or blocks
indefinitely, which can cascade one struggling service's problems into every
service that calls it. A **circuit breaker** wraps a call with a fallback:
after enough recent failures, it "opens" and stops even attempting the real
call for a while, returning the fallback immediately instead — protecting
both the caller (fast failure instead of a long hang) and the struggling
downstream service (no pile of retries making things worse).

### 34.2 In This Codebase

`rating-service` guards its own outbound call to `order-service` with
Resilience4j's `@CircuitBreaker`:

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

**Source:** `rating-service/src/main/java/com/ecommerce/rating/service/OrderService.java` (Part VII §28.2)

`@CircuitBreaker()` works through the same AOP-proxy mechanism Part VII §25.2
already explained for `@PreAuthorize` — every call to
`checkOrderExistsByProductAndUserWithStatus` is intercepted by a generated
proxy, which tracks recent success/failure counts and either lets the call
through or short-circuits straight to the fallback. `handleFallback(Throwable t)`
is what runs when the circuit is open (or the call itself throws) — here,
returning a conservative default (`false` — "no completed order exists")
rather than propagating the failure up to *this* service's own caller.

### 34.3 The Shared Fallback Base Class

```java
package com.ecommerce.rating.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

abstract class AbstractCircuitBreakFallbackHandler {

    private static final Logger log = LoggerFactory.getLogger(AbstractCircuitBreakFallbackHandler.class);

    protected void handleBodilessFallback(Throwable throwable) throws Throwable {
        handleError(throwable);
    }

    protected Object handleFallback(Throwable throwable) throws Throwable {
        handleError(throwable);
        return null;
    }

    private void handleError(Throwable throwable) throws Throwable {
        log.error("Circuit breaker records an error. Detail {}", throwable.getMessage());
        throw throwable;
    }
}
```

**Source:** `rating-service/src/main/java/com/ecommerce/rating/service/AbstractCircuitBreakFallbackHandler.java`

This is a genuinely interesting design detail once you compare it against
`OrderService`'s actual `handleFallback` override (§34.2): the **base
class's** version of `handleFallback` logs the error and then *rethrows* it —
the opposite of a graceful fallback. `OrderService` `@Override`s it to do
something different: swallow the error and return a safe default instead.
This is the **template method** pattern (Part I §6.1's interface/implementation
separation, expressed through inheritance instead) — the abstract base
class defines a default *shape* (log, then decide what to do), and each
concrete subclass decides whether "what to do" means rethrowing (fail loudly)
or substituting a default (fail quietly, degrade gracefully). For this
specific call — "does a completed order exist," feeding into whether a user
is allowed to leave a rating — quietly defaulting to `false` is the safer
choice: worst case, a legitimate reviewer is momentarily blocked from rating,
rather than the entire rating flow breaking because an unrelated service had
a bad moment.

### 34.4 Try It

`AbstractCircuitBreakFallbackHandler` is package-private (no `public`
modifier on the class) and its methods are `protected`. Given that `OrderService`
(§34.2) is in the exact same package (`com.ecommerce.rating.service`), would
a class in a *different* package (say, `com.ecommerce.rating.controller`) be
able to extend `AbstractCircuitBreakFallbackHandler` directly? What does that
access-level choice suggest about how widely this base class is meant to be
reused within the service?

---
