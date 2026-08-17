## §126. Pydantic: Validation and Settings Management

### 1. The Vocabulary

- **Pydantic model** — a class defining fields with types, used to parse and validate incoming
  data (a request body, a config file, an environment) — invalid data raises a clear validation
  error instead of failing mysteriously later.
- **`BaseSettings` (Pydantic Settings)** — a specialized model that loads its field values from
  environment variables (and optionally a `.env` file), giving typed, validated application
  configuration instead of raw `os.environ` string lookups scattered through the codebase.
- **Validators** — custom functions attached to a field or model that enforce rules beyond plain
  type-checking (e.g., "this string must be a valid email," "end date must be after start date").
- **Serialization vs validation** — validation is turning untrusted input into a trusted typed
  object; serialization is the reverse, turning a typed object back into JSON/dict form for a
  response — Pydantic handles both directions.

### 2. Where It Sits, and Why Teams Use It

Pydantic is the validation layer FastAPI is built on: a route's request body type hint *is* the
validation logic — invalid input never reaches your business logic at all, and the framework
returns a structured 422 error automatically. The same model shape is reused for settings: instead
of `os.environ.get("DATABASE_URL")` scattered across the codebase with no type safety and no
validation, a single `Settings(BaseSettings)` class declares every config value, its type, and its
default once, and fails fast at startup if something required is missing or malformed.

### 3. What Actually Breaks

- **Config read directly from `os.environ` throughout the codebase** — no single place to see what
  configuration the app actually needs, no validation, and a typo'd environment variable name
  fails silently (returns `None`) instead of failing loudly at startup.
- **Validating input by hand with scattered `if` checks** — duplicated, inconsistent validation
  logic across different endpoints handling similar data, instead of one model definition reused
  everywhere.
- **Secrets accidentally included in a model's default `repr()` or logs** — a settings object
  printed for debugging can leak a database password or API key into logs unless sensitive fields
  are explicitly marked to be excluded or masked.
- **Assuming validation happened when it actually didn't** — passing raw, unvalidated dicts through
  parts of the codebase that were never actually parsed into the Pydantic model, silently skipping
  the safety net everyone assumes is there.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use a Pydantic settings class as the single source of truth for configuration, so missing or
  malformed config fails loudly at startup instead of silently at some point in production."
- "I let the request body's type hint do the validation in FastAPI, rather than hand-writing
  validation checks inside the route function."
- "I'm careful that fields holding secrets don't end up in default logging or error output."

### 5. Interview-Ready Answer

> "I use Pydantic for two things: request validation, where the model definition on a FastAPI route
> is the validation logic, so bad input gets rejected with a structured error before it ever
> reaches business logic — and application settings, where a `BaseSettings` class reads and
> validates every config value from the environment once, at startup, so a missing or malformed
> value fails loudly and immediately instead of surfacing as a confusing bug later in production."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §21 (Pydantic: Validation & Serialization)
chapter and companion Python Backend Engineering Handbook's §44 (Configuration & Secrets
Management) chapter for full worked examples; this book's §130 (FastAPI fluency) for how Pydantic
models integrate directly into route definitions.

---
