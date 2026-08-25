## Appendix B: Java Syntax & Keyword Self-Study Checklist

### B.0 How to Use This Appendix

Every chapter in this book explains a *pattern* — why this codebase uses a
record, why constructor injection, why a particular exception design — on
the assumption you already know what the underlying Java syntax means. This
appendix is the missing piece: a flat checklist of the language mechanics
themselves, with no explanation attached, meant to be studied from an
external source (a Java tutorial, a book, the official Oracle docs, or
whichever resource you prefer) and checked off here as you cover each one.
Appendix A covers the deeper "how Java actually runs" layer (the JVM,
compilation, memory) — this one is pure syntax and keywords.

Where a concept is actually demonstrated in real code elsewhere in this
book, the item points there — once you've studied the syntax externally,
that's where to go see it doing real work, rather than a toy example.
Work through this roughly top to bottom; later sections lean on earlier
ones (you need constructors before inheritance makes sense, generics before
streams make sense).

### B.1 Program Structure

- [ ] A `.java` file's public class name must match the filename exactly
- [ ] `public static void main(String[] args)` — the program's entry point
- [ ] Statements end in `;`; code blocks use `{ }`, not indentation
- [ ] Comments: `//` single-line, `/* */` multi-line, `/** ... */` Javadoc
- [ ] `package com.example.foo;` — must match the folder structure on disk
- [ ] `import com.example.Bar;` (single class) vs `import com.example.*;` (wildcard)
- [ ] `import static com.example.Utils.helper;` — importing a static member directly

### B.2 Variables & Types

