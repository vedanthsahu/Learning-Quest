## 39. Documents: PDF, DOCX & PPTX

### 39.1 The Problem: Generating and Reading Human-Facing Documents Programmatically

Beyond structured data interchange (§38), backends commonly need to produce genuinely human-facing documents — a generated invoice PDF, a booking confirmation letter, an exported report as a Word document — and, less commonly but still regularly, extract information *from* uploaded documents a user provides. This handbook's own build pipeline (the exact `python-docx`-based scripts used to compile the companion Software Systems and AI Systems handbooks into Word documents) is itself a direct, concrete instance of the mechanism this chapter describes.

### 39.2 Python Mechanism: PDF Generation — Two Genuinely Different Approaches

**Direct PDF construction** (via `reportlab` or similar) builds a PDF programmatically, element by element (text at a specific position, a table, an image) — precise control, but verbose for anything beyond simple, template-like documents. **HTML-to-PDF rendering** (via `weasyprint` or similar) lets you design a document as an HTML/CSS template — often far faster to develop and iterate on, especially for anything with real visual design requirements, since HTML/CSS's layout capabilities (companion frontend-adjacent skills) are far richer than most direct-construction APIs' primitives, at the cost of an additional rendering-engine dependency and less pixel-precise control over edge cases than direct construction offers.

### 39.3 Decision Framework: Template-Based Generation Scales Better Than Hard-Coded Layout Code

For any document generated repeatedly with the same overall structure and varying data (a booking confirmation, an invoice), separating the *template* (the fixed layout and styling) from the *data* (the specific booking's details) — using a templating engine (Jinja2, directly the same engine underlying the actual Seat Management backend's `templates/email/*.html` files) rather than hard-coding string concatenation or element-by-element construction inline in Python — keeps the visual design changeable without touching the generation logic, and keeps the generation logic simple and stable even as the template's design evolves independently.

### 39.4 Python Mechanism: `python-docx` — Structural, Not Visual, Document Construction

`python-docx` builds a `.docx` file by adding structural elements (headings, paragraphs, tables, runs of styled text) to a `Document` object — directly the mechanism this very handbook's own `build_docx.py` scripts use, converting markdown source into a structured Word document programmatically. Understanding this library concretely (rather than treating "generate a Word document" as an opaque, one-off task) is exactly what this handbook's whole authoring pipeline has already demonstrated in practice across three separate large documents built this way.

### 39.5 Engineering Constraint: Extracting Text From an Uploaded PDF Is Fundamentally Harder Than Generating One

Generating a PDF, you control the exact structure. Extracting text *from* an arbitrary, uploaded PDF is a fundamentally harder, less reliable problem — a PDF's internal representation describes where to draw each character visually, not a clean, structured text stream, meaning extraction libraries (`pypdf`, `pdfplumber`) must reconstruct reading order and paragraph/table structure heuristically, and this reconstruction can fail or produce garbled results for PDFs with complex layouts, multi-column text, or (companion AI Systems Handbook §40's document-handling chapter develops this further) scanned image-based PDFs containing no extractable text at all, requiring OCR (§40) instead.

### 39.6 Tradeoff: PPTX Generation Follows DOCX's Structural Pattern, With Slide-Specific Concerns

