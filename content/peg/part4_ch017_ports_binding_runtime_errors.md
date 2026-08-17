## §17. Ports, Binding, and Common Runtime Errors

### 1. The Vocabulary

- **Port** — a number identifying which service on a machine a connection is meant for.
- **Bind** — a process claiming a port so it can listen for connections on it.
- **`localhost` (127.0.0.1)** vs **`0.0.0.0`** — `localhost` only accepts connections from the
  same machine; `0.0.0.0` means "listen on every network interface," which is what you need
  inside a container for anything outside it to reach the process.
- **"Address already in use"** — the error when a second process tries to bind a port something
  else already holds.
- **Crash loop** — a process that crashes, gets restarted, crashes again, repeatedly.

### 2. Where It Sits, and Why Teams Use It

This is the most common source of "it works locally but not in Docker/Kubernetes" confusion —
purely because of the `localhost` vs `0.0.0.0` distinction, not because anything is actually
broken about the app.

### 3. What Actually Breaks

- **App binds to `localhost` inside a container** — the app runs fine and responds if you exec
  into the container itself, but is completely unreachable from outside it, because `localhost`
  inside the container refers to the container, not the host. Bind to `0.0.0.0`.
- **"Address already in use" on restart** — a previous instance of the process (or a zombie left
  over from a crash) is still holding the port; the fix is finding and killing that process, not
  just retrying.
- **Crash loop with no visible error** — often means the crash happens before logging is even
  initialized, or logs are going somewhere (stdout is buffered, or captured differently) that
  isn't where you're looking.
- **Confusing "container exited" with "container crashed"** — some containers are *supposed* to
  exit immediately (a one-off job); a restart policy that keeps relaunching a container meant to
  run once and finish looks identical to a real crash loop from the outside.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Inside a container, I bind to `0.0.0.0`, not `localhost`, or nothing outside the container can
  reach it."
- "'Address already in use' means something else already holds that port — I check for a leftover
  or zombie process before assuming the code is broken."
- "A crash loop needs logs from *before* the crash, not just the crash message itself, to
  actually diagnose."

### 5. Interview-Ready Answer

> "The single most common 'works locally, not in the container' bug I've seen is binding to
> `localhost` instead of `0.0.0.0` — inside a container, `localhost` only means the container
> itself, so nothing outside it can connect even though the app is running fine. Past that, port
> conflicts and crash loops are usually a process-management problem, not an application-logic
> problem — either something else already holds the port, or the process is crashing before it
> even gets to log why."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §69 (Deployment Readiness) chapter; companion
Software Systems Handbook's §44 (Containers Deep Dive: namespaces, cgroups, image layers) chapter.

---
