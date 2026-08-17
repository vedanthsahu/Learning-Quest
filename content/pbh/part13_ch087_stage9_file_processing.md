## 87. Stage 9: File Processing

### 87.1 Stage Goal

Notes have so far been pure text; a real note-taking product needs attachments. This stage adds file uploads to notes, applying this handbook's Part VI file-engineering discipline (multipart streaming, magic-byte validation, companion §41) to the capstone for the first time.

### 87.2 New Requirements

Functional: `POST /notes/{id}/attachments` accepting a file upload; attachments are listed alongside a note and can be downloaded by any space member. Non-functional: an uploaded file must be validated against its claimed type before storage (companion §41.4's magic-byte check), and must never be trusted to determine its own storage path (companion §63.5's path-traversal prevention) — both now directly relevant for the first time.

### 87.3 ADR-9: Store Attachment Bytes in PostgreSQL vs. Object Storage

**(1) Deciding:** Should attachment file bytes be stored directly in PostgreSQL (a `bytea` column) or in dedicated object storage (S3-compatible, companion §37.6)? **(2) Options considered:** (a) store file bytes directly in a database column; (b) store files in object storage, keeping only a reference (key/URL) in PostgreSQL. **(3) Tradeoffs:** Storing bytes in the database keeps everything in one system with one backup/consistency story, but bloats the database with large binary data it isn't designed to serve efficiently, and couples every attachment's storage cost and I/O pattern to the same database serving all of Fieldnote's transactional query traffic; object storage is purpose-built for large binary blobs and serves downloads without touching the database at all, at the cost of introducing a second storage system whose consistency with PostgreSQL (a reference existing in the database pointing to bytes that must also exist in object storage) must now be actively managed. **(4) Chosen:** Object storage, with only the object key stored in PostgreSQL — attachment sizes are unbounded from Fieldnote's perspective and could easily dwarf the actual note-text data the database is optimized for; this is the same underlying reasoning as companion §37.6's general storage-tier guidance, applied concretely here. **(5) Revisit when:** Never expected under Fieldnote's stated requirements — this ADR is included specifically to show that not every decision has a near-term revisit trigger; some choices are close to unconditionally correct given the stated constraints.

### 87.4 Implementation

```python
import filetype                                      # magic-byte detection, companion §41.4

ALLOWED_TYPES = {"application/pdf", "image/png", "image/jpeg"}
MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024               # companion §35.8's explicit size cap

@app.post("/notes/{note_id}/attachments", status_code=201)
async def upload_attachment(
    note_id: UUID, file: UploadFile,
    requester: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    note = await get_note_or_404(note_id, session)
    await require_space_member(note.space_id, requester, session)

    chunk = await file.read(8192)                     # read only enough to sniff the type
    detected = filetype.guess(chunk)
    if detected is None or detected.mime not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported or unverifiable file type")

    object_key = f"attachments/{note_id}/{uuid4()}"    # server-generated, never client-supplied (§63.5)
    total_bytes = len(chunk)
    async with object_storage.open_upload(object_key) as writer:
        await writer.write(chunk)
        async for more in file:                        # stream the remainder (companion §41.3)
            total_bytes += len(more)
            if total_bytes > MAX_ATTACHMENT_BYTES:
                await object_storage.abort_upload(object_key)
                raise HTTPException(status_code=413, detail="Attachment too large")
            await writer.write(more)

    attachment = AttachmentModel(id=uuid4(), note_id=note_id, object_key=object_key,
                                  content_type=detected.mime)
    session.add(attachment)
    await session.commit()
    return {"id": attachment.id, "content_type": detected.mime}
```

`object_key` is generated server-side from a fresh UUID, never derived from the client-supplied filename (companion §63.5) — the single detail that closes an entire path-traversal vulnerability class outright rather than attempting to sanitize a client-controlled path. The magic-byte check (`filetype.guess`) validates the file's *actual* content against `ALLOWED_TYPES`, not its client-declared `Content-Type` header or extension, exactly matching companion §41.4's warning that either of those can be trivially spoofed. Streaming the upload in chunks with a running `total_bytes` check (companion §35.7, §41.3) enforces `MAX_ATTACHMENT_BYTES` without ever buffering the full file in memory first — directly avoiding companion §77.2's upload-timeout failure mode by design, not as an afterthought.

### 87.5 What Changed in the Architecture

A new `AttachmentModel` and a dependency on `object_storage` (a new external system, alongside PostgreSQL, Redis, and the Celery broker) are introduced — the first stage since §82 to add an entirely new category of external dependency rather than extending an existing one, a deliberate, visible growth in Fieldnote's own infrastructure footprint that should be reflected in the deployment-readiness checklist (companion §69.4) the moment it happens, not discovered later.

### 87.6 Production Considerations

Object storage upload/download failures need their own timeout and retry discipline (companion §32.4-32.5), identical in kind to any other external dependency call — treating `object_storage.open_upload` as though it always succeeds instantly would reintroduce exactly the missing-timeout hazard companion §76's hung-worker chapter diagnoses generically.

### 87.7 Debugging

**Symptoms:** An upload of a genuinely valid PDF is rejected with a 415. **Investigation:** Confirm the first chunk read (`file.read(8192)`) is large enough to contain the file's actual magic-byte signature — some file formats' identifying bytes appear later than the very first few bytes for certain producer tools, meaning an overly small sniff window can occasionally misdetect a genuinely valid file, a real, if uncommon, false-positive risk in magic-byte validation worth explicitly acknowledging rather than treating the check as infallible.

### 87.8 Mini Lab

Attempt to upload a file with a `.pdf` extension and a spoofed `Content-Type: application/pdf` header whose actual bytes are a different format entirely (a renamed `.txt` file, for instance), and confirm the magic-byte check correctly rejects it — directly verifying that §87.4's validation checks actual content, not client-supplied metadata, exactly as companion §41.4 warns is the only safe approach.

---
