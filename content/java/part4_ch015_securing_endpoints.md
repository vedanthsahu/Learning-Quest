## 15. Securing Endpoints

### 15.1 The Concept

Beyond the platform-wide "must be authenticated at all" rule every request
already goes through (Part VII covers that filter chain), individual
endpoints often need finer-grained rules: only an admin can delete something,
only the resource's owner can update it. Spring Security's `@PreAuthorize`
annotation lets you express that rule directly on the controller method, as a
small expression language, evaluated *before* the method body runs at all.

### 15.2 In This Codebase

`OrderController` puts `@PreAuthorize` on every single endpoint, and the
rules aren't uniform — reading them side by side is the fastest way to see
what the expression language can do:

```java
package com.ecommerce.orderservice.controller;

import com.ecommerce.orderservice.dto.order.OrderDto;
import com.ecommerce.orderservice.service.OrderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/orders")
@Tag(name = "OrderController", description = "Operations related to orders")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('USER')")
    public ResponseEntity<List<OrderDto>> findAll() {
        log.info("*** OrderDto List, controller; fetch all orders *");
        return ResponseEntity.ok(orderService.findAll());
    }

    @GetMapping("/all")
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('USER')")
    public ResponseEntity<Page<OrderDto>> findAll(@RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "10") int size,
                                                   @RequestParam(defaultValue = "orderId") String sortBy,
                                                   @RequestParam(defaultValue = "asc") String sortOrder) {
        return ResponseEntity.ok(orderService.findAll(page, size, sortBy, sortOrder));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USER')")
    public ResponseEntity<OrderDto> save(@RequestBody
                                          @NotNull(message = "Input must not be NULL")
                                          @Valid final OrderDto orderDto) {
        log.info("*** OrderDto, resource; save order *");
        return ResponseEntity.ok(orderService.save(orderDto));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<OrderDto> update(@RequestBody
                                            @NotNull(message = "Input must not be NULL")
                                            @Valid final OrderDto orderDto) {
        log.info("*** OrderDto, resource; update order *");
        return ResponseEntity.ok(orderService.update(orderDto));
    }

    @DeleteMapping("/{orderId}")
    @PreAuthorize("hasAuthority('USER') or hasAuthority('ADMIN')")
    public ResponseEntity<Boolean> deleteById(@PathVariable("orderId") final String orderId) {
        log.info("*** Boolean, resource; delete order by id *");
        orderService.deleteById(Integer.parseInt(orderId));
        return ResponseEntity.ok(true);
    }
}
```

**Source:** `order-service/src/main/java/com/ecommerce/orderservice/controller/OrderController.java` (trimmed to the endpoints with distinct rules — two more `PUT`/`GET` variants follow the same patterns as the ones shown)

`hasAuthority('ADMIN')` checks whether the currently authenticated user's JWT
carries that specific authority string — the exact same three role names from
`RoleName` (Part I §3.2), arriving here as Spring Security "authorities"
rather than the Java enum itself (Part VII §26 covers how a Keycloak JWT's
roles get converted into these authority strings in the first place). Reading
the rules as a table makes the intent obvious:

| Endpoint | Rule | Who |
|---|---|---|
| `GET` (list, both variants) | `hasAuthority('ADMIN') or hasAuthority('USER')` | any authenticated user |
| `POST` (create an order) | `hasAuthority('USER')` | regular users only |
| `PUT` (update an order) | `hasAuthority('ADMIN')` | admins only |
| `DELETE` | `hasAuthority('USER') or hasAuthority('ADMIN')` | any authenticated user |

That's a real, deliberate authorization policy: any authenticated user can
place an order or view orders, but only an admin can arbitrarily edit one —
encoded directly on the endpoints that enforce it, readable without chasing
through a separate policy file.

For this to work at all, method security has to be turned on somewhere — it
isn't automatic. That's `@EnableMethodSecurity`, seen already (without
explanation) on `SecurityAutoConfiguration` in Part II §10.2. Without that one
annotation present somewhere in the application, every `@PreAuthorize` in this
file would be silently ignored — worth remembering as the single most common
reason `@PreAuthorize` "doesn't work" in a Spring app that has it copy-pasted
in without the corresponding enable-annotation.

### 15.3 Try It

If `@PreAuthorize("hasAuthority('ADMIN')")` on the `PUT` (update) endpoint
were accidentally deleted, would existing callers who aren't admins be
blocked, allowed, or would the answer depend on what the platform-wide
security filter chain (Part VII) already requires by default? Reason about
what "no method-level rule at all" actually falls back to.

---
