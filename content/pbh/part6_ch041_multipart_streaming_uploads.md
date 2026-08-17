## 41. Multipart & Streaming Uploads

### 41.1 The Problem: A File Upload Is Not Just a Large JSON Body

A file upload (the actual Seat Management backend's floor-layout SVG upload, via `UploadFile`/`Form` in `floor_layouts.py`, is a direct concrete instance) has real characteristics ordinary JSON request bodies don't: it can be large (megabytes to gigabytes), it's typically submitted alongside other, smaller form fields (a layout name, a site ID) in the same request, and — critically — it should never require buffering the *entire* file into memory before an application can start doing anything with it, exactly companion §3.5's memory-efficiency principle applied specifically to the upload path.

### 41.2 Python Mechanism: `multipart/form-data` — The Standard Encoding for Mixed File-and-Field Uploads

**`multipart/form-data`** is the standard HTTP encoding for a request body containing one or more files alongside ordinary form fields — the body is divided into distinct "parts," each with its own headers (identifying whether it's a file or a plain field, and the file's original filename/content-type if applicable) separated by a boundary marker. FastAPI's `File(...)` and `Form(...)` parameter types (directly used throughout the actual backend's `create_floor_layout_route`) parse this encoding automatically, giving the route handler already-separated access to each file and each ordinary field without manual parsing.

### 41.3 Engineering Constraint: `UploadFile` Is Backed by a Spooled Temporary File, Not Fully Loaded Into Memory

FastAPI's `UploadFile` object doesn't load the entire uploaded file into memory as a Python bytes object immediately — internally, it uses a **spooled temporary file** (held in memory up to a configurable size threshold, automatically spilling to disk beyond that) specifically so that a large upload doesn't risk exhausting application memory the way a naive `bytes`-based approach would. This is precisely why `await upload_file.read()` (reading the whole thing into memory as `bytes`) should be used deliberately, only when the file is known to be reasonably small, and why `await upload_file.read(chunk_size)` in a loop (processing the upload in bounded chunks) is the correct pattern for genuinely large files.

### 41.4 Decision Framework: Stream Directly to Final Storage, Don't Buffer-Then-Forward

For a large upload destined for object storage (companion §37.5), the correct pattern streams chunks directly from the incoming request to the destination (many object-storage client libraries support a streaming/multipart upload interface accepting a file-like object or an iterator of chunks) rather than fully reading the upload into memory *and then* fully writing it out to storage as a second, separate step — the two-step buffer-then-forward approach doubles the memory footprint needed at any given moment (the full file held in memory, plus whatever the outbound write itself buffers) for no benefit, when a direct, chunked pass-through achieves the same result with a small, bounded memory footprint regardless of the file's actual total size.

### 41.5 Python Mechanism: Validating an Upload's Actual Content, Not Just Its Declared Type

A client-supplied `content-type` header or filename extension is, exactly like §38.9 warned for any uploaded file, not trustworthy on its own — a malicious or simply mistaken upload can declare `image/png` while actually containing something else entirely. Validating an upload's actual content — checking the file's **magic bytes** (a format's characteristic leading byte sequence, e.g., PNG files always begin with a specific 8-byte signature) via a library like `python-magic`, rather than trusting the declared content-type alone — is the correct, defensive validation approach for any upload whose type matters for subsequent processing or security decisions (companion §62's secure-file-upload chapter develops this further as a core security control, not merely a data-quality one).

### 41.6 Implementation

