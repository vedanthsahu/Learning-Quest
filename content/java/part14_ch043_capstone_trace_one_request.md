## 43. Capstone — Trace One Real Request, End to End

### 43.1 What This Chapter Is

No new files. No new concepts. Every piece of code in this chapter has
already been read, in full, somewhere earlier in this book — what's new is
walking all of it as **one continuous path**, in the order it actually
executes for a single real HTTP request: a new user signing up. If Part I
through Part XIII taught you the pieces, this is the chapter that proves
they're actually one machine.

The request: `POST /api/v1/auth/signup` with a username, email, phone, and
password.

### 43.2 Step 1 — The Request Arrives

Before any application code runs at all, `CorrelationIdFilter` (Part X §37.2)
— ordered `HIGHEST_PRECEDENCE` — assigns this request a correlation ID and
stores it in `MDC`, so every log line from this point forward, in this
service and any it calls, can be traced back to this one request.

The request then passes through `auth-service`'s own `SecurityConfig` (Part
VII §26.2) — `/api/v1/auth/signup` is on its `PUBLIC_ENDPOINTS` allow-list, so
`.permitAll()` lets it through without requiring a JWT. (Contrast this with
almost every other endpoint in this book, which would be rejected right here
by the same filter chain if unauthenticated — Part VII §24.)

### 43.3 Step 2 — The Controller

```java
@PostMapping("/signup")
public ApiResponse<Void> register(@Valid @RequestBody RegisterRequest request) {
    userService.register(request);
    return ApiResponse.message("User " + request.getUsername() + " registered successfully");
}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/controller/AuthController.java` (Part IV §17.2)

`@Valid` (Part IV §14.2) triggers Bean Validation on `RegisterRequest`'s own
constraints before this method body ever runs — a blank username or malformed
email never reaches `userService.register(...)` at all; it's rejected earlier
in the framework and turned into a response by `ApiExceptionHandler.handleMethodArgumentNotValid`
(Part VIII §29.2) instead. Assuming validation passes, `userService` was
constructor-injected (Part III §12) when Spring built this controller bean at
startup (Part II §7.2's component scan finding `@RestController`).

### 43.4 Step 3 — The Service Layer

```java
@Transactional
@LogPerformance(title = "register user", logInput = true)
public User register(RegisterRequest request) {
    if (existsByUsername(request.getUsername())) {
        throw BusinessException.conflict("auth.username.exists", request.getUsername());
    }
    if (existsByEmail(request.getEmail())) {
        throw BusinessException.conflict("auth.email.exists", request.getEmail());
    }
    if (existsByPhoneNumber(request.getPhone())) {
        throw BusinessException.conflict("auth.phone.exists", request.getPhone());
    }

    List<String> requestedRoles = normalizeRequestedRoles(request.getRoles());
    String keycloakUserId = keycloakAuthClient.createUser(
            request.getUsername(), request.getEmail(), request.getFullName(),
            request.getPassword(), requestedRoles);

    try {
        User user = userMapper.toEntity(request);
        user.setKeycloakUserId(keycloakUserId);
        user.setRoles(requestedRoles.stream()
                .map(RoleMapper::toRoleName)
                .map(roleName -> roleService.findByName(roleName)
                        .orElseThrow(() -> BusinessException.notFound("auth.role.not.found.in.database", roleName)))
                .collect(Collectors.toSet()));
        return userRepository.save(user);
    } catch (RuntimeException ex) {
        keycloakAuthClient.deleteUser(keycloakUserId);
        throw ex;
    }
}
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/service/UserServiceImpl.java` (Part I §4.3)

Before this method's real work starts, `@LogPerformance` (Part XI §39) wraps
the whole call in `LoggerAspect`'s proxy — timing it, and (because
`logInput = true`) recording the arguments, reported to the `perfLogger`
if the call runs slower than `ecommerce.web.logging.performance.threshold-ms`.

