## §23. API Versioning & Backward Compatibility

### 1. The Vocabulary

- **Breaking change** — a change that requires existing clients to update their code to keep
  working (removing a field, renaming a field, changing a type, changing required-ness).
- **Non-breaking (additive) change** — new optional fields, new endpoints — existing clients keep
  working unmodified.
- **Versioning strategies** — in the URL path (`/v2/users`), in a header, or via content
  negotiation; URL-path versioning is the most common because it's the most visible and simplest
  to route on.
- **Deprecation window** — the announced period during which an old version still works before
  it's actually removed.

### 2. Where It Sits, and Why Teams Use It

The moment an API has more than one consumer you don't fully control (a mobile app already
installed on users' phones, a third-party integration), you can't just change the contract and
expect everyone to update instantly. Versioning and backward compatibility exist to let the API
evolve without breaking things that are already deployed and out of your control.

### 3. What Actually Breaks

- **Removing or renaming a field "because nothing internal uses the old name anymore"** — an
  external client, an old mobile app version still in the wild, or a batch job that runs weekly
  can all be silently relying on exactly that field.
- **Changing a field's type** — turning a string ID into a numeric one, or a single value into an
  array, breaks any client that deserializes strictly.
- **No deprecation window** — flipping a switch and immediately removing an old version, instead
  of announcing a window and monitoring actual usage of the old version before removing it.
- **Confusing "I bumped the version number" with "I'm safe to make breaking changes"** — a version
  bump communicates intent, it doesn't retroactively make old clients able to handle the new
  shape; existing traffic on the old version still needs to keep working during the transition.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Adding an optional field is safe; removing, renaming, or changing the type of an existing
  field is a breaking change, full stop."
- "Before removing an old API version, I'd check actual traffic to it, not just assume it's
  unused."
- "I default to URL-path versioning for anything public-facing, since it's the most explicit and
  easiest for a consumer to understand."

### 5. Interview-Ready Answer

> "I think about every API change as breaking or non-breaking before anything else. Additive
> changes — new optional fields, new endpoints — are safe to ship without a version bump.
> Anything that removes, renames, or changes the type of an existing field needs either a new
> version or a real, monitored deprecation window, because I can't assume every consumer will
> update the moment I change something — mobile clients especially can be running old code for a
> long time after a change ships."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §23 (OpenAPI Generation & API Contracts) chapter
(OpenAPI, backward compatibility in depth); companion Software Systems Handbook's §29 (API Design
Deep Dive: REST/RPC/gRPC/GraphQL, idempotency) chapter.

---
