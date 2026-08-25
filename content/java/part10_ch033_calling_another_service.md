## 33. Calling Another Service Over HTTP

### 33.1 The Concept

The simplest way one microservice reaches another: a plain outbound HTTP
call, exactly like calling any third-party API. No service mesh, no service
discovery, no message broker — `order-service` just knows `auth-service`
lives at a specific host and port and asks it directly. This chapter connects
three pieces you've already seen individually — `CallAPI` (Part III §13.2),
`RestClientAutoConfiguration`'s pooled client (Part II §10.3), and the
correlation ID header (§37 finishes that story) — into the single real
request path they form together.

### 33.2 Revisiting the Call Site

```java
@Component
@RequiredArgsConstructor
public class CallAPI {

    private final RestClient.Builder restClientBuilder;

    public UserDto receiverUserDto(Long userId, String token) {
        return restClientBuilder.baseUrl("http://auth-service:8088").build()
                .get()
                .uri("/api/manager/user/{id}", userId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .body(UserDto.class);
    }
}
```

**Source:** `order-service/src/main/java/com/ecommerce/orderservice/service/CallAPI.java` (Part III §13.2)

`http://auth-service:8088` is a **Docker/Kubernetes service name**, not a
literal machine hostname — inside the platform's own Docker Compose or
Kubernetes network, `auth-service` resolves via DNS to whichever container or
pod is currently running it, load-balanced automatically if there's more than
one replica. This is the deliberately simple end of service-to-service
communication: no client-side load-balancer library, no service registry to
query — the container orchestration layer's own networking does that job
instead, transparently, one level below any Java code.

### 33.3 What the Injected `RestClient.Builder` Actually Gives You

`restClientBuilder` isn't a bare `RestClient.builder()` call — it's the exact
bean `RestClientAutoConfiguration` constructed in Part II §10.3, injected in
by constructor injection (Part III §12). Every call made through it
automatically gets:

- **Connection pooling** — `PoolingHttpClientConnectionManager`, sized from `ecommerce.rest-client.pool.*` (`application.yml`, Part II §8.2), so a burst of outbound calls reuses TCP connections instead of establishing a new one per request.
- **Configured timeouts** — `connect-timeout`/`read-timeout`, also from that same config block, rather than Java's infinite-by-default socket timeouts.
- **Automatic correlation-ID propagation** — `CorrelationIdPropagationInterceptor` (Part II §10.3), which forwards `X-Correlation-Id`/`X-Request-Id` from the current request's MDC onto every outbound call, with zero code in `CallAPI` itself asking for it.

None of that is visible at the `CallAPI` call site — which is exactly the
point of building it as autoconfiguration rather than repeating pool/timeout/
header logic in every service that needs to call another one.

### 33.4 What's Deliberately Absent

Part III §13.2 already flagged the hardcoded hostname/port; worth restating
here as this chapter's honest finding, listed alongside the concept
inventory's own note (front matter §0.1): **there is no `@FeignClient`
anywhere in this codebase.** Feign (a declarative HTTP client — define an
interface, annotate it, and a proxy implementation is generated, similar in
spirit to the MapStruct pattern from Part I §2.2) is common enough in Spring
microservices tutorials that its complete absence here is worth noting rather
than assuming it's just not shown. Every inter-service call in this platform
is written the way `CallAPI` writes it — imperative, explicit `RestClient`
calls — which is a real, consistent architectural choice, not an oversight.

### 33.5 Try It

If `auth-service` were scaled to three replicas behind the same Kubernetes
service name, would `CallAPI.receiverUserDto` need to change at all to keep
working correctly? Reason from §33.2's explanation of what
`http://auth-service:8088` actually resolves to, and where load-balancing
responsibility sits in this architecture.

---