- [ ] The eight primitive types: `int`, `long`, `double`, `float`, `boolean`, `char`, `byte`, `short`
- [ ] Every non-primitive is a reference type (an object), including `String` — Appendix A §A.4 covers what that actually means in memory
- [ ] Wrapper classes (`Integer`, `Long`, `Double`, `Boolean`...) and autoboxing/unboxing between them and primitives
- [ ] `var` — local variable type inference (the compiler infers the type; it's still static typing, not dynamic — Appendix A §A.7)
- [ ] `final` on a local variable/field — assignable exactly once
- [ ] Explicit casting: `(int) someDouble` (narrowing) vs automatic widening (`int` → `long`)
- [ ] Default values for uninitialized fields (`0`, `false`, `null`) vs local variables, which must be assigned before use

### B.3 Operators

- [ ] Arithmetic `+ - * / %` — integer division truncates, floating-point division doesn't
- [ ] Comparison `== != < > <= >=`
- [ ] Logical `&& || !` and short-circuit evaluation
- [ ] Ternary `condition ? valueIfTrue : valueIfFalse`
- [ ] `instanceof`, including the modern pattern-matching form (`if (x instanceof String s)`)
- [ ] **`==` vs `.equals()`** — `==` compares object references (identity) for non-primitives, not value; `.equals()` compares value. The single most common early Java mistake — see Appendix A §A.4 and §A.8 for the full "why"

### B.4 Control Flow

- [ ] `if` / `else if` / `else`
- [ ] Classic `switch` (`case`, fall-through, `break`)
- [ ] Modern `switch` **expression** (`->` arrows, no fall-through, can return a value) — see Part X §35.3
- [ ] `for` (classic three-part: init; condition; update)
- [ ] Enhanced `for` / for-each: `for (Product p : products)`
- [ ] `while`, `do-while`
- [ ] `break`, `continue`, and labeled loops (`outer: for (...) { ... break outer; }`)

### B.5 Strings & Arrays

- [ ] `String` is **immutable** — every method that looks like it modifies a string returns a new one
- [ ] Core `String` methods: `.length()`, `.substring()`, `.split()`, `.trim()`, `.isBlank()`, `.equals()`, `String.format(...)`
- [ ] String concatenation with `+` vs building one with `StringBuilder` (cheaper for many concatenations in a loop)
- [ ] Text blocks: `"""multi-line string"""` (Java 15+)
- [ ] Arrays: `int[] arr = new int[5];`, fixed size once created, `.length` (a field, no parentheses)

### B.6 Classes & Objects

- [ ] `class`, fields, methods, constructors — the basic shape
- [ ] `new SomeClass(...)` — object instantiation (allocates on the heap — Appendix A §A.4)
- [ ] `this` — refers to the current instance; `this.field = field` inside a constructor
- [ ] Access modifiers: `public`, `private`, `protected`, and *package-private* (no keyword at all — the default)
- [ ] `static` — belongs to the class itself, not any one instance (see Part I §6.2 for a static-only interface)
- [ ] `final` has three different meanings depending on where it's used: a variable (assign-once, §B.2), a method (cannot be overridden), a class (cannot be subclassed — Part I §6.3)
- [ ] Constructor overloading — multiple constructors with different parameter lists; `this(...)` to call another constructor in the same class

### B.7 Inheritance & Polymorphism

- [ ] `extends` — a class can extend exactly one other class
- [ ] `super` — calling the parent class's constructor or an overridden method
- [ ] Overriding (`@Override`, same signature, subclass provides a new body) vs overloading (same name, different parameter list — Part I §6.2)
- [ ] `abstract class` and `abstract` methods — a class that can't be instantiated directly, meant to be extended
- [ ] `interface`, `implements` — a class can implement multiple interfaces (unlike single class inheritance)
- [ ] Default methods on an interface (a method with a body, Java 8+) vs `static` methods on an interface (Part I §6.2)
- [ ] Interface vs abstract class — when each is the right tool (Part I §6.1 for a real interface/implementation split)
- [ ] Every class implicitly extends `java.lang.Object` if nothing else — Appendix A §A.8

### B.8 Exceptions

- [ ] `try` / `catch` / `finally`
- [ ] `throw new SomeException(...)` vs a method signature declaring `throws SomeException`
- [ ] Checked exceptions (must be caught or declared) vs unchecked/`RuntimeException` (no such requirement) — Part I §5.1
- [ ] Writing a custom exception class by extending `RuntimeException`/`Exception` — Part I §5
- [ ] `try-with-resources`: `try (var conn = ...) { }` — automatically closes the resource, no manual `finally { conn.close(); }`
- [ ] Multi-catch: `catch (IOException | SQLException e) { }`

### B.9 Generics

- [ ] `<T>` type parameters on a class, interface, or method — Part I §2.1
- [ ] Multiple type parameters: `<M, V>` — Part I §2.2
- [ ] Bounded wildcards `? extends T` and `? super T` — Part I §2.3
- [ ] Why generics exist: catching a type mismatch at compile time instead of a `ClassCastException` at runtime
- [ ] Type erasure — generics are a compile-time-only guarantee, gone by the time bytecode runs — Appendix A §A.7

### B.10 Collections

- [ ] The core interfaces: `List`, `Set`, `Map` (all in `java.util`)
- [ ] Common implementations: `ArrayList`, `LinkedList`, `HashSet`, `HashMap`, `TreeMap`
- [ ] `import java.util.*;` — where essentially all of these live
- [ ] Iterating a collection: for-each (§B.4), explicit `Iterator`, or a stream (§B.11)
- [ ] `Comparable<T>` (a type's own natural ordering, `compareTo`) vs `Comparator<T>` (an external, custom ordering)
- [ ] Why `HashMap`/`HashSet` need a consistent `equals()`/`hashCode()` pair to work correctly — Appendix A §A.8

### B.11 Functional-Style Java (Java 8+)

- [ ] Lambda expressions: `(x, y) -> x + y`, or `x -> x.getName()`
- [ ] Core functional interfaces: `Function<T,R>`, `Supplier<T>`, `Consumer<T>`, `Predicate<T>`, `Runnable`
- [ ] Method references: `ClassName::methodName` or `instance::methodName` — shorthand for a lambda that just calls one method (used constantly — Part I §4.2)
- [ ] `Optional<T>`: `.isPresent()`, `.orElse(default)`, `.orElseThrow(...)`, `.map(...)` — Part I §4.1
- [ ] Streams: `.stream()`, `.map()`, `.filter()`, `.distinct()`, `.collect(...)`, `.toList()`, `.reduce(...)` — Part I §4.2

### B.12 Modern Java Data Types

- [ ] `record` — an immutable data carrier with generated constructor/accessors/equals/hashCode/toString — Part I §1
- [ ] Compact constructors on a record (validation/normalization) — Part I §1.2
- [ ] `enum` — including enum constants with their own constructor arguments and fields — Part I §3
- [ ] Pattern matching for `instanceof` (§B.3) and for `switch` (§B.4)

### B.13 Annotations

- [ ] What an annotation actually is: metadata attached to code, read by the compiler, a build tool, or a framework at runtime via reflection — not code that runs by itself
- [ ] Built-in annotations: `@Override`, `@Deprecated`, `@SuppressWarnings`
- [ ] Writing your own: `@interface`, `@Target`, `@Retention` — Part XI §39.2
- [ ] This book is soaked in third-party annotations you'll want to recognize on sight: Spring's (`@Service`, `@RestController`, `@Bean`...), Lombok's (`@Data`, `@Builder`, `@RequiredArgsConstructor`...), JPA's (`@Entity`, `@Column`...), Jakarta Validation's (`@NotBlank`, `@Valid`...) — none of these are language keywords, they're ordinary annotations a framework happens to scan for

### B.14 Build & Tooling Concepts

- [ ] `.java` (source you write) → `.class` (compiled bytecode) → `.jar` (a packaged archive of many `.class` files) — Appendix A §A.1
- [ ] JDK vs JRE vs JVM — Appendix A §A.3 for the full explanation
- [ ] The classpath — how the JVM locates classes it needs at runtime
- [ ] Maven basics: `pom.xml`, `<dependency>` blocks, `mvn compile` / `mvn test` / `mvn package` — Part IX §32
- [ ] What an annotation processor does: generates real `.java` source at compile time from annotations (Lombok and MapStruct both work this way) — Part VI §23.5

---

Once every box above makes sense from outside material, the rest of this
book stops being "trust me, this pattern is good" and starts being fully
verifiable against code you can read yourself, line by line.
