## Project 04: File Storage Service — Solution Guide

### Business Reasoning

The business need is reliable file upload and retrieval at unpredictable sizes. The genuine engineering risk here isn't the happy path — it's what happens under a large file, a malicious file, or a client lying about what it's sending. A solution that only handles small, well-behaved uploads correctly isn't actually solving this problem.

### Requirements Analysis

Three requirements interact tightly: memory-bounded handling of arbitrarily large files, content validated by actual bytes rather than claimed metadata, and durable storage that survives a restart. Each rules out a naive approach: memory-bounded rules out full-buffering; content-based validation rules out trusting the `Content-Type` header; durability rules out anything purely in-process.

### Architecture

```
Client -> [stream upload in chunks] -> [validate size + magic bytes as chunks arrive]
        -> Object Storage (durable, purpose-built for large blobs)
        -> Database stores only: {server-generated key, content-type, size, created_at}
```

### Tradeoff Discussion

**Streaming vs. buffer-then-process.** Streaming (processing each chunk as it arrives, never holding the full file in memory) is more complex to implement correctly but is the only approach that scales to large files without a memory ceiling tied to the largest file the service will ever accept. Buffer-then-process is simpler code but directly violates the stated memory-bound requirement for any sufficiently large file.

**File bytes in the primary database vs. dedicated object storage.** Storing bytes directly in the primary relational database keeps everything in one system, but bloats that database with data it isn't optimized to serve, couples file I/O load to the same database serving all transactional queries, and makes backups dramatically larger and slower for no transactional benefit (file bytes are never queried by SQL predicate). Dedicated object storage is purpose-built for exactly this access pattern (write once, read by key, large payloads) and keeps the primary database small and fast.

### Alternative Designs Considered and Rejected

**Storing files on the local server's own disk.** Rejected for anything beyond a single-instance prototype — local disk storage doesn't survive an instance being replaced or scaled horizontally (a second instance can't see the first instance's local files), directly violating the durability requirement in any realistic multi-instance deployment. **Validating file type by extension or `Content-Type` header alone.** Rejected outright — both are entirely client-controlled and trivially spoofable; the Non-Functional Requirements explicitly call out validating actual content, not claimed metadata.

### Chosen Design

Stream the upload in fixed-size chunks; sniff the file's magic bytes from the first chunk to validate its actual type; track cumulative size across chunks to enforce the maximum, aborting early if exceeded; write validated chunks directly to object storage under a fresh, server-generated random key; store only that key and metadata (never the bytes) in the primary database.

### Implementation Walkthrough

```python
import filetype

ALLOWED_TYPES = {"application/pdf", "image/png", "image/jpeg"}
MAX_BYTES = 100 * 1024 * 1024

async def upload_file(file: UploadFile, object_storage, db) -> dict:
    first_chunk = await file.read(8192)
    detected = filetype.guess(first_chunk)
    if detected is None or detected.mime not in ALLOWED_TYPES:
        raise HTTPException(415, "Unsupported or unverifiable file type")

    storage_key = f"uploads/{uuid4()}"        # server-generated, NEVER derived from client input
    total = len(first_chunk)
    async with object_storage.open_upload(storage_key) as writer:
        await writer.write(first_chunk)
        async for chunk in file:               # stream the remainder, never buffering it all
            total += len(chunk)
            if total > MAX_BYTES:
                await object_storage.abort_upload(storage_key)
                raise HTTPException(413, "File too large")
            await writer.write(chunk)

    record = await db.insert_file(key=storage_key, content_type=detected.mime, size=total)
    return {"id": record.id, "content_type": detected.mime}

async def get_file(file_id: int, object_storage, db):
    record = await db.get_file(file_id)
    if record is None:
        raise HTTPException(404, "File not found")
    return StreamingResponse(object_storage.stream_download(record.key), media_type=record.content_type)
```

`storage_key` is a fresh UUID, structurally incapable of containing a path-traversal sequence a client might otherwise supply through a file name — directly closing the challenge's third named trap. The size check happens *during* streaming, not after full receipt, so a file exceeding the limit is aborted as soon as the limit is crossed rather than after the entire, possibly enormous, file has already been received. `filetype.guess` inspects actual byte content, closing the second named trap.

### Production Improvements

Run asynchronous virus/malware scanning as a background step after upload (explicitly out of this project's scope, but worth flagging as a real next requirement) — scanning must never block the upload response itself, following the same request-path-versus-background-work separation this series' Project 06 (Background Job System) formalizes. Add a content-length pre-check from the request header as a cheap, early rejection for obviously-oversized uploads, before even beginning to stream.

### Scaling Path

Object storage systems are typically already horizontally scalable by design (this is one of their main selling points over local disk); the primary database, storing only small metadata rows, remains lightweight even as total stored-file volume grows into the terabytes, since its row count grows with file *count*, not file *size*.

### Interview Discussion

See Python Backend Engineering Handbook §94.5 for this exact system walked through the five-phase interview framework — the deep-dive phase typically centers on handling a client disconnecting mid-upload and cleaning up the resulting orphaned partial object in storage.

### Lessons Learned

The core lesson is recognizing that "store this data" is not one undifferentiated problem — large, unstructured binary blobs and small, structured, frequently-queried metadata have genuinely different storage requirements, and forcing them into the same system trades away purpose-built performance for superficial simplicity. This same "different data has different storage needs" instinct recurs directly in Project 08 (Search Service) and Project 14 (Enterprise Document Platform).

---
