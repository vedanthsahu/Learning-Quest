## §125. Typing and Static Analysis (mypy/pyright)

### 1. The Vocabulary

- **Type hints** — optional annotations (`def f(x: int) -> str:`) that document expected types
  without being enforced at runtime by Python itself.
- **Static type checker (mypy, pyright)** — a separate tool that reads type hints and analyzes
  code *before it runs*, catching type mismatches as an error rather than as a production
  `AttributeError`.
- **`Optional[X]` / `X | None`** — the explicit way to say a value might be `None`, forcing callers
  (and the type checker) to handle that case rather than assuming a value is always present.
- **Duck typing vs structural typing (`Protocol`)** — Python has always allowed "if it walks like a
  duck" typing at runtime; `Protocol` lets you express that same flexibility in a way a type
  checker can still verify statically.

### 2. Where It Sits, and Why Teams Use It

Python doesn't require type hints, and plenty of production code runs fine without them — but
past a certain codebase size, type hints plus a checker catch an entire category of bugs (wrong
argument type, forgotten `None` check, typo'd attribute name) before the code ever runs, in the
editor or in CI, instead of in production. They also function as always-accurate documentation:
unlike a comment, a type hint that's wrong gets caught by the checker.

### 3. What Actually Breaks

- **Type hints that are never checked** — adding annotations without ever running mypy/pyright in
  CI gives a false sense of safety; unenforced type hints can silently go stale and become
  actively wrong.
- **Overusing `Any`** — reaching for `Any` to make a type error go away defeats the purpose;
  it's sometimes the right call at a genuine boundary (dynamic JSON, legacy code), but overused it
  turns a typed codebase back into an untyped one with extra syntax.
- **Ignoring `Optional`/`None` handling** — a function typed to return `Optional[User]` that gets
  called without a `None` check is exactly the class of bug the type checker exists to catch — and
  it still shows up constantly when hints are added but warnings aren't fixed.
- **Type-checking only part of the codebase** — a strict boundary somewhere and untyped, unchecked
  code everywhere else means bugs still slip through at the seam between the two.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I run a type checker in CI, not just as an editor hint — an annotation nobody enforces can go
  stale without anyone noticing."
- "I try to avoid `Any` as a way to silence errors; I use it deliberately at real dynamic
  boundaries, not as a general escape hatch."
- "I take `Optional` return types seriously and handle the `None` case explicitly rather than
  assuming a value is always present."

### 5. Interview-Ready Answer

> "I use type hints specifically because they turn a category of runtime bugs — wrong argument
> type, unhandled `None`, a typo'd attribute — into errors caught by mypy or pyright before the code
> ever runs, and I make sure that check is actually wired into CI rather than just living in an
> editor. I'm deliberate about `Any` — I use it at genuine dynamic boundaries, not as a way to make
> a type error disappear, since overusing it quietly turns a typed codebase back into an untyped
> one."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §4 (Dataclasses, Enums & Structural Typing
(Protocols)) chapter for full mypy/pyright configuration and `Protocol` examples; this book's §126
(Pydantic) for how runtime validation complements static typing at actual data boundaries.

---
