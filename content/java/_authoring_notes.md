# Java Handbook — Authoring Notes (not a reader chapter)

Working notes for building a new LearningQuest book that teaches Java/Spring by
reading and linking to a real codebase, instead of an invented capstone project
like pbh/ssh/ai use. Keep this file updated as the design evolves so we don't
re-derive decisions across sessions.

## Goal

Sreedhar (Python background, wants to be equipped in Java/C++ as "core" languages
for product-company work) is learning Java from a real, finished Spring Boot
microservices repo:

    Source repo: C:\Vedanth_Space\4_ecommerce-java
    Status: final / stable — pulled from an upstream repo with 350+ commits.
            Not actively changing, so embedded snippets + line-number links
            are safe long-term (low drift risk). No need to re-verify snippets
            against the source on every session, just when a chapter is first written.

Modules in the source repo: auth-service, common-lib, favourite-service,
inventory-service, media-service, notification-service, order-service,
payment-service, product-service, promotion-service, rating-service,
search-service, shipping-service, tax-service, frontend, docker, k8s, deploy.

## Why this differs from pbh/ssh/ai

Checked pbh's Appendix C/E: those handbooks' "code" is a self-contained fictional
capstone ("Fieldnote") written inline in the markdown. Cross-references point to
internal `§section` numbers, never out to an external repo. This is genuinely new
territory for LearningQuest, not an extension of an existing pattern.

## Confirmed technical mechanism (superseded — see §"Reversal" below)

`Reader.jsx` renders every markdown link as a plain `<a href target="_blank">`
(components.a, Reader.jsx ~L383-384) — no click interception, no custom scheme
handling. A chapter *could* link straight into the real repo with zero app
changes via `vscode://file/{absolute-path}:{line}`. This is technically real
and still true — but **not what we actually use**, see below.

## REVERSAL: vscode:// links dropped, full code inlined instead

After batch 1 (front matter + Part I) was written using `vscode://` deep links,
Sreedhar tested one and gave direct feedback: he can't/doesn't want to jump out
to VS Code to see the code — "VS code is just bad idea... just copy all the
code into the page itself... doesn't matter if I am able to see the actual
code [via a link] — better to see the description/explanation and below it the
code." Scrolling for longer code blocks is explicitly fine with him.

**Batch 1 was rewritten** to drop every `vscode://` link. The pattern is now:

1. **Explanation** first (Python comparison where it genuinely helps).
2. **Full real code**, inlined directly in the chapter as a ```java block —
   not a trimmed excerpt, the *complete* file (or complete relevant class) as
   it exists in the repo. Don't summarize/truncate with `// ...` — paste it in
   full, length/scrolling is not a concern.
3. **Plain-text citation** below the code block: `**Source:** path/File.java`
   — not a link, not clickable, purely a reference in case he wants to look it
   up himself later.

This is the standing pattern for every remaining batch. Do not reintroduce
`vscode://` or any other "jump to an external tool" mechanism for this book.

## Per-chapter content pattern (current, post-reversal)

Each chapter/topic combines, in this order:
1. Explanation of the Java/Spring concept in plain prose, aimed at someone
   coming from Python.
2. The complete real source (class or file) inlined as a fenced code block —
   prefer showing the whole file over an excerpt whenever it's not
   unreasonably long; when only one method of a large, mostly-unrelated class
   is relevant, the whole class is still fine to include if already read.
3. A plain-text `**Source:** path/File.java` citation, no link.

Sreedhar's own framing on scope stays the guiding rule too: "if we are able to
explain me all concepts with an explanation and then [show] the code snippet,
this should be enough... this genuinely covers all the things one can expect
from a developer." Don't gold-plate beyond explanation + full inline code +
citation (no auto-sync scripts, no additional tooling).

## LearningQuest data.json schema (for registering the new book)

Top-level keys: `meta, quizResults, xpRules, levels, books, challengeSeries,
achievementState`.

`books[]` entry shape:
```json
{ "id": "java", "name": "...", "subtitle": "...", "color": "#hex", "parts": [...] }
```
`parts[]` entry: `{ "name": "PART N -- Title", "topics": [...] }`
`topics[]` entry:
```json
{
  "num": "1", "title": "...", "status": "not_started", "notes": "",
  "dateCompleted": null, "contentFile": "content/java/partN_chNNN_slug.md",
  "estMinutes": 7, "scrollPct": 0, "activeSeconds": 0, "highlights": []
}
```
**Decided:** followed pbh's convention (plain whole-number `num`, one topic per
file, e.g. `"0"`, `"1"`, `"2"` ...) rather than ssh's decimal-per-part scheme
(`"0.1"`, `"1.1"`) — simpler, and matches the majority of existing books. Front
matter is topic `"0"` alone, pointing at `front_matter.md`; Part I chapters are
topics `"1"` through `"6"`, one file each, matching pbh's
`partN_chNNN_slug.md` naming.

