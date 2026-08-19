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
- [ ] Batch 2 (Part II - IV: Spring Boot, DI, REST) — not started. Use the
      post-reversal pattern from the start, no vscode:// links.
- [ ] Batches 3-6 — not started.

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
