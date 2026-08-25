## Appendix A: How Java Actually Runs

### A.0 What This Appendix Is

Everywhere else in this book, "learn Java" means "learn a pattern this real
codebase uses." This appendix is different on purpose — it owes nothing to
`4_ecommerce-java` at all. This is the foundational, slightly nerdy layer
underneath every Java program that ever runs anywhere: what actually happens
between writing `.java` source and a running process, what the JVM is doing
with your memory, and why several things you've already taken on faith
elsewhere in this book (`eclipse-temurin:21-jre-alpine`, `ddl-auto: validate`
completing fast, `spring.threads.virtual.enabled: true`) work the way they
do. None of it is codebase-specific — it's just how Java is, anywhere.

### A.1 From Source Code to a Running Program

A `.java` file is plain text — human-readable source code, nothing more.
Before it can run, two separate tools do two separate jobs:

1. **`javac`** (the Java compiler) reads your `.java` source and produces a
   `.class` file — not machine code the CPU can execute directly, but
   **bytecode**: a compact set of instructions for an idealized stack-based
   computer that doesn't physically exist. One `.class` file per class.
2. **`java`** (the JVM, the Java Virtual Machine) reads `.class` files and
   actually executes them — reading bytecode instructions one at a time,
   interpreting most of them, and (§A.2) compiling the ones that run often
   into real machine code on the fly.

```
MyApp.java  --[javac]-->  MyApp.class  --[java / the JVM]-->  running program
 (source)                  (bytecode)
```

This is the concrete meaning of Maven's `mvn compile` (Part IX §32) — it's
calling `javac` on every `.java` file in the project, for you, with the
right classpath already assembled. `mvn package` goes one step further and
bundles all the resulting `.class` files (plus dependencies) into one `.jar`
— which is exactly what `auth-service/Dockerfile`'s
`COPY target/*.jar app.jar` (Part XII §40.2) is copying into the container.

**Compare to Python:** CPython actually does something structurally similar
— it compiles a `.py` file to bytecode too (you've probably seen the
`__pycache__` folder full of `.pyc` files) before the CPython interpreter
runs it. The real difference isn't "Java compiles, Python doesn't" — both
do. It's that Java's bytecode is a stable, documented, portable format any
compliant JVM can run, and the JVM invests heavily in turning hot bytecode
into genuinely fast native machine code (§A.2) — which is a large part of
why a long-running Java service reaches very high steady-state throughput,
at the cost of a slower start than a scripting language feels like it has.

- [ ] Can explain the difference between `.java`, `.class`, and `.jar`
- [ ] Know that `javac` compiles and `java` runs
- [ ] Understand "bytecode" as an intermediate, platform-independent format

### A.2 What "The JVM" Actually Is, and JIT Compilation

"The JVM" is really two things people conflate: a **specification** (a
document describing what valid bytecode looks like and how it must behave)
and a **concrete implementation** of that spec — the actual program that
reads `.class` files and runs them. The implementation this book's codebase
runs on (and the overwhelming majority of real-world Java) is **HotSpot**,
part of OpenJDK. Other implementations exist (GraalVM being the most notable
— it can even compile Java **ahead of time** into a true native binary,
trading the properties described below for a near-instant startup, which
matters a lot for short-lived serverless functions and is an active area of
change in the Java world).

A JVM does three things worth knowing by name:

- **Class loading.** A class's bytecode isn't loaded into memory until the
  first time it's actually referenced — lazily, not all up front when the
  program starts. This is part of why a Java program with a huge dependency
  tree can still start reasonably, since large swaths of code that never
  actually run this session are simply never loaded.
