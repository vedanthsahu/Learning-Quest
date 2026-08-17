## 40. Images, OCR, Audio & Video for Backend Engineers

### 40.1 The Problem: Media Files Have Their Own Cost Structure, Distinct From Text-Based Documents

Images, audio, and video files are typically much larger than the structured/text documents §38-39 covered, and processing them (resizing an uploaded profile photo, transcribing an audio note, extracting a video thumbnail) is typically far more CPU- or GPU-intensive than parsing text — meaning the concurrency and resource-management lessons from Part II (especially §10's multiprocessing for genuinely CPU-bound work) apply here with real, immediate consequence, not as an abstract concern.

### 40.2 Python Mechanism: `Pillow` for Image Manipulation — Resize, Format Conversion, and Metadata Stripping

`Pillow` (the standard Python imaging library) handles the common backend image needs directly: resizing (generating a thumbnail from an uploaded photo), format conversion (accepting various uploaded formats but standardizing storage on one), and — a real, easy-to-overlook security/privacy concern — **stripping EXIF metadata**, which can contain a photo's GPS coordinates, device information, and timestamp, none of which should be silently re-served to other users unless explicitly intended.

### 40.3 Decision Framework: Resize/Process Images Asynchronously, Never Inline in the Upload Request's Response Path

Image processing (resizing, format conversion) is CPU-bound work (§9.5's category, not I/O-bound) — doing it synchronously inline within an upload request handler either blocks the event loop directly (§12.2's exact failure mode, for a naive synchronous Pillow call inside `async def`) or, even if offloaded via `run_in_executor` (§11.5), adds real, possibly substantial latency to the upload response the user is waiting on. The better pattern: accept and store the original upload quickly, then process it (generate thumbnails, strip metadata) asynchronously via a background task or queue (§37.2's Celery pattern is the natural fit here), returning the original upload's acceptance immediately and making processed variants available shortly after, rather than making the user wait for processing to complete before their upload is acknowledged at all.

### 40.4 Python Mechanism: OCR — Extracting Text From Images, Genuinely Different From §39.5's PDF Text Extraction

**OCR (Optical Character Recognition)** — via `pytesseract` (a Python wrapper around the Tesseract OCR engine) or a cloud OCR API — extracts text from an image by genuinely recognizing character shapes, a fundamentally different and less reliable process than §39.5's PDF text extraction (which, for a text-based PDF, reads an actual embedded text layer rather than recognizing shapes at all). OCR accuracy depends heavily on image quality (resolution, contrast, skew/rotation) — production OCR pipelines commonly include an explicit image-preprocessing step (deskewing, contrast enhancement) specifically to improve recognition accuracy before the OCR engine itself runs, and should always treat OCR output as probabilistic/imperfect rather than guaranteed-correct, directly the same "treat as untrusted/imperfect" discipline the companion AI Systems Handbook applies to model outputs generally.

### 40.5 Engineering Constraint: Audio and Video Processing Almost Always Delegates to `ffmpeg`

Python itself provides no native audio/video codec support — nearly every Python audio/video library (`moviepy`, `pydub`) is ultimately a wrapper invoking the external `ffmpeg` binary as a subprocess to do the actual encoding/decoding/transcoding work. This matters directly for deployment: `ffmpeg` must be installed and available in the runtime environment (a container image, a server), a genuine infrastructure/deployment dependency distinct from a pure `pip install`, and a common source of "works locally, fails in production" issues when a deployment environment lacks it.

### 40.6 Decision Framework: Audio Transcription — Local Model vs. Cloud API

Transcribing audio to text (a voicemail transcription, a meeting-recording summary feature, directly connecting to the companion AI Systems Handbook's speech-to-text discussion in its meeting-assistant worked example) can be done via a locally-run model (Whisper and similar) or a cloud transcription API — the same capability/cost/latency/data-residency tradeoff the companion AI Systems Handbook's §1.5 triangle establishes generally: a local model avoids sending potentially sensitive audio to a third party and avoids per-call API cost, at the cost of needing real compute capacity (often GPU, companion AI Systems Handbook §11) to run at acceptable speed and quality; a cloud API is simpler to integrate and typically higher-accuracy out of the box, at the cost of ongoing per-use expense and a genuine data-residency/privacy consideration for sensitive audio content.

### 40.7 Implementation

```python
from PIL import Image, ExifTags
import io

def process_uploaded_image(file_bytes: bytes, max_dimension: int = 800) -> bytes:
    img = Image.open(io.BytesIO(file_bytes))

    # Strip EXIF metadata (§40.2) -- re-saving without exif= drops it
    img = img.convert("RGB")            # also normalizes format quirks
                                          # (e.g. some PNGs/GIFs have modes
                                          # that don't re-save cleanly as JPEG)

    img.thumbnail((max_dimension, max_dimension))   # resizes IN PLACE,
                                                       # preserving aspect ratio

    output = io.BytesIO()
    img.save(output, format="JPEG", quality=85)       # no exif= kwarg passed
    return output.getvalue()                            # -> metadata is gone


import pytesseract
from PIL import Image as PILImage

def ocr_extract_text(image_bytes: bytes) -> str:
    img = PILImage.open(io.BytesIO(image_bytes))
    # Basic preprocessing improves accuracy (§40.4) -- a real production
    # pipeline would do more (deskew, contrast enhancement).
    img = img.convert("L")          # grayscale
    return pytesseract.image_to_string(img)
```

`process_uploaded_image` resizes via `.thumbnail(...)` (which preserves aspect ratio automatically, unlike a naive fixed-dimension `.resize()`) and, by re-saving through `img.save(..., format="JPEG", quality=85)` without explicitly passing along the original EXIF data, produces an output file with no embedded metadata — directly closing §40.2's privacy gap as a side effect of the normal resize operation, not a separate step. `ocr_extract_text`'s grayscale conversion is a minimal instance of §40.4's preprocessing-improves-accuracy principle; `pytesseract.image_to_string` should always have its output treated as a best-effort, imperfect result in any downstream code consuming it.

### 40.8 Production Considerations

Media-processing tasks (resize, transcode, OCR) should be explicitly resource-bounded — an unbounded number of concurrent, CPU-heavy processing tasks can exhaust available CPU/memory the same way any unbounded concurrent workload can (companion §15.6's backpressure principle, applied here specifically), making a bounded worker pool or queue-based processing (§37.2's Celery pattern, with an explicit, deliberately-sized worker count) the correct production pattern rather than processing every upload's media inline and unboundedly concurrently. `ffmpeg`'s availability (§40.5) should be verified explicitly as part of a deployment's startup health check or build validation — discovering it's missing only when the first user tries to upload a video, in production, is a preventable, avoidable failure mode.

### 40.9 Debugging

**Symptoms:** An image-processing feature works in local development but fails in a deployed container with an obscure codec or library error; OCR accuracy is noticeably poor specifically for a certain category of uploaded images (photos of documents versus clean scans). **Investigation:** For the deployment failure, check whether the container image actually includes required system-level dependencies (`ffmpeg`, or Tesseract's own binary for `pytesseract`, which — unlike a pure-Python `pip` package — requires a separate system-level installation) rather than assuming a `pip install` alone is sufficient. For poor OCR accuracy, check the specific images' quality characteristics (resolution, skew, lighting) against §40.4's accuracy-affecting factors. **Root cause:** A missing system-level (non-pip-installable) dependency in the deployment environment; genuinely poor input image quality that no amount of OCR-engine tuning alone can fully overcome without preprocessing. **Fix:** Add the required system-level dependencies explicitly to the container image/deployment environment and verify via a startup check; add an explicit image-preprocessing step (deskew, contrast/brightness normalization) before OCR for user-uploaded, non-scanner-quality images specifically.

### 40.10 Interview Thinking

"A user uploads a large image, and you need to generate a thumbnail without slowing down their upload response" is testing whether you propose asynchronous, decoupled processing (§40.3) — accept and acknowledge the upload fast, process the thumbnail afterward via a background task or queue — rather than processing inline and making the user wait for CPU-bound work to finish before their request even completes.

### 40.11 Mini Lab

Implement `process_uploaded_image` as in §40.7 against a real photo file that has EXIF metadata (most phone camera photos do). Before processing, inspect and print the original file's EXIF data (Pillow's `img._getexif()` or `img.getexif()`); after processing, confirm the output file has no EXIF data at all. Separately, run `ocr_extract_text` against a clear, high-contrast image containing text and confirm reasonable extraction accuracy, then against a low-quality or skewed version of similar text and observe the accuracy degradation §40.4 predicts.

---
