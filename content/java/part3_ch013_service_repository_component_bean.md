## 13. The @Service/@Repository/@Component Triad, and Where @Bean Fits

### 13.1 The Concept

Spring's component-scanning stereotype annotations — `@Component`, `@Service`,
`@Repository`, `@Controller`/`@RestController` — all do the *exact same
mechanical thing*: mark a class to be picked up by component scanning
(Part II §7.2) and registered as a bean. The different names exist purely for
**readability and, in `@Repository`'s case, one small technical bonus** — not
because Spring treats them as fundamentally different registration
mechanisms.

- `@Component` — the generic form; "this is a Spring-managed object."
- `@Service` — semantically, business/application logic. Functionally identical to `@Component`.
- `@Repository` — semantically, data-access logic. Spring additionally translates database-specific exceptions thrown from a `@Repository` bean into a common `DataAccessException` hierarchy — a real behavioral difference, not just a label.
- `@Controller`/`@RestController` — web-layer entry points (Part IV covers these properly).

Every class annotated with any of these is found by the same
`@ComponentScan` mentioned in Part II §7.2.

### 13.2 In This Codebase: A Plain @Component

Not every `@Component` is a service or a repository — `CallAPI`, in
`order-service`, is a small, stateless collaborator whose only job is making
outbound HTTP calls to other services, and `@Component` (the generic
stereotype) is the honest label for that:

```java
package com.ecommerce.orderservice.service;

import com.ecommerce.orderservice.dto.product.ProductDto;
import com.ecommerce.orderservice.dto.user.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

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

    public ProductDto receiverProductDto(Integer productId) {
        return restClientBuilder.baseUrl("http://product-service:8086").build()
                .get()
                .uri("/api/products/{id}", productId)
                .retrieve()
                .body(ProductDto.class);
    }
}
```

**Source:** `order-service/src/main/java/com/ecommerce/orderservice/service/CallAPI.java`

`restClientBuilder` here is injected via constructor injection (§12.2) —
and it's the *exact same* `RestClient.Builder` bean built by
`RestClientAutoConfiguration` back in Part II §10.3, complete with its
connection pool and automatic correlation-ID header propagation, with zero
extra code in this class to get any of that. This is a real, if fairly blunt,
example of inter-service communication (Part X §10.1 goes further with it) —
`order-service` reaching out to `auth-service` and `product-service` over
plain HTTP, with the target hostnames hardcoded as Docker Compose / Kubernetes
service names (`http://auth-service:8088`) rather than any kind of service
discovery.

### 13.3 In This Codebase: @Bean Inside @Configuration

Where `@Component` (and its specializations) mark a class Spring should
*find and construct itself*, `@Bean` is the opposite direction: a method,
inside a `@Configuration`-annotated class, that constructs and returns an
object *you* build by hand, which Spring then manages exactly like any other
bean. This is the mechanism you already saw generically in Part II §10.3's
`RestClientAutoConfiguration` — here's a plainer, service-local example from
`payment-service`:

```java
package com.ecommerce.paymentservice.config.kafka;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

import java.util.Map;

@Configuration
public class CommonConfiguration {

    private final ReactiveKafkaAppProperties props;

    public CommonConfiguration(ReactiveKafkaAppProperties props) {
        this.props = props;
    }

    @Bean
    public ProducerFactory<String, String> producerFactory() {
        return new DefaultKafkaProducerFactory<>(Map.of(
                ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, props.bootstrapServers,
                ProducerConfig.ACKS_CONFIG, "all",
                ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,
                ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class
        ));
    }

    @Bean
    public KafkaTemplate<String, String> kafkaTemplate(ProducerFactory<String, String> pf) {
        return new KafkaTemplate<>(pf);
    }
}
```

**Source:** `payment-service/src/main/java/com/ecommerce/paymentservice/config/kafka/CommonConfiguration.java`

Two `@Bean` methods, and the second one *depends on the first*: `kafkaTemplate`
takes a `ProducerFactory<String, String>` as a parameter, and Spring resolves
that by calling `producerFactory()` first (or reusing its already-constructed
result) and passing it in — the same constructor-injection idea from §12,
just at the method-parameter level instead of a class constructor. Neither
`ProducerFactory` nor `KafkaTemplate` is a class this codebase owns — they're
library types from `spring-kafka` — which is precisely the situation `@Bean`
exists for: you cannot put `@Component` on a class you don't own and didn't
write, but you can always write a `@Bean` method that constructs one and hands
it to Spring. (Kafka itself, and what these beans are actually used to build,
is Part X §10.3's subject.)

### 13.4 Try It

`CallAPI` (§13.2) is annotated `@Component`, not `@Service`. Nothing would
break if it were changed to `@Service` instead — both are found by the same
component scan. Given §13.1's description of what actually differs between
the stereotypes, is that renaming purely cosmetic here, or would `@Repository`
specifically have been a *wrong* choice for this class? Justify your answer
using the one real behavioral difference `@Repository` has.

---
