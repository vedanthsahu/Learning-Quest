## §131. Package Structure and Project Layout

### 1. The Vocabulary

- **`src` layout** — placing the actual package inside a `src/` directory (`src/myapp/`) rather
  than at the repository root, which forces tests to run against the *installed* package rather
  than accidentally importing the working directory's uninstalled source.
- **`__init__.py`** — marks a directory as a Python package; its contents (even if empty) control
  what a package exposes when imported.
- **Layered project layout (by feature vs by layer)** — organizing modules either by technical
  layer (`models/`, `routes/`, `services/`) or by feature/domain (`bookings/`, `users/`,
  `payments/`, each containing its own models, routes, and services) — the same bounded-context
  question from §111, applied inside one codebase.
- **Entry point (`__main__.py`, console scripts)** — the defined, explicit way a package is
  actually run or invoked, as opposed to relying on a specific file always being run directly.

### 2. Where It Sits, and Why Teams Use It

Project layout decisions look cosmetic but have real consequences: a flat, ungrouped set of files
becomes unnavigable past a certain size, and an ad-hoc `sys.path` hack to make imports work is a
classic sign the layout wasn't thought through. The `src` layout specifically exists to catch a
subtle bug class: without it, `pytest` can accidentally import your package from the current
directory instead of the installed version, masking packaging bugs that only surface once someone
actually tries to install and run the package elsewhere.

### 3. What Actually Breaks

- **Flat layout with everything in the repo root** — imports become fragile and circular-import-
  prone as the codebase grows, and it's unclear at a glance what's a reusable module versus a
  script.
- **Organizing purely by technical layer past a certain size** — a `models/`, `services/`, and
  `routes/` folder each containing 40 unrelated files makes it hard to see what belongs together;
  changing one feature means touching three folders instead of one.
- **Import-time side effects** — code that makes a database connection, reads a file, or calls an
  external service at module import time (rather than inside a function) runs unexpectedly during
  testing, tooling, or even just `python -c "import myapp"`.
- **No clear distinction between the package and the scripts that use it** — a script hardcoding
  relative imports and assuming it's always run from one specific directory breaks the moment
  someone runs it from CI or a different working directory.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use a `src` layout specifically so tests run against the installed package, not an
  accidentally-importable copy in the working directory."
- "Past a small size, I organize by feature/domain rather than purely by technical layer, so
  related code lives together and a feature change touches one folder, not three."
- "I keep import-time code side-effect-free — no network calls, no file I/O — so importing a
  module is always safe and predictable."

### 5. Interview-Ready Answer

> "I default to a `src` layout so tests exercise the actual installed package instead of an
> accidental local-directory import, which has caught real packaging bugs for me before. Past a
> handful of files, I organize by feature or domain rather than by technical layer — a `bookings/`
> folder with its own models, routes, and service logic, rather than one giant `models/` folder
> shared across every feature — because it keeps related changes localized to one place instead of
> three."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §8 (Logging, Packaging, Virtual Environments &
Dependencies) chapter for the closest packaging reference (neither companion book has a dedicated
project-layout/`src`-directory chapter; the pattern itself is used throughout the "Fieldnote"
capstone's own source tree); this book's §111 (bounded contexts) for the same organizing principle
applied at the service-architecture level instead of the file-layout level.

---
