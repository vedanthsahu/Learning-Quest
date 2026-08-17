## §79. File Uploads Done Right: Multipart, Limits, Presigned URLs

### 1. The Vocabulary

- **Multipart upload** — an HTTP request format allowing a file (plus other form fields) to be
  sent as part of the request body; also refers to splitting one large file into multiple parts
  uploaded separately (used for very large object storage uploads).
- **File size limit** — a hard cap enforced before or during upload, protecting both storage and
  memory.
- **Presigned URL** — a time-limited, signed URL letting a client upload (or download) directly
  to/from object storage, without the request having to pass through your own application server
  at all.

### 2. Where It Sits, and Why Teams Use It

Handling file uploads directly through your own backend (receiving the whole file, then
forwarding it to storage) works fine for small files but doesn't scale well; presigned URLs let
the client talk directly to storage, keeping your application server out of the data path
entirely.

### 3. What Actually Breaks

- **No size limit on an upload endpoint** — a single very large file (accidental or malicious) can
  exhaust memory or disk on the receiving server if it's buffered through the application at all.
- **Routing every upload through the application server "for simplicity"** — works until upload
  volume or file size grows, at which point application server resources (memory, bandwidth,
  request duration) become the bottleneck for something that didn't need to touch application
  logic at all.
- **A presigned URL with too generous an expiry or too broad a scope** — a presigned URL that
  lasts far longer than needed, or grants more access than the specific upload/download it was
  meant for, is a real exposure window if it leaks (appears in a log, gets shared accidentally).
- **Not validating the uploaded file after it arrives** — a presigned-URL upload bypasses your
  application entirely during the upload itself, which means validation (file type, size, content
  scanning) has to happen as a *separate* step after the fact, not assumed to have happened
  during upload.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "For anything beyond small, occasional uploads, I'd use presigned URLs so the client uploads
  directly to storage, keeping the application server out of the data path."
- "I enforce a size limit before or during upload, not just hope files stay small."
- "Presigned URLs get the shortest reasonable expiry and the narrowest scope for the specific
  operation they're meant for."

### 5. Interview-Ready Answer

> "My default for file uploads beyond trivial size or volume is a presigned URL — the client
> uploads directly to object storage, and my application server never has to buffer or proxy the
> file at all. The two things I'm careful about: the presigned URL gets a short expiry and narrow
> scope, and because validation can't happen during a direct-to-storage upload, I have a separate
> step afterward that checks file type, size, and content before treating the upload as
> legitimate."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §41 (Multipart & Streaming Uploads) chapter;
companion Cloud Engineering Playbook's §4 (S3) chapter (presigned URLs in full).

---