```python
from fastapi import FastAPI, UploadFile, File, Form, HTTPException

app = FastAPI()

CHUNK_SIZE = 1024 * 1024   # 1 MB per chunk
MAX_UPLOAD_SIZE = 50 * 1024 * 1024   # 50 MB hard limit

@app.post("/admin/floor-layouts")
async def upload_layout(
    file: UploadFile = File(...),
    layout_name: str = Form(...),
):
    total_read = 0
    chunks = []

    while True:
        chunk = await file.read(CHUNK_SIZE)   # §41.3: bounded-size reads,
        if not chunk:                          # never the whole file at once
            break
        total_read += len(chunk)
        if total_read > MAX_UPLOAD_SIZE:        # explicit size cap, checked
            raise HTTPException(413, "File too large")  # DURING streaming,
                                                            # not only after
                                                            # fully receiving
                                                            # an oversized file
        chunks.append(chunk)

    content = b"".join(chunks)

    # Validate ACTUAL content, not just the declared filename/content-type
    # (§41.5) -- SVG files are XML-based and should start with recognizable
    # markers; a real implementation would check this more rigorously.
    if not content.strip().startswith((b"<?xml", b"<svg")):
        raise HTTPException(400, "File does not appear to be a valid SVG")

    # In production: stream `content` (or, better, stream chunks directly
    # as they arrive) to object storage here (§41.4, companion §37.5).
    return {"layout_name": layout_name, "size_bytes": total_read}
```

The `while True` loop reading `CHUNK_SIZE` at a time, checking `total_read` against `MAX_UPLOAD_SIZE` on every iteration, means an oversized upload is rejected *during* streaming, as soon as the limit is crossed, rather than only after the entire (potentially very large) file has already been fully received — a meaningful difference for both memory usage and how quickly a client gets rejection feedback. The final content-validation check (looking for actual SVG/XML markers rather than trusting the filename) directly demonstrates §41.5's magic-bytes-style validation principle, even in this simplified form.

### 41.7 Production Considerations

`MAX_UPLOAD_SIZE` enforcement should exist at *multiple* layers, not just application code — a reverse proxy or load balancer in front of the application (companion §28) commonly has its own configurable maximum request body size, and setting this at the proxy layer rejects oversized uploads before they ever consume application-server resources at all, a meaningfully cheaper rejection point than letting the request reach the application first. Upload endpoints are a common target for abuse (a client repeatedly uploading large files to exhaust storage or bandwidth) — rate limiting (companion §61) specifically scoped to upload endpoints, potentially with a stricter limit than ordinary API endpoints given the larger resource cost per request, is a standard, deliberate hardening measure worth applying explicitly rather than relying on the same generic rate limit as low-cost read endpoints.

### 41.8 Debugging

**Symptoms:** A large file upload consistently fails or times out, while smaller uploads succeed reliably; an application's memory usage spikes noticeably and unpredictably correlated with upload traffic. **Investigation:** For large-upload failures, check for a request-body size limit at any layer (reverse proxy, load balancer, application) lower than the actual file sizes being uploaded, and check the request timeout configuration against how long a large upload realistically takes on typical client bandwidth. For memory spikes, check whether upload-handling code reads the entire file into memory at once (`await file.read()` with no chunk size) rather than processing it in bounded chunks (§41.3-41.4). **Root cause:** A body-size or timeout limit misconfigured for the application's actual expected upload sizes; unbounded, whole-file memory buffering during upload processing. **Fix:** Align body-size and timeout limits across every layer (proxy, application) with actual expected upload sizes; convert whole-file-buffering upload code to chunked, bounded-memory processing.

### 41.9 Interview Thinking

"How would you handle a user uploading a very large video file without running out of memory?" is testing whether chunked, streaming processing (§41.3-41.4) is your default answer rather than `file.read()` followed by in-memory processing — a strong answer explicitly names the specific mechanism (bounded-size reads in a loop, streaming directly to destination storage rather than buffer-then-forward) rather than a vague "stream it" without describing the actual implementation shape.

### 41.10 Mini Lab

Implement §41.6's `upload_layout` endpoint and test it with a small, valid SVG-like file (confirming success), a file exceeding `MAX_UPLOAD_SIZE` (confirming rejection, and — using a debugger or print statements — confirming the rejection happens partway through streaming rather than only after fully receiving the file), and a file with a `.svg`-looking filename but non-SVG content (confirming the content-validation check correctly rejects it despite the misleading filename).

---
