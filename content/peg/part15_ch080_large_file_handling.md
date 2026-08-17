## §80. Large File Handling and Signed URLs

### 1. The Vocabulary

- **Chunked/streaming upload** — sending or receiving a file in pieces rather than all at once,
  so memory usage doesn't scale with file size.
- **Streaming download** — serving a large file progressively rather than loading the whole thing
  into memory before sending any of it.
- **Signed download URL** — the download counterpart to a presigned upload URL: temporary,
  scoped access to fetch a specific private object.
- **Background processing** — for anything that needs to happen *to* an uploaded file
  (transcoding, virus scanning, thumbnail generation), doing it asynchronously after upload
  completes rather than holding up the upload response.

### 2. Where It Sits, and Why Teams Use It

Once files get large enough, "just read it all into memory and process it" stops being viable —
these are the standard patterns for handling that gracefully, both on the way in and the way out.

### 3. What Actually Breaks

- **Loading a large file entirely into memory before processing or forwarding it** — memory usage
  scales directly with file size, and enough concurrent large-file requests can exhaust available
  memory even if each individual request seems fine.
- **Synchronous processing on upload** — running virus scanning, transcoding, or thumbnail
  generation inline before responding to the upload request holds the connection open for as long
  as that processing takes; converting it to background work (§26, §42) and notifying on
  completion keeps the upload response fast.
- **Signed download URLs with no expiry, effectively permanent** — a link meant to be temporary
  that never actually expires is a long-lived exposure if it's ever shared or logged somewhere
  unintended.
- **No resumability for very large uploads** — a multi-gigabyte upload that fails at 95% and has
  to restart entirely from zero is both a poor experience and wasteful; true multipart upload
  (uploading a file in independently-retryable chunks) avoids this.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "For large files, I stream rather than buffer the whole thing in memory, on both the upload and
  download side."
- "Anything that needs to process an uploaded file happens in the background after upload
  completes, not synchronously before responding."
- "Signed download URLs get a real, short expiry — not left effectively permanent."

### 5. Interview-Ready Answer

> "The general principle for large files is: don't hold the whole thing in memory at once, on
> either side. Uploads stream or chunk rather than buffer entirely; downloads stream progressively
> rather than loading the full file before sending any of it. And anything that needs to be done
> to the file — scanning, transcoding — happens as background processing after the upload
> completes, so the upload response itself stays fast rather than waiting on that work inline."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §41 (Multipart & Streaming Uploads) chapter; this
book's own §26 (Webhooks & Async Jobs) for the background-processing pattern.

---