`python-pptx` mirrors `python-docx`'s structural-construction approach (§39.4), adding slides, then shapes/text boxes/tables within each slide — the specific added complexity is layout: a slide has fixed physical dimensions, and content must be explicitly positioned (or placed into predefined placeholder regions from a slide layout/template) rather than flowing naturally the way a Word document's paragraphs do, making template-based generation (starting from a pre-designed `.pptx` template file and populating its existing placeholders, rather than constructing every slide's layout from scratch in code) the practical default for any real, visually-polished PPTX generation need.

### 39.7 Implementation

```python
from docx import Document
from docx.shared import Pt, RGBColor

def generate_booking_confirmation_docx(booking: dict) -> bytes:
    doc = Document()
    doc.add_heading("Booking Confirmation", level=1)

    p = doc.add_paragraph()
    p.add_run(f"Booking ID: ").bold = True
    p.add_run(booking["booking_id"])

    p = doc.add_paragraph()
    p.add_run(f"Seat: ").bold = True
    p.add_run(booking["seat_code"])

    p = doc.add_paragraph()
    p.add_run(f"Date: ").bold = True
    p.add_run(str(booking["booking_date"]))

    import io
    buffer = io.BytesIO()
    doc.save(buffer)                    # save to an in-memory buffer, not
    return buffer.getvalue()             # a file on disk (§39.8)


import pdfplumber

def extract_text_from_uploaded_pdf(file_bytes: bytes) -> str:
    import io
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()   # can legitimately return None
            if page_text:                       # for an image-only page (§39.5)
                text_parts.append(page_text)
    return "\n".join(text_parts)
```

`generate_booking_confirmation_docx` builds the document structurally (headings, styled paragraph runs), directly the same technique this handbook's own build pipeline uses at much larger scale, and saves to an in-memory `BytesIO` buffer rather than a temporary file on disk — directly relevant for a FastAPI endpoint that needs to return the generated document as a download response without ever touching the filesystem. `extract_text_from_uploaded_pdf`'s explicit `if page_text:` check handles §39.5's real failure mode directly: a scanned, image-only page returns `None` from `extract_text()`, and code that doesn't guard against this will crash on the first such page rather than handling it gracefully (or routing it to OCR instead, companion AI Systems Handbook §40).

### 39.8 Production Considerations

Generating documents in-memory (`BytesIO`, as in §39.7) rather than writing to and reading from temporary files on disk is both faster (no filesystem I/O) and avoids a real production cleanup concern — temporary files that aren't reliably deleted (especially on an error path that skips cleanup, directly companion §3.2's context-manager guaranteed-cleanup principle, applicable here too) accumulate and consume disk space over time in a way that's easy to overlook until a service unexpectedly runs low on disk. PDF text extraction quality should never be assumed reliable for arbitrary user-uploaded content — production code processing extracted text (for search indexing, for feeding into further processing) should validate that meaningful text was actually extracted (not empty, not obviously garbled) and have an explicit fallback or error path for documents that fail extraction, rather than silently propagating an empty or corrupted result downstream.

### 39.9 Debugging

**Symptoms:** A generated Word document opens correctly but appears empty, or with only partial content, for reports involving certain kinds of data; text extraction from a specific category of uploaded PDF consistently returns empty or near-empty results. **Investigation:** For document-generation issues, check whether the code correctly saves to the buffer/file only *after* all content has been added (a `doc.save()` called prematurely, or content added after the save call, is a common ordering mistake). For extraction issues, check whether the specific failing PDFs are scanned/image-based (no genuine text layer at all) rather than a bug in the extraction code itself — this is expected, correct behavior for that document type, not a defect. **Root cause:** Incorrect operation ordering around document construction/saving; or a fundamental mismatch between what text extraction can do (extract existing text) and what the specific document actually contains (no text layer, only images of text). **Fix:** Correct the construction/save ordering; for genuinely image-based PDFs, route them through OCR (companion AI Systems Handbook §40) instead of plain text extraction, which cannot succeed on them regardless of how it's implemented.

### 39.10 Interview Thinking

"How would you generate a PDF invoice from booking data?" is testing whether you propose a template-based approach (§39.2-39.3) for a repeatedly-generated, structurally-consistent document, rather than hard-coding element positions for every field — a strong answer also distinguishes generation (reliable, fully controlled) from extraction (§39.5, inherently heuristic and less reliable) if the conversation touches both directions, since conflating their reliability is a common, telling mistake.

### 39.11 Mini Lab

Implement `generate_booking_confirmation_docx` as in §39.7 and confirm the resulting bytes open correctly as a valid `.docx` file. Then take any locally-available multi-page PDF (a genuine text-based one, not scanned) and run `extract_text_from_uploaded_pdf` against it, confirming meaningful text is returned per page — then, if you have access to a scanned/image-based PDF for comparison, run the same function against it and observe the `None`/empty-text behavior §39.5 predicts, directly experiencing the extraction-reliability gap yourself.

---
