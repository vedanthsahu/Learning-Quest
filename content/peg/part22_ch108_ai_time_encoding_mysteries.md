## §108. AI, Time & Encoding Mysteries

*Format: Symptom → What's Actually Going On → The Fix → What to Say About It.*

### "RAG answer is wrong even though the document exists."

- **What's actually going on**: Almost always a retrieval failure, not a generation failure — the
  right chunk wasn't retrieved (poor chunking, embedding model not capturing the right
  similarity, or the query's phrasing not matching the stored content well), so the model
  answered without ever actually seeing the relevant content.
- **The fix**: Debug retrieval first — check what was actually retrieved for the failing query —
  before assuming the model itself is the problem; consider reranking or adjusting chunk size.
- **What to say**: "I'd treat this as a retrieval debugging problem first — check exactly what
  content was retrieved for the query before assuming it's a model quality issue."
- **See also**: §84.

### "LLM cost doubled after a prompt change."

- **What's actually going on**: A prompt edit — a longer system prompt, added context, more
  verbose few-shot examples — increased the token count of every subsequent request, and token
  count is what cost scales with directly.
- **The fix**: Review the token-count impact of the specific change; consider prompt caching for
  any large, repeated prefix.
- **What to say**: "I'd check the actual token-count difference the prompt change introduced —
  cost scales directly with tokens, so a seemingly small edit can have an outsized cost impact."
- **See also**: §83, §88.

### "Search results are missing newly-created documents."

- **What's actually going on**: The search index is a separate copy of the data from the primary
  database, and whatever's supposed to keep them in sync (a reindex trigger, a pipeline) either
  hasn't run yet or isn't wired up for this specific write path.
- **The fix**: Verify the indexing pipeline actually covers every path that creates new
  documents, and check for indexing lag/delay.
- **What to say**: "I'd check whether the write path that created this document actually
  triggers indexing, since a search index only reflects what's been explicitly synced to it."
- **See also**: §81.

### "A date is off by one day for some users."

- **What's actually going on**: A UTC timestamp converted to a user's local timezone near a
  midnight boundary can shift the displayed calendar date forward or backward relative to what's
  actually stored.
- **The fix**: Confirm storage is genuinely UTC, and that timezone conversion happens correctly
  and consistently at display time, accounting for the specific user's timezone rather than a
  server default.
- **What to say**: "This is a classic UTC-to-local conversion issue near a day boundary — I'd
  check both that storage is UTC and that display-time conversion uses the actual user's
  timezone."
- **See also**: §90.

### "Emails are landing in spam."

- **What's actually going on**: Missing or misconfigured SPF/DKIM/DMARC DNS records (the email
  authentication mechanisms that prove a message genuinely came from the domain it claims to),
  or a sending reputation issue with the sending domain/IP.
- **The fix**: Verify SPF, DKIM, and DMARC records are correctly configured for the sending
  domain; check sender reputation with the email provider.
- **What to say**: "I'd check the sending domain's SPF/DKIM/DMARC DNS records first — missing or
  misconfigured email authentication is the most common cause of legitimate mail landing in
  spam."
- **See also**: §1.

### "A string looks like garbage (mojibake) after being processed."

- **What's actually going on**: Text encoded one way (commonly UTF-8) got decoded as if it were a
  different encoding somewhere along the pipeline — often at a boundary between two systems that
  don't agree on a default encoding.
- **The fix**: Ensure UTF-8 is used consistently and explicitly at every boundary — file reads/
  writes, database connections, API calls — rather than relying on a system default that might
  differ.
- **What to say**: "This is an encoding mismatch at some boundary in the pipeline — I'd check
  where UTF-8 might not be explicitly enforced, rather than assuming a system default is
  consistent everywhere."
- **See also**: §6.

---
