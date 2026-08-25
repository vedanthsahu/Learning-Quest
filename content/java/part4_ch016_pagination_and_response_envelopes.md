## 16. Pagination, Sorting, and Response Envelopes

### 16.1 The Concept

Two ordinary REST API concerns, both already seen piecemeal earlier in this
book and worth pulling together explicitly here: **pagination** (returning a
page of results plus enough metadata to fetch the next one) and **how a
controller shapes what it returns** — a raw object, or something wrapped in a
consistent envelope. Neither is unique to Java, but this codebase happens to
contain two genuinely different, coexisting answers to the second question,
which makes it a good real-world case study in a design tradeoff rather than
a single "correct" pattern.

### 16.2 The Pagination Shape

`OrderController` (Part IV §15.2) takes pagination as four plain query
parameters, each with a sensible default:

```java
@GetMapping("/all")
@PreAuthorize("hasAuthority('ADMIN') or hasAuthority('USER')")
public ResponseEntity<Page<OrderDto>> findAll(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "10") int size,
                                               @RequestParam(defaultValue = "orderId") String sortBy,
                                               @RequestParam(defaultValue = "asc") String sortOrder) {
    return ResponseEntity.ok(orderService.findAll(page, size, sortBy, sortOrder));
}
```

**Source:** `order-service/src/main/java/com/ecommerce/orderservice/controller/OrderController.java`

`@RequestParam(defaultValue = "0")` reads a query string parameter (`?page=2&size=20`),
falling back to the given default if it's missing from the request entirely —
the query-string equivalent of the `${VAR:default}` pattern from Part II §8.2,
just for HTTP parameters instead of environment variables. This exact
four-parameter shape (`page`, `size`, `sortBy`, `sortOrder`) reappears on the
service side too — `UserServiceImpl.findAllUsers` (Part I §4.3) takes the
identical four arguments and turns them into a Spring Data `PageRequest`:

```java
public Page<UserResponse> findAllUsers(int page, int size, String sortBy, String sortOrder) {
    Sort sort = Sort.by(Sort.Direction.fromString(sortOrder), sortBy);
    PageRequest pageRequest = PageRequest.of(page, size, sort);
    Page<User> usersPage = userRepository.findAll(pageRequest);
    return usersPage.map(userMapper::toResponse);
}
```

`Page<T>` is Spring Data's own pagination container — it already carries
total element count, total pages, and current-page metadata, which is
precisely what Part I §2.3's `PageResponse<T>` record exists to translate
into a *stable*, hand-controlled JSON shape instead of serializing `Page<T>`
directly (recall that record's own Javadoc: "the `Page<T>` JSON shape changed
between Spring Boot 2 and 3... and is officially flagged as unstable").
`usersPage.map(userMapper::toResponse)` is `Page<T>`'s own version of the
`PageResponse.map` method from Part I §2.3 — same idea (remap the content,
keep the pagination metadata), different type.

### 16.3 Two Envelope Styles, Side by Side

`ProductController` and `OrderController` (Part IV §14, §15) both return
`ResponseEntity<T>` directly — the caller gets exactly the DTO, wrapped only
in HTTP status/headers. `AuthController` (§17 covers it fully) returns
`ApiResponse<T>` (Part I §1.2) from nearly every method instead:

```java
// product-service — raw ResponseEntity<T>
@GetMapping("/{productId}")
public ResponseEntity<ProductDto> findById(@PathVariable("productId") ... final String productId) {
    return ResponseEntity.ok(productService.findById(Integer.parseInt(productId)));
}

// auth-service — ApiResponse<T> envelope
@PostMapping("/signup")
public ApiResponse<Void> register(@Valid @RequestBody RegisterRequest request) {
    userService.register(request);
    return ApiResponse.message("User " + request.getUsername() + " registered successfully");
}
```

A client calling `product-service` gets the `ProductDto` JSON directly as the
response body. A client calling `auth-service` gets
`{"success": true, "code": "OK", "message": "...", "data": ..., "traceId": "...", "timestamp": "..."}`
— every response carries a uniform shape, a correlation ID for tracing
(Part X §10.5 covers where that ID actually comes from), and a human-readable
message, whether the call succeeded or failed.

Neither approach is objectively wrong. The envelope style costs a small
amount of response verbosity in exchange for uniformity a frontend can rely
on for *every* endpoint without special-casing; the raw style is leaner and
lets the HTTP status code alone carry the "did this work" signal, the more
traditional REST convention. What matters for reading this codebase is
recognizing which one you're looking at *before* you write a client against
it — this is the front matter's "modern vs legacy layer" distinction
(§0.2) showing up concretely in API design, not just in internals.

### 16.4 Try It

If `product-service`'s `findById` (§16.3) were migrated to return
`ApiResponse<ProductDto>` instead of `ResponseEntity<ProductDto>`, would a
frontend that currently reads the product directly off the response body
(`response.data.productTitle`, say) need to change? What would that frontend
need to change to, based on `ApiResponse<T>`'s field names from Part I §1.2?

---
