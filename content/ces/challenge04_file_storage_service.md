## Project 04: File Storage Service

### Problem Statement

Users need to upload files — documents, images, occasionally large ones — and retrieve them later. The business wants this to work reliably regardless of file size, without the service crashing or slowing to a crawl on large uploads, and without accepting files that aren't what they claim to be.

### Functional Requirements

- Accept a file upload from a client and store it durably.
- Allow a previously uploaded file to be retrieved later by a stable reference.
- Reject files that exceed a maximum allowed size.
- Reject files whose actual content doesn't match an allowed set of types (e.g., only images and PDFs).

### Non-Functional Requirements

- **Memory bounds**: uploading a large file should not require holding the entire file in memory at once.
- **Correctness**: a file's type must be validated based on its actual content, not merely what the client claims it is.
- **Durability**: an uploaded file should not be lost due to a transient server restart.
- **Security**: consider what an attacker could do if they controlled the file name or storage path used to save an uploaded file.

### Project Scope

**In scope**: streaming upload handling, content-type validation, durable storage, retrieval by reference. **Out of scope**: file versioning, virus/malware scanning (acknowledge it as a real future need without building it), image resizing or transcoding, access control on who can retrieve which files.

### Engineering Questions (Answer Them Yourself First)

- If a file is 2 GB and your server has 4 GB of memory, what has to be true about how you handle the upload for it to succeed at all?
- Why might trusting a file's declared `Content-Type` header, or its file extension, be a bad idea?
- Where should the actual file bytes live — inside the same database that stores everything else about your application, or somewhere else? What's different about file bytes compared to typical database rows?
- If a client is allowed to choose the name their file is saved under, what could go wrong?

### Architecture Thinking

Sketch the path an uploaded file's bytes take from the client's request to durable storage — does your design ever require the entire file to exist in memory at any single point in that path? Consider what "validate the file type" actually requires you to look at, and when in the upload process you can look at it without having received the entire file first. Estimate: for a service expecting files up to 100 MB and moderate upload volume, does storing file bytes directly in your primary database seem reasonable, or does something about that combination feel like it wouldn't scale well?

### Progressive Hint System

**Level 1**: Consider reading a file in small chunks rather than all at once — what would you need to check as each chunk arrives, rather than waiting until the whole file has arrived? **Level 2**: Look into how file formats often have identifying byte sequences at the very start of the file (sometimes called "magic bytes") that are independent of the file's name or declared type. **Level 3**: Research streaming multipart upload handling and dedicated object storage systems (as opposed to storing binary blobs in a relational database) — consider what each is specifically optimized for. **Level 4**: A standard design streams the upload in fixed-size chunks, checking cumulative size against the limit as each chunk arrives and validating file type from the first chunk's magic bytes; the actual bytes are written to dedicated object storage (not the primary database) under a server-generated, random key, with only that key stored in the database alongside metadata.

### Common Engineering Traps

- **Reading the entire uploaded file into memory before doing anything with it** — what happens to this design under a genuinely large file, or many concurrent large uploads?
- **Trusting the client-supplied `Content-Type` header or file extension as the sole basis for type validation** — how easily can this be spoofed, and by whom?
- **Using the client-supplied file name directly as the storage path** — what specific attack does this open up, and what would a malicious file name look like?
- **Storing large binary file contents directly as rows in the same relational database used for everything else** — what does this do to that database's performance and backup size over time?

### Reflection Questions

- What would you tell a user whose upload was rejected for being too large, versus one rejected for being the wrong file type — should the error messages be different, and why?
- If your storage backend (wherever the actual bytes live) becomes temporarily unavailable mid-upload, what should the client see, and can a partial upload be safely retried?
- Is there a case where checking a file's magic bytes alone isn't sufficient to determine it's actually safe to accept? What would that require beyond this project's scope?

### Completion Checklist

- [ ] I have a design that never requires the full file to be in memory at once.
- [ ] I can explain how magic-byte validation differs from trusting a Content-Type header, and why that difference matters.
- [ ] I have a specific mechanism for generating storage paths/keys that doesn't depend on client input.
- [ ] I have decided where file bytes live versus where metadata lives, and can justify the split.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