Server (`server.py`) serves anything under `content/` as static text — a file
not referenced by any topic's `contentFile` (like this one, or
`_concept_inventory.md`, or `_table_of_contents.md`) is simply inert, so it's
safe to keep authoring notes alongside real chapters.

## Status

- [x] Design agreed: explanation + real snippet + vscode deep link + plain path.
- [x] data.json schema for a new book confirmed.
- [x] Concept survey of ecommerce-java done — see `_concept_inventory.md` (~70
      concepts, real files/anchors, includes honest gaps like "no Feign client
      anywhere" and "no tests in order/product/payment-service").
- [x] Table of contents drafted — see `_table_of_contents.md` (14 parts, ~45
      topics, proposed 6-batch rollout). Sreedhar approved: proceed batch by
      batch, starting with Part 0 + Part I.
- [x] `books[]` entry added to data.json (id `"java"`, color `#ED8B00`).
      Backed up data.json to `backups/manual_pre_java_book_*.json` first.
- [x] Batch 1 written: front matter + all 6 Part I chapters
      (`part1_ch001`...`part1_ch006`), each following explanation → **full
      inlined code** → plain-text citation. Originally written with vscode://
      links; rewritten after direct feedback (see "REVERSAL" section above).
      Cross-references each other by §-number, which works automatically via
      existing `crossref.js` — no app changes needed.
- [ ] Sreedhar to confirm the rewritten batch 1 reads well in the actual
      reader UI (run.bat) — not yet confirmed.
- [x] Batch 2 written and registered: Part II (Spring Boot Foundations,
      ch007-011), Part III (DI and Layering, ch012-013), Part IV (REST APIs,
      ch014-017). Sreedhar said to keep going autonomously without asking
      after each batch ("continue till tokens are exhausted... do without
      asking, we have reviewed") — proceeding straight through batches 3-6
      without pausing for sign-off between them.
- [x] Batch 3 written and registered: Part V (JPA, ch018-022), Part VI
      (Mapping, ch023).
- [x] Batch 4 written and registered: Part VII (Security and Identity,
      ch024-028 — trimmed original ToC's 6 planned topics to 5, folding the
      planned "implementing SSO end-to-end" into what Part IV §17 already
      covered fully, to avoid duplicating the same AuthController walkthrough
      twice), Part VIII (Handling Failure, ch029-031). Ch030 found a genuine,
      verifiable bug while writing it, not a hypothetical: legacy exceptions
      like `ProductNotFoundException` aren't caught by any specific handler
      in `ApiExceptionHandler`, so they fall through to the 500 catch-all
      instead of the correct 404 — worth knowing this book does surface real
      findings, not just tutorial content.
- [x] Batch 5 written and registered: Part IX (Maven, ch032), Part X
      (Talking Between Services, ch033-038), Part XI (AOP, ch039).
- [x] Batch 6 written and registered: Part XII (Packaging and Deployment,
      ch040), Part XIII (Testing, ch041-042), Part XIV (Capstone, ch043).

## COMPLETE — full 14-part, 44-topic curriculum from `_table_of_contents.md`
is written and registered in `data.json` (verified: 44 files in
`content/java/`, 44 topics across 15 parts including front matter, file count
matches topic count exactly). Every code excerpt was read from the real repo
at write time — none invented. Ran end-to-end without stopping per Sreedhar's
instruction ("continue till tokens are exhausted... do without asking, we
have reviewed").

## Notable deviations from the original ToC (all reasoned, not arbitrary)

- Part VII trimmed from 6 planned topics to 5 — folded the planned
  "implementing SSO end-to-end" into what Part IV §17 already covered fully
  (AuthController's 3-step flow), to avoid walking the same controller twice.
  Part VII instead covers the security *mechanics* underneath that flow.
- Part VIII §30 ("Designing an Exception") turned into a genuine finding, not
  a rehash of Part I §5's style contrast: traced that legacy exceptions like
  `ProductNotFoundException` aren't caught by any specific
  `@ExceptionHandler` in `ApiExceptionHandler`, so they fall through to the
  500 catch-all instead of the correct 404 — a real, verifiable
  production-correctness gap, not hypothetical.
- Part X §38 (object storage) intentionally kept short — the full
  `S3ObjectStorageService` source was already shown in full back in Part III
  §12.3 for its constructor-injection style; §38 revisits two specific
  methods (bucket auto-creation, presigned URLs) rather than repeating the
  whole file.
- Part XIV's capstone traces the **signup** request (`AuthController.register`
  → `UserServiceImpl.register`), not "place an order" as originally sketched
  — signup is the request whose every layer (validation, uniqueness checks,
  Keycloak compensating-rollback, mapping, persistence, exception handling,
  correlation ID) had already been read in full elsewhere in the book, making
  it a stronger synthesis chapter with zero new files needed.

## Appendices A & B added post-completion

Sreedhar's feedback after finishing the 44-chapter curriculum, in two
rounds:

1. First round: the book teaches *patterns* in real code but assumes Java
   syntax fluency he doesn't have yet — wanted a plain checklist of core
   language syntax/keywords/imports to self-study externally and check off.
   Added as a single terse checklist appendix (originally "Appendix A").
2. Second round: that checklist alone was too thin — he specifically asked
   for the "niche" foundational knowledge too (JVM, `.class` compilation,
   and similar), and explicitly said this part is allowed to go **beyond**
   the ecommerce-java codebase entirely — "codebase has its own dedicated
   part, this is separate... here you can teach me anything and everything."

Resolved as **two** appendices, split by kind of content:

- **Appendix A** (`content/java/appendix_a_how_java_runs.md`) — real
  explanatory prose (matching the main chapters' depth, not checklist-only),
  entirely codebase-independent: source→bytecode→JVM execution, JIT
  compilation, JDK/JRE/JVM, stack vs heap memory, garbage collection,
  virtual threads (with a proper first-principles explanation of *why*
  `spring.threads.virtual.enabled: true` from Part II §8.2 actually helps),
  type erasure, the `Object`/`equals`/`hashCode` contract, and a note on
  Java version cadence. Each section still ends in a short checkbox list for
  self-tracking, but the teaching itself is prose, not bullet fragments.
  Cross-links forward into the main 44 chapters where a concept shows up in
  real code, but doesn't depend on the reader having read them.
- **Appendix B** (`content/java/appendix_b_syntax_checklist.md`) — the
  original terse syntax/keyword checklist, renumbered from A to B and
  lightly cross-linked into Appendix A where a bare syntax item (`==`,
  generics, `Object`) has a deeper "why" explained there.

Registered in `data.json` as `num: "A"` and `num: "B"` in that order inside
the existing `Appendix` part (matching pbh's own lettered-appendix
convention). File count vs registered-topic count re-verified after the
split (49 files in `content/java/` − 3 inert `_`-prefixed authoring files =
46, matching 46 registered topics exactly).

## IMPORTANT operational gotcha: live browser tab overwrites data.json edits

Discovered the hard way: Sreedhar had LearningQuest open in a browser tab
while actually reading (Front Matter marked done, ch1 in-progress with real
`activeSeconds`/`scrollPct`). The app autosaves periodically by POSTing its
full in-memory `data` object back to the server — so a tab that loaded
`data.json` *before* a backend edit will, on its next autosave, silently
overwrite that edit with its own stale copy of the book list. This is
exactly what happened to the first Appendix registration — it briefly
existed on disk, then vanished, with no error anywhere.

**How to apply, every time `data.json` is edited directly (not through the
app) from now on:** after the edit, tell Sreedhar to hard-reload the
LearningQuest tab (not just navigate within it) before doing anything else
in it — a reload re-fetches the current file. If a further backend edit is
needed afterward, assume the tab may be open again and repeat the warning.
Real reading progress itself is safe either way (it lives in the same
autosaved object the tab already has correctly) — it's specifically new
parts/topics added from the backend, after the tab already loaded, that are
at risk until the tab reloads.

## If resuming this work in a future session

- Read this file (`_authoring_notes.md`) and `_table_of_contents.md` first.
- The curriculum is done — future work here is likely: Sreedhar reading
  through and giving feedback on specific chapters, fixing anything he
  flags, or extending the book with new parts if he wants to go deeper on
  something (e.g. a dedicated "read this and predict the output" quiz
  chapter, or expanding Part X with the Elasticsearch/Kafka pieces that
  were only lightly touched).
- Don't re-run the concept survey — `_concept_inventory.md` already has the
  full catalog, including files that ended up unused (there was more
  material available than the 44-topic curriculum used; a "Part XV" could
  mine `_concept_inventory.md` for anything not yet cross-referenced).

## App-level change: syntax highlighting added

Sreedhar asked for Java keywords/strings/comments to be colored in code blocks.
Added `prismjs` (1.30.0, zero runtime deps) to `app-src/package.json`, a new
`app-src/src/components/CodeBlock.jsx` that tokenizes fenced code via
`Prism.highlight` and renders the token spans, wired into `Reader.jsx`'s
`components.code` for non-inline code (inline `` `code` `` spans are
untouched). Token colors in `index.css` reuse the app's existing palette
variables (`--purple` keywords, `--emerald` strings, `--cyan` class names,
`--gold` functions, `--danger` annotations, `--text-faint` comments) rather
than introducing new colors. Covers java/python/json/yaml/docker/bash — python
is the majority language across the *other* handbooks (~199 fenced blocks), so
this benefits every book, not just this one. Ran `npm run build` after, so
`dist/` (what `server.py` actually serves) is current.

## Open questions (not yet decided)

- Whether to also add a Java entry to `xpRules`/`achievementState`, or
  whether those are already book-agnostic (existing books don't seem to need
  per-book XP config, so likely no action needed — not yet verified).
