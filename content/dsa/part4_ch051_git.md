## §51. Git: Merkle Trees & Content-Addressable Storage

### 1. Decision Snapshot

Git's entire object model is a Merkle-DAG (a Merkle Tree, §26, generalized to allow shared
subtrees) — every commit, tree (directory), and file blob is addressed by the hash of its own
content, and a commit's hash transitively depends on the hash of everything it contains.

### 2. The Problem This System Had to Solve

Version control needs to detect exactly what changed between two states of a repository, verify
that a repository's history hasn't been tampered with or corrupted, and efficiently share/sync
history between machines without re-transferring everything each time — all of which a Merkle
structure directly enables.

### 3. Which Structures It Uses, and Why

A **blob** is the hash of a file's raw content. A **tree object** represents a directory,
containing a list of (name, hash-of-blob-or-subtree) entries — its own hash is computed from that
list, meaning a tree's hash changes if *any* file or subdirectory anywhere beneath it changes
(exactly §26's "any leaf change propagates to the root" property). A **commit object** stores the
hash of its root tree, plus parent commit hash(es) — chaining commits into a Merkle-DAG of history
itself, not just of file content. This is precisely why two clones of the same repository at the
same commit have byte-identical commit hashes — content-addressing means identical content
*always* produces identical hashes — and why `git fetch` can efficiently determine exactly which
objects the two repositories don't share in common: comparing hashes top-down (from `git log`'s
walk of commit ancestry down to trees down to blobs) immediately identifies where the two
histories diverge, without transferring or diffing file content directly, mirroring §26's
find_difference walk exactly.

### 4. Simplified Architecture Diagram

```
Commit (hash: c3a1..)
  -> parent: (hash: b7f2..)
  -> tree (hash: t9e4..)
       -> "src/" (hash: t2b8..)
             -> "main.py" (blob hash: f5a1..)
             -> "utils.py" (blob hash: e8c3..)
       -> "README.md" (blob hash: d1f0..)

Change main.py -> its blob hash changes -> "src/" tree hash changes ->
root tree hash changes -> a NEW commit hash is required
(README.md and utils.py's blobs are untouched -- their hashes, and the parts
 of the tree that don't reference the changed file, stay identical, and Git
 can reuse those existing objects rather than re-storing them)
```

### 5. What This Teaches You in General

Content-addressable storage (where an object's identity IS the hash of its content) gives
automatic deduplication (identical content anywhere in history is stored exactly once) and
automatic tamper-evidence (changing anything changes every hash depending on it) for free, as a
direct structural consequence — not bolted on as separate features. This is the same underlying
idea (§26) reapplied from "detect a difference between two datasets" (the abstract framing) to
"track and verify an entire project's history" (Git's concrete application).

### 6. Interview Questions This Connects To

"How does Git know two repositories have diverged, or share common history" is answered directly
by Merkle-DAG hash comparison, top-down — the same mechanism as §26's `find_difference`. "Why does
changing one file change a commit's hash entirely" tests understanding of hash propagation up
through tree objects to the commit. "What is content-addressable storage, and what does it give
you for free" (deduplication, tamper-evidence) is a valuable, general systems-design concept this
chapter grounds concretely.

### 7. Key Takeaways

- Git's object model is a Merkle-DAG (§26) — blobs, trees, and commits are all content-addressed
  by their own hash, and a hash change propagates upward to every ancestor.
- This is exactly why identical content across history is automatically deduplicated, and why
  any tampering or corruption anywhere is immediately detectable via hash mismatch.
- Efficient sync (`git fetch`/`push`) works by comparing hashes top-down to find exactly where two
  histories diverge — the direct real-world use of §26's difference-finding algorithm.
- Content-addressable storage is a general, reusable systems idea worth naming on its own, beyond
  "how Git happens to work."

---
