## 0. Front Matter: How This Book Works, and the Codebase You're Reading

### 0.1 What This Book Is (and Isn't)

The other handbooks on this shelf — the Software Systems Handbook, the AI Systems
Handbook, the Python Backend Handbook — teach through an invented capstone project
built up chapter by chapter, purpose-written to demonstrate each concept cleanly.

This book does the opposite. There is no invented project. Every example in
every chapter is real code from a real Spring Boot microservices repository on
this machine, `C:\Vedanth_Space\4_ecommerce-java` — copied in full onto this
page, not summarized or trimmed. That repo is finished — pulled from an
upstream project with 350+ commits behind it, not something actively changing —
so nothing you read here will drift out of date under you.

The tradeoff is explicit: this book is narrower than the others. It only
teaches what this codebase actually contains. Where the codebase has a gap —
there's no `@FeignClient` anywhere, several services have zero tests, one Kafka
consumer is mostly commented-out dead code — this book says so plainly instead
of inventing a clean example to paper over it. A real codebase that's honest
about its rough edges is more useful to learn from than a tidy fictional one.

### 0.2 The Codebase, Briefly

Fourteen Spring Boot services (`auth-service`, `product-service`, `order-service`,
`payment-service`, and ten others), plus a `common-lib` module of shared code
they all depend on. Two coding "eras" coexist in it, and spotting which one
you're reading in is itself a useful skill:

- **The modern layer** — `common-lib` and `auth-service`. Records, Keycloak/OAuth2,
  a shared `BusinessException` hierarchy, autoconfigured Spring Boot starters.
- **The legacy layer** — `order-service`, `product-service`, `payment-service`,
  and others. Manual mapper helpers, `BeanUtils.copyProperties`, per-service
  duplicated security config, one exception class per error case.

Neither is "wrong." Reading both, and noticing where the second was rewritten
into the first, teaches you more about how real systems evolve than either one
alone would.

### 0.3 How Every Chapter Is Built

Each chapter follows the same shape: an explanation of a Java or Spring concept
first (with a Python comparison where that genuinely helps, not forced in
everywhere), then the real code that demonstrates it, in full, directly below.

Every code block is followed by a plain citation like this:

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/entity/RoleName.java`

That's a reference, not a link to click — the point of this book is that you
never have to leave the page to see the real thing. If you're curious to browse
the file yourself later, the path is exact and you can open it however you
normally would; nothing here depends on any particular editor or tool being
installed.

### 0.4 Coming From Python — What Actually Changes

A short list to hold in mind for Part I, not a complete reference:

- **Static types, checked at compile time.** A variable's type is fixed and
  verified before the program ever runs — there's no equivalent of Python
  quietly accepting the wrong type until it fails at runtime.
- **Compiled, not interpreted.** `.java` files compile to `.class` bytecode that
  runs on the JVM. There's a build step (Maven, here) between writing code and
  running it.
- **Everything lives in a class.** There's no bare top-level function the way
  Python allows `def foo():` at module scope — Java code is always a method on
  some class or interface.
- **Checked exceptions exist.** Java distinguishes exceptions the compiler
  forces you to handle or declare (`checked`) from ones it doesn't
  (`RuntimeException` and its subclasses, `unchecked`) — Python has no
  equivalent distinction. Part I §5 covers this against real code.
- **Curly braces and semicolons, not indentation.** Purely syntactic, but it's
  the first thing that will visually throw you.

None of this needs to be memorized up front — Part I builds each idea against
real code as it comes up.

---
