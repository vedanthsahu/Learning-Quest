## 42. What's Not Tested, and Why That Matters

### 42.1 The Concept

Part XIII §41 read two real, working test files — both from `auth-service`.
This short chapter is about what a directory listing across the whole repo
actually shows, which is a different, more useful picture than reading any
individual test file in isolation: **testing in this codebase is
concentrated almost entirely in `auth-service` and `common-lib`.**
`order-service`, `product-service`, `payment-service`, and most of the
other eleven services have **no `src/test` directory at all.**

### 42.2 Why This Is Worth Stating Plainly

This isn't a criticism dressed up as a lesson — it's a genuinely useful,
realistic thing to internalize about production codebases generally, and
this one specifically demonstrates it cleanly: test coverage is almost never
uniform across a real system. Services get written under different time
pressure, by different people, at different points in a project's life, and
"we'll add tests later" is a decision that's easy to make once and easy to
never revisit. Recognizing *where* a codebase's test coverage actually is —
and isn't — is a real, practical skill: it tells you where you can refactor
with confidence (a change to `UserServiceImpl` will be caught if it breaks
existing behavior, because §41.2's tests exist) and where you're making a
change with no safety net at all (a change to `ProductServiceImpl`, Part I
§4.2, has zero existing tests to catch a regression).

### 42.3 A Second, Related Gap

The root `pom.xml` (Part IX §32.2) pins real versions for `rest-assured` and
`instancio-junit` — both testing libraries, both declared with
`<scope>test</scope>` in `dependencyManagement`, ready for any module to use.
`rest-assured` is built specifically for integration-testing real HTTP APIs
(spinning up a running service and firing actual requests at it, closer to
an end-to-end test than the unit tests in §41.2). Neither library actually
appears in use anywhere in this codebase's source — they're *available*, not
*applied*. This is worth naming as a distinct kind of gap from "no tests at
all": it's evidence the team planned for a level of testing (real HTTP
integration tests, likely using `@SpringBootTest` with `rest-assured`
hitting a real running context) that never actually got written, rather than
evidence nobody ever considered it.

### 42.4 What Good Coverage Would Actually Need to Test Here

Given everything read across this book, a reasonable test plan for, say,
`ProductServiceImpl` (Part I §4.2) — currently untested — would need to cover
at minimum: `findAll()`'s stream/mapping pipeline (Part I §4.2), `findById`'s
`Optional`-to-exception path, `update`'s `BeanUtils.copyProperties` exclusion
list actually excluding the right fields (Part VI §23.3), and the
`DataIntegrityViolationException` handling inside `save` (Part I §4.2) —
each of these is a distinct branch of real logic this book has already
walked through in detail, and none of it currently has a single assertion
protecting it from a future regression.

### 42.5 Try It

If you were prioritizing which untested service to add tests to first —
`product-service`, `order-service`, or `payment-service` — using what you
now know about each from earlier chapters (Part I §5's exception handling
gap in `product-service`, Part X §35's asynchronous, no-retry Kafka
publishing in `payment-service`, Part IV §15's authorization rules in
`order-service`), which would you pick first, and what's the concrete risk
you'd be protecting against?

---