Three uniqueness checks run first (`existsByUsername`/`existsByEmail`/
`existsByPhoneNumber`, each a derived Spring Data query method — Part V
§20.3), any of which can short-circuit the whole method with a
`BusinessException.conflict(...)` (Part I §5.2) — **this is exactly the code
path Part XIII §41.2's `registerShouldThrowWhenUsernameExists` test exercises
directly**, with a mocked `userRepository` standing in for the real one.

If all three pass, `keycloakAuthClient.createUser(...)` (Part VII §27.3)
makes a real outbound HTTP call to Keycloak's admin API — parsing a
`Location` header back into a Keycloak user ID. Everything from here is
wrapped in a `try` block with a **compensating action** in `catch`: if
anything downstream fails (a role lookup, the database save),
`keycloakAuthClient.deleteUser(keycloakUserId)` undoes the Keycloak-side user
creation before rethrowing — because this method doesn't have a single
transaction spanning both Keycloak (an external HTTP API) and the local
database, it manually keeps the two in sync itself rather than risking a user
that exists in Keycloak but not locally, or vice versa.

`userMapper.toEntity(request)` (Part VI §23.4) is the ModelMapper-based
mapping strategy, converting `RegisterRequest` into a `User` entity (Part V
§18.2). Each requested role name is converted to a `RoleName` enum value
(Part I §3.2) and looked up as a real `Role` entity via `roleService`,
`.orElseThrow(...)` (Part I §4.3) again if a role name doesn't exist in the
database at all. `@Transactional` wraps the whole method in a database
transaction — the uniqueness checks, the entity construction, and the final
`userRepository.save(user)` (Part V §20.3's `JpaRepository`, inherited
`save`) commit together or not at all, at least on the local-database side of
the operation.

### 43.5 Step 4 — Persisting

`userRepository.save(user)` triggers Hibernate to `INSERT` into the `users`
table — the exact schema Part II §11.3's Liquibase changeset created, matched
field-for-field against `User`'s `@Column` annotations (Part V §18.2). The
`user_role` join rows (Part V §19.2's `@ManyToMany`) are written too, linking
this new user to whichever `Role` rows were resolved a moment earlier.
`AbstractAuditEntity` (Part V §21.2) — if `User` extended it, which it
doesn't in this specific case, being one of the entities predating that
shared base class — would have stamped `createdOn`/`createdBy` automatically
here; worth noticing as a real inconsistency this book's earlier chapters
already primed you to spot.

### 43.6 Step 5 — The Response, All the Way Back

If everything succeeded, `register(...)` returns the saved `User` back up to
the controller, which discards it and returns
`ApiResponse.message("User " + request.getUsername() + " registered successfully")`
(Part I §1.2) — a success envelope with no `data` payload, just a message,
`code: "OK"`, and a `traceId` pulled from the exact same `MDC` correlation ID
`CorrelationIdFilter` set on the way in (§43.2), letting anyone debugging
this signup later find every log line that belongs to it, in this service and
any other it touched, by that one ID.

If anything failed instead — a duplicate username, a Keycloak outage, a
missing role — the thrown `BusinessException` propagates up, uncaught by
anything in this call path, until `ApiExceptionHandler.handleBusiness` (Part
VIII §29.2) catches it and builds the equivalent error envelope, with the
correct HTTP status pulled directly off the exception (Part I §5.2), logged
at `warn`, not `error` — because a duplicate username is an ordinary,
expected outcome of accepting arbitrary user input, not a server bug.

### 43.7 Try It — the Real Test

Pick a different real endpoint this book has covered — `POST /api/orders`
(Part IV §15.2) is a good choice — and write out its own version of this
chapter from memory: every layer the request passes through, in order, from
the security filter chain to the final response, citing the specific part
and chapter of this book that covers each layer, the way §43.2 through §43.6
did for signup. If you can do that without re-reading anything, this book has
done its job.

---
