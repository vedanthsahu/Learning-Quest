## 14. Building a Controller

### 14.1 The Concept

A Spring `@RestController` is roughly the equivalent of a FastAPI `APIRouter`
or a Flask `Blueprint` — a class whose methods map to HTTP endpoints, each
annotated with the verb and path it handles. Where FastAPI infers most of its
behavior from Python type hints and decorators, Spring MVC uses explicit
annotations for everything: which HTTP method, which path, where each piece
of data comes from (URL path, query string, request body).

### 14.2 In This Codebase

`ProductController` is the cleanest full CRUD example in the codebase — every
HTTP verb, one method each:

```java
package com.ecommerce.productservice.controller;

import com.ecommerce.productservice.dto.ProductDto;
import com.ecommerce.productservice.service.ProductService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<ProductDto>> findAll() {
        log.info("ProductDto List, controller; fetch all products");
        return ResponseEntity.ok(productService.findAll());
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ProductDto> findById(@PathVariable("productId")
                                               @NotBlank(message = "Input must not be blank!")
                                               @Valid final String productId) {
        log.info("ProductDto, resource; fetch product by id");
        return ResponseEntity.ok(productService.findById(Integer.parseInt(productId)));
    }

    @PostMapping
    public ResponseEntity<ProductDto> save(@RequestBody
                                           @NotNull(message = "Input must not be NULL!")
                                           @Valid final ProductDto productDto) {
        log.info("ProductDto, resource; save product");
        return ResponseEntity.ok(productService.save(productDto));
    }

    @PutMapping
    public ResponseEntity<ProductDto> update(@RequestBody
                                             @NotNull(message = "Input must not be NULL!")
                                             @Valid final ProductDto productDto) {
        log.info("ProductDto, resource; update product");
        return ResponseEntity.ok(productService.update(productDto));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<ProductDto> update(@PathVariable("productId")
                                             @NotBlank(message = "Input must not be blank!")
                                             @Valid final String productId,
                                             @RequestBody
                                             @NotNull(message = "Input must not be NULL!")
                                             @Valid final ProductDto productDto) {
        log.info("ProductDto, resource; update product with productId");
        return ResponseEntity.ok(productService.update(Integer.parseInt(productId), productDto));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Boolean> deleteById(@PathVariable("productId") final String productId) {
        log.info("Boolean, resource; delete product by id");
        productService.deleteById(Integer.parseInt(productId));
        return ResponseEntity.ok(true);
    }
}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/controller/ProductController.java`

Reading the annotations in order:

- **`@RequestMapping("/api/products")`** on the class sets a shared path prefix — every method's own mapping is relative to it, so `@GetMapping("/{productId}")` actually handles `GET /api/products/{productId}`.
- **`@GetMapping`/`@PostMapping`/`@PutMapping`/`@DeleteMapping`** are each shorthand for `@RequestMapping(method = ...)` — the HTTP verb is baked into the annotation name instead of being a separate argument.
- **`@PathVariable("productId")`** pulls a value out of the URL path itself (the `{productId}` placeholder). **`@RequestBody`** deserializes the entire JSON request body into a `ProductDto`.
- **`@Valid`** triggers Bean Validation (the `@NotBlank`/`@NotNull` constraints right next to it) — Part VIII §21 covers what happens when validation actually fails.
- The class itself uses constructor injection (`@RequiredArgsConstructor`, Part III §12.2) to receive `ProductService` — the same interface/implementation pair from Part I §6.1.

Notice `productId` arrives as a `String` and is parsed to `Integer` by hand
inside each method (`Integer.parseInt(productId)`) rather than being declared
as `@PathVariable Integer productId` and letting Spring convert it
automatically — both work, but this file consistently chooses the manual
route, likely so the `@NotBlank` validation can run on the raw string first.

### 14.3 The Return Type Choice

Every method here returns `ResponseEntity<T>` — a generic wrapper that lets a
controller method control the HTTP status code, headers, and body all
together (`ResponseEntity.ok(body)` is shorthand for status 200 plus that
body). This is `product-service`'s "legacy layer" convention (front matter
§0.2); Part IV §16 contrasts it directly against `auth-service`'s
`ApiResponse<T>` envelope (Part I §1.2) — the same underlying idea, styled
two different ways in the same codebase.

### 14.4 Try It

Two `update` methods exist on this controller — `update(ProductDto)` and
`update(String productId, ProductDto)` — both mapped to `PUT`, but at
different paths (`/api/products` vs `/api/products/{productId}`). This is the
same **method overloading** concept from Part I §6.2, just resolved by URL
path instead of by parameter type at compile time. Write out, for each of the
two `PUT` routes, which one you'd call to update a product when you already
know its ID versus when the ID is embedded in the request body itself.

---