- **Interpretation.** At first, the JVM just interprets bytecode instructions
  one at a time — correct, but relatively slow, the same tradeoff any
  interpreter (including CPython's) makes.
- **JIT (Just-In-Time) compilation.** The JVM continuously profiles which
  specific methods are actually being called a lot ("hot" methods) while
  the program runs, and compiles *those specific methods* down to real,
  optimized native machine code, on the fly, replacing the interpreted
  version mid-flight. HotSpot does this in tiers — a quick, less-optimized
  compile first (the "C1" compiler), then a slower, more aggressively
  optimized one (the "C2" compiler) if a method stays hot long enough to be
  worth the extra investment.

The practical consequence, worth internalizing: **a Java process is slower
at the very start of its life and gets faster as it runs**, as more and more
of its actual hot code gets JIT-compiled. This is the historical reason Java
had a reputation for slow startup relative to Python or Node — it's paying
for steady-state speed with a slower ramp-up, a tradeoff that matters a lot
less for a long-running microservice (this codebase's whole world) than it
does for, say, a short-lived CLI script.

- [ ] Know what HotSpot is, and that "the JVM" has multiple real implementations
- [ ] Can explain, in one sentence, what JIT compilation does and why it exists
- [ ] Understand why a Java process's performance characteristically improves the longer it runs

### A.3 JDK vs JRE vs JVM, For Real This Time

Three overlapping terms, cleanest read as containment, smallest to largest:

- **JVM** — just the execution engine: load bytecode, run it (§A.2). On its own, not directly useful to a developer.
- **JRE** (Java Runtime Environment) — the JVM **plus** the standard class libraries every Java program expects to exist (`java.lang`, `java.util`, and everything else `import`-able without adding a dependency). Enough to *run* an already-compiled program.
- **JDK** (Java Development Kit) — the JRE **plus** the tools needed to actually *write and build* Java: `javac` (the compiler), `jar` (the packager), `javadoc`, a debugger, and more.

Modern JDK distributions (since Java 11) no longer ship the JRE as a
separate, smaller download the way older Java once did — installing "a JDK"
today gives you everything. But the *conceptual* distinction still matters,
and now you have the vocabulary to notice it in the wild: this book's own
`auth-service/Dockerfile` (Part XII §40.2) is built `FROM eclipse-temurin:21-jre-alpine` —
deliberately the smaller **JRE**-flavored base image, not a full JDK, because
a running container only ever needs to *execute* an already-compiled `.jar`;
it never compiles anything itself. That single word, `jre`, in a Dockerfile
you'd already read, now means something concrete.

- [ ] Can state what each of JVM, JRE, and JDK adds over the previous one
- [ ] Can explain why a production container image typically only needs a JRE, not a full JDK

### A.4 Memory: The Stack and the Heap

Every running thread (§A.6) has its own **call stack** — a fast,
last-in-first-out region of memory holding local variables and the record of
which methods called which. Every object you create with `new` (Part I §6.6's
`Product.builder()`, or any plain `new SomeClass(...)`) lives instead on the
**heap** — one shared region for the whole JVM process, not per-thread, and
managed by the garbage collector (§A.5) rather than automatically freed when
a method returns.

This split explains a genuinely important Java-specific behavior: **a
primitive variable holds its actual value directly on the stack; an object
variable holds only a reference (effectively, an address) to where the real
object lives on the heap.** Assigning one primitive to another
(`int b = a;`) copies the value — `a` and `b` are now fully independent.
Assigning one object reference to another (`User u2 = u1;`) copies only the
*reference* — `u1` and `u2` now both point at the exact same object on the
heap, and mutating the object through `u2` is visible through `u1` too,
since there's only ever one actual object.

This is precisely the mechanism behind `==` vs `.equals()`, mentioned in
Appendix B's checklist without explanation until now: `==` on two object
references compares whether they point at the *same heap location* —
identity, not content. Two separately-constructed `User` objects with
identical field values are `==`-unequal, because they're two distinct
objects on the heap, even though `.equals()` (if properly overridden, §A.8)
would correctly report them as equal by value.

- [ ] Can explain the difference between the stack and the heap in one sentence each
- [ ] Understand that assigning an object variable copies a reference, not the object itself
- [ ] Can connect this directly to why `==` behaves the way it does on objects

### A.5 Garbage Collection

There's no `free()` or `delete` in Java, and no destructor that runs
predictably when an object goes out of scope the way it might in C++. The
JVM's **garbage collector (GC)** runs periodically, finds heap objects that
are no longer reachable from anywhere a running program could still get to
them (a local variable, a static field, another still-reachable object's
field — collectively "GC roots"), and reclaims that memory automatically.
`System.gc()` exists but is only a *hint* the JVM is free to ignore — you
don't get to force garbage collection to happen at a specific moment.

Several different GC algorithms exist inside HotSpot, tuned for different
priorities — G1 (the modern default, balancing throughput and pause times),
ZGC and Shenandoah (built for extremely low pause times on very large
heaps), and older ones like Parallel GC (favoring raw throughput). None of
this needs mastering to write ordinary application code — what's worth
knowing is that it's a real, configurable, actively-developed part of the
platform, selectable via JVM startup flags, not a fixed black box.

**Compare to Python:** CPython's default memory management is primarily
**reference counting** (an object is freed the instant its reference count
hits zero) with a supplementary cycle-detecting collector for reference
cycles reference counting alone can't catch. Java's GC is a **tracing**
collector from the start — it never counts references incrementally; it
periodically walks the whole graph of reachable objects from GC roots and
reclaims everything it *doesn't* reach. Different strategy, same underlying
goal: you never manually free heap memory in either language.

- [ ] Understand garbage collection as "automatic reclaiming of unreachable heap objects," not "cleans up whenever you ask"
- [ ] Know that multiple real GC algorithms exist and are chosen/tuned via JVM flags
- [ ] Can name one real difference between CPython's and the JVM's default memory management strategy

### A.6 Threads, and Why Virtual Threads Were a Big Deal

A traditional Java **thread** (`java.lang.Thread`) maps one-to-one onto a
real operating-system thread — and OS threads are genuinely expensive:
each one reserves real memory for its own stack (often around 1MB by
default) and costs real time for the OS to context-switch between. This is
exactly why traditional Java web servers use a **bounded thread pool** —
say, 200 threads — rather than spinning up a new OS thread per incoming
request: past a few thousand concurrent OS threads, a machine simply runs
out of practical resources, long before it runs out of CPU.

**Virtual threads** (finalized as a stable feature in Java 21 — this
codebase's own version, Part IX §32.2) are a different, much lighter kind of
thread the JVM itself manages, not the operating system. You can create
literally millions of them without exhausting anything. The trick: when a
virtual thread does something that would normally block (waiting on a slow
database query or an outbound HTTP call — exactly the kind of blocking calls
this whole book is full of), the JVM automatically **parks** it and frees up
the small number of real OS threads underneath (called "carrier threads") to
go run other work in the meantime — then resumes the virtual thread,
transparently, once the blocking operation completes.

This is the full explanation behind `spring.threads.virtual.enabled: true`
in `application.yml` (Part II §8.2), stated only briefly there: it lets
this platform's ordinary, simple, blocking-style code (a controller method
that just calls a repository and waits for the answer, the way every
example in this book is written) scale to handle a very large number of
concurrent slow requests — the kind of scale that used to require rewriting
everything in a more complex, harder-to-read asynchronous/reactive style —
with a single configuration line and zero changes to the code itself.

- [ ] Can explain why a traditional thread pool is bounded
- [ ] Understand what a virtual thread is, in contrast to a traditional OS-backed thread
- [ ] Can explain, from first principles, why `spring.threads.virtual.enabled: true` helps this platform specifically

### A.7 What Static Typing Actually Buys You

Every value in a running Java program has a fixed, known type, checked by
the compiler *before the program ever runs a single line* — a mismatched
type is a compilation failure, not a bug waiting to be discovered the first
time a rarely-hit code path executes in production, the way it might be in
Python. This is the deepest reason `List<String>` can't silently end up
holding an `Integer`, or why a method declared to return `User` can't
secretly return `null` disguised as one without every caller having agreed
that's possible (which is exactly what `Optional<T>`, Part I §4.1, exists to
make explicit instead).

One genuinely surprising, worth-knowing exception: **generics are erased at
runtime.** `<T>` (Part I §2) is a compile-time-only concept — the compiler
uses it to check your code, then throws that information away when
generating bytecode. At runtime, a `List<String>` and a `List<Integer>` are
both just `List` — the JVM itself has no idea what type parameter either one
was ever meant to hold. This is called **type erasure**, and it's why
certain things that feel natural coming from a dynamic language (asking an
object at runtime "what generic type were you parameterized with?") simply
aren't possible in ordinary Java the way they might be in Python's more
introspectable runtime — the type safety is real, but it's a compile-time
guarantee, not something you can query after the fact.

- [ ] Can explain, concretely, when a Java type error is caught relative to when a similar Python bug would surface
- [ ] Know what "type erasure" means and that it's a real, sometimes-surprising limitation, not a bug

### A.8 The `Object` at the Root of Everything

Every single class in Java — whether it says so or not — implicitly extends
`java.lang.Object` if it doesn't explicitly extend anything else. `Object`
supplies a handful of methods every Java object therefore has, whether you
wrote them or not: `toString()`, `equals(Object)`, `hashCode()`, `getClass()`.

This explains two things you've likely already brushed up against
elsewhere in this book without the full picture: why printing an object you
never gave a `toString()` prints something unhelpful like
`com.ecommerce.authservice.entity.User@4b67cf4d` (that's `Object`'s default
`toString()` — class name plus a hash-based memory identifier, not anything
about the object's actual field values) — and why **overriding `equals()`
without also overriding `hashCode()` consistently is a real, classic bug**:
Java's contract requires that two objects considered `.equals()` **must**
also return the same `.hashCode()`, because `HashMap`/`HashSet` (Part I §10)
use the hash code to decide which internal bucket to even look in before
ever calling `.equals()` to confirm a match — break that contract, and a
value you just correctly `.equals()`-matched to a set can still fail a
`.contains()` check, because it landed in a different bucket entirely. This
is precisely why the Lombok `@EqualsAndHashCode` annotation you've seen on
every entity throughout this book (Part I §6.3, Part V §18.2) generates
*both* methods together, consistently, in one shot, rather than leaving a
developer to hand-write two methods that have to agree with each other
forever.

- [ ] Know that every class implicitly extends `Object`, and what that provides for free
- [ ] Can state the `equals()`/`hashCode()` contract and explain, concretely, what breaks if it's violated

### A.9 A Note on Java Versions

Java ships a new numbered release every six months, but most real production
systems — this codebase included — track only the **LTS (Long-Term
Support)** releases, which arrive roughly every two years and get extended
security/bug-fix support (8, 11, 17, 21, with 25 next in line). This
codebase targets **Java 21** (Part IX §32.2's `<java.version>21</java.version>`).

Worth knowing specifically because of how much this book leans on
*relatively recent* language features — records (Java 16), pattern matching
for `switch` (Java 21), text blocks (Java 15), virtual threads (Java 21).
Older tutorials, Stack Overflow answers, and even textbooks written against
Java 8 (still an extremely common baseline, since it was itself an LTS
release for years) will often show none of this — DTOs as verbose
hand-written classes instead of records, `switch` statements instead of
`switch` expressions, threads that are always the traditional, heavyweight
kind. Neither version of Java is "wrong" — but if outside material you're
studying from looks noticeably more verbose or old-fashioned than the code
in this book, checking which Java version that material targets is usually
the whole explanation.

- [ ] Know roughly what an LTS release is and why production systems target them
- [ ] Aware that "modern Java" (this book's version) and "Java 8-era Java" can look meaningfully different in style

---

With this appendix and Appendix B's syntax checklist both covered, you have
the full foundation this book's 44 chapters were written assuming — from
here, nothing in the rest of the book should require taking anything on
faith.
