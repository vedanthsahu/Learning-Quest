## 35. Events Instead of Calls: Kafka

### 35.1 The Concept

Every inter-service call so far (§33, §34) has been **synchronous**: the
caller waits for a response, and the two services are directly coupled at
that moment — if the callee is down, the caller's request fails right there.
A **message broker** like Kafka offers a different shape entirely: a service
publishes an event ("this happened") to a topic and moves on immediately,
without knowing or caring who, if anyone, is listening; other services
subscribe to that topic and react whenever they're ready. Part III §13.3
already introduced the `ProducerFactory`/`KafkaTemplate` beans this all runs
on top of — this chapter is about using them.

### 35.2 Publishing an Event

```java
package com.ecommerce.paymentservice.event;

import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class EventProducer {

    private static final Logger log = LoggerFactory.getLogger(EventProducer.class);

    private final KafkaTemplate<String, String> kafkaTemplate;

    public void send(String topic, String message) {
        kafkaTemplate.send(topic, message)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to send Kafka message to topic {}: {}", topic, ex.getMessage());
                    } else {
                        log.debug("Sent message to topic {} offset {}", topic, result.getRecordMetadata().offset());
                    }
                });
    }
}
```

**Source:** `payment-service/src/main/java/com/ecommerce/paymentservice/event/EventProducer.java`

`kafkaTemplate.send(topic, message)` returns immediately with a
`CompletableFuture` — it does **not** block waiting for Kafka to confirm the
message was written. `.whenComplete((result, ex) -> {...})` registers a
callback that runs later, on a different thread, once the send actually
finishes one way or the other — this is asynchronous by construction, a
different concurrency shape from every `RestClient` call in §33/§34, which
block the calling thread until a response (or timeout) arrives. If the send
fails, this code only logs it — there's no retry, no dead-letter queue, no
exception propagated back to whatever called `send(...)` — worth noting as a
real, current limitation rather than assuming a production system always
handles this more robustly.

`KafkaTemplate<String, String>` — the exact bean Part III §13.3's
`CommonConfiguration` builds — is what makes this one-line publish possible;
`EventProducer` itself carries no Kafka connection details, retry policy, or
serialization logic of its own.

### 35.3 A Different Kind of Consumer: CDC

`search-service` doesn't consume events published by application code like
`EventProducer` at all — it listens to a **Change Data Capture (CDC)** stream,
which Debezium (a CDC tool, not shown in this book but implied by the message
shape) publishes automatically whenever a row changes in a database table,
without the application needing to explicitly call `send(...)` anywhere:

```java
package com.ecommerce.search.consumer;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.ecommerce.search.constants.Action;
import com.ecommerce.search.service.ProductSyncDataService;
import lombok.RequiredArgsConstructor;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProductSyncDataConsumer {

    private final ProductSyncDataService productSyncDataService;

    @KafkaListener(topics = "${product.topic.name}")
    public void listen(ConsumerRecord<?, ?> consumerRecord) {
        if (consumerRecord != null) {
            JsonObject keyObject = new Gson().fromJson((String) consumerRecord.key(), JsonObject.class);
            if (keyObject != null) {
                JsonObject valueObject = new Gson().fromJson((String) consumerRecord.value(), JsonObject.class);
                if (valueObject != null) {
                    String action = String.valueOf(valueObject.get("op")).replaceAll("\"", "");
                    Long id = keyObject.get("id").getAsLong();

                    switch (action) {
                        case Action.CREATE, Action.READ:
                            productSyncDataService.createProduct(id);
                            break;
                        case Action.UPDATE:
                            productSyncDataService.updateProduct(id);
                            break;
                        case Action.DELETE:
                            productSyncDataService.deleteProduct(id);
                            break;
                        default:
                            break;
                    }
                }
            }
        }
    }
}
```

**Source:** `search-service/src/main/java/com/ecommerce/search/consumer/ProductSyncDataConsumer.java`

`@KafkaListener(topics = "${product.topic.name}")` is the declarative
counterpart to `@KafkaListener` — a method annotated this way is
automatically invoked by Spring Kafka every time a new message arrives on the
configured topic, with no polling loop written by hand. The `op` field this
code reads (`"c"`/`"r"`/`"u"`/`"d"`-style operation codes, matched against
`Action.CREATE`/`Action.UPDATE`/`Action.DELETE` constants in a `switch`
statement, Part I §1's pattern-based control flow) is Debezium's own CDC
message convention — this consumer exists specifically to keep
`search-service`'s Elasticsearch index (§36) in sync with `product-service`'s
Postgres table, reacting to raw database changes rather than to an explicit
"product changed" event any application code chose to publish.

### 35.4 Try It

`EventProducer.send` and `ProductSyncDataConsumer.listen` are structurally
opposite halves of the same idea — one publishes, one subscribes — but
they're not actually wired to each other in this codebase (different
services, different topics, different message shapes). If you needed to trace
which service's database changes actually trigger `ProductSyncDataConsumer.listen`,
what single piece of configuration (visible in the code shown in §35.3) would
you need to go find the real value of first?

---
