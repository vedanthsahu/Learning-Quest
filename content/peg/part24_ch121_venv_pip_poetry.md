## §121. Virtual Environments, pip, and Poetry

### 1. The Vocabulary

- **Virtual environment (venv)** — an isolated Python installation with its own set of installed
  packages, separate from the system Python and from other projects' environments.
- **pip** — Python's default package installer; installs from PyPI (or any index) based on a
  `requirements.txt` file or direct command-line arguments.
- **Poetry** — a higher-level dependency and packaging tool that manages the virtual environment,
  dependency resolution, and publishing in one workflow, driven by a `pyproject.toml` file.
- **`pyproject.toml`** — the modern, standardized project-metadata file (PEP 518/621) that Poetry
  (and increasingly pip itself) uses to declare dependencies, build settings, and project info.

### 2. Where It Sits, and Why Teams Use It

Every Python project needs an answer to "which packages, and which versions, does this code
actually depend on?" A virtual environment prevents two projects on the same machine from fighting
over incompatible package versions. Plain pip with a `requirements.txt` is the simplest possible
setup and still extremely common; Poetry (and similar tools like PDM or uv) exist because plain pip
doesn't do dependency *resolution* well on its own — it installs what you ask for without checking
whether two dependencies want incompatible versions of a third package.

### 3. What Actually Breaks

- **Installing packages globally, outside any virtual environment** — works fine until a second
  project needs a different version of the same package, or a system Python upgrade breaks
  everything installed against it.
- **A `requirements.txt` with no pinned versions** — `requests` with no version means a fresh
  install six months later can silently pull a breaking major version update.
- **Forgetting to activate the virtual environment** — running `pip install` or the app itself
  outside the venv, silently installing into or running against the wrong Python entirely — a
  frequent "works on my machine, not in CI" cause.
- **Committing the virtual environment folder to git** — bloats the repository and bakes in
  machine-specific paths; the environment should always be reproducible from a lockfile, not
  checked in itself.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I never install packages outside a virtual environment — one per project, so dependency
  versions can't collide across projects."
- "I always pin dependency versions somewhere — either directly in `requirements.txt` or via a
  lockfile — so a fresh install six months later gets the same versions."
- "I know why Poetry exists over plain pip: real dependency resolution, so conflicting version
  requirements are caught at install time, not discovered as a runtime bug."

### 5. Interview-Ready Answer

> "I always work inside a virtual environment per project so dependencies never collide across
> projects, and I make sure versions are pinned somewhere reproducible — either a pinned
> `requirements.txt` or a Poetry lockfile — so a fresh install months later doesn't silently pull a
> breaking update. I reach for Poetry specifically when a project has enough dependencies that
> version conflicts are a real risk, since it does actual dependency resolution instead of just
> installing whatever's asked for."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §8 (Logging, Packaging, Virtual Environments &
Dependencies) chapter for the full workflow, including publishing a package; this book's §122
(dependency locking) for the reproducibility half of this same problem.

---
