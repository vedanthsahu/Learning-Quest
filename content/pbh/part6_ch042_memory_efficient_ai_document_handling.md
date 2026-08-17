## 42. Memory-Efficient Processing & AI-Oriented Document Handling

### 42.1 The Problem: This Part's Techniques, Applied to Documents Feeding an AI Pipeline Specifically

Parts VI's chapters so far have each covered a format or upload mechanism individually. A specific, increasingly common backend requirement combines nearly all of them: ingesting documents (PDFs, DOCX files, uploaded images) at scale specifically to feed a RAG pipeline (companion AI Systems Handbook §6, §23, §47) — which imposes its own particular constraints on *how* those documents should be processed, distinct from generating a one-off report or extracting a single field.

### 42.2 Engineering Constraint: A RAG Ingestion Pipeline Processes Many Documents, Not One, and Must Not Degrade Gracefully Into "Slowly"

Generating a single PDF report (§39) happens once, on demand, with a user directly waiting for the result — a document-ingestion pipeline for RAG processes potentially thousands of documents as a batch, where per-document memory and processing-time discipline compounds directly into total pipeline duration and total resource consumption. Every generator-based, chunked-processing technique this Part has developed (§3.5's memory-efficient generators, §38-41's chunked reading/streaming) is not merely good practice here — at genuine document-corpus scale, a technique that holds even one moderately-sized document fully in memory per item, multiplied across thousands of documents processed with any real concurrency, becomes a genuine, likely production-breaking memory problem.

### 42.3 Python Mechanism: A Streaming, Generator-Based Ingestion Pipeline

The correct shape for document ingestion at scale is a chain of generators (§3.5), each stage consuming and producing one document (or one chunk) at a time rather than materializing an entire batch's intermediate results as a list at any stage: a generator yielding raw document bytes one file at a time → a generator extracting text from each (using §39's PDF/DOCX extraction, or OCR/§40.4 where needed) → a generator applying the companion AI Systems Handbook's §21.6 chunking strategy to each extracted text → a final consumer embedding and indexing each chunk. At no point does the full corpus, or even one full stage's complete output, need to exist in memory simultaneously — only whichever single document or chunk is currently being processed.

### 42.4 Decision Framework: CPU-Bound Extraction Work Belongs in a Process Pool, Not Inline in an Async Ingestion Loop

Text extraction (§39.5), OCR (§40.4), and chunking are all genuinely CPU-bound operations (§9.5's category) — running them inline inside an `async def` ingestion loop risks exactly §12.2's event-loop-blocking failure if the ingestion process also needs to remain responsive to other concurrent work (an API serving status queries about ingestion progress, for instance). The correct pattern offloads the CPU-bound extraction/chunking work to a process pool (§10.6's `ProcessPoolExecutor`) or a dedicated worker fleet (§37's Celery pattern, well suited to this exact large-batch, CPU-bound, retriable workload), keeping any user-facing async application code free to remain responsive throughout a long-running ingestion job.

### 42.5 Engineering Constraint: Extraction Quality Varies by Document, and the Pipeline Must Handle That Explicitly

Not every document in a real-world corpus extracts cleanly — a scanned PDF page yields no text without OCR (§39.5, §40.4), a malformed or corrupted file may fail extraction entirely, and OCR itself (§40.4) is inherently imperfect. A production ingestion pipeline must treat per-document extraction failure as an expected, routine outcome to handle explicitly (log the failure with enough detail to investigate, skip that document, continue processing the rest of the batch) rather than letting one bad document's exception crash the entire batch ingestion job partway through — directly the same per-item failure isolation companion §36.6's message-consumer idempotency discipline models for queue processing generally, now applied to a batch-ingestion context specifically.

### 42.6 Implementation

```python
from pathlib import Path
from typing import Iterator
import logging

logger = logging.getLogger(__name__)

def iter_document_paths(corpus_dir: Path) -> Iterator[Path]:
    """Yields one file path at a time -- never lists the whole corpus into
    memory as a single collection unnecessarily (§42.3)."""
    yield from corpus_dir.rglob("*.pdf")

def extract_text_safely(path: Path) -> str | None:
    """Isolates per-document failure -- one bad file never crashes the
    whole batch (§42.5)."""
    try:
        return extract_text_from_uploaded_pdf(path.read_bytes())  # §39.7
    except Exception as exc:
        logger.warning("extraction failed for %s: %s", path, exc)
        return None

def chunk_text(text: str, chunk_size: int = 500) -> Iterator[str]:
    """A minimal fixed-size chunker (companion AI Systems Handbook §21.6
    covers real chunking strategies in depth) -- also a generator."""
    words = text.split()
    for i in range(0, len(words), chunk_size):
        yield " ".join(words[i : i + chunk_size])

def ingest_corpus(corpus_dir: Path, embed_and_index_fn) -> dict:
    stats = {"processed": 0, "failed": 0, "chunks_indexed": 0}

    for path in iter_document_paths(corpus_dir):   # ONE path at a time
        text = extract_text_safely(path)             # ONE document's text
        if text is None:
            stats["failed"] += 1
            continue

        for chunk in chunk_text(text):                # ONE chunk at a time
            embed_and_index_fn(chunk, source=str(path))
            stats["chunks_indexed"] += 1

        stats["processed"] += 1

    return stats

def extract_text_from_uploaded_pdf(file_bytes): ...
```

Every function in this pipeline is either a generator (`iter_document_paths`, `chunk_text`) or processes exactly one item per call (`extract_text_safely`) — at no point does `ingest_corpus` hold more than one document's raw bytes, one document's extracted text, or one chunk in memory simultaneously, regardless of whether the corpus contains ten documents or ten thousand (§42.3). `extract_text_safely`'s `try`/`except` explicitly isolates one document's extraction failure from the rest of the batch (§42.5) — `ingest_corpus` continues processing every remaining document even after logging a failure, rather than letting one bad PDF abort the entire run.

### 42.7 Production Considerations

An ingestion pipeline's failure statistics (`stats["failed"]` in §42.6) should be surfaced explicitly, not just logged — a batch ingestion job reporting "10,000 documents processed" without also prominently reporting "500 failed extraction" hides a real, potentially significant gap in RAG corpus coverage (companion AI Systems Handbook §34's retrieval-quality diagnostics depend directly on knowing what's actually in the index, and a silently-incomplete ingestion is a common, easy-to-miss root cause of "the RAG system doesn't know about X" complaints that trace back not to a retrieval problem at all, but to an ingestion failure nobody surfaced). For a genuinely large corpus, ingestion should itself be **resumable** — tracking which documents have already been successfully processed (a simple database table or a checkpoint file) so that a pipeline interrupted partway through (a crash, a deliberate restart) can resume from where it left off rather than reprocessing an entire large corpus from scratch, directly the same resumability discipline this very handbook's own multi-session authoring process (via its `TASK_LIST.md` files) has depended on throughout.

### 42.8 Debugging

**Symptoms:** A RAG feature's retrieval quality is poor specifically for a known subset of source documents that should be covered; an ingestion job's memory usage grows steadily over the course of a long-running batch rather than staying roughly constant. **Investigation:** For the retrieval-quality gap, check the ingestion pipeline's own failure log/stats for that specific subset of documents (§42.5-42.7) before assuming the problem is retrieval-algorithm-level (companion AI Systems Handbook §34.5's exact "check retrieval recall first" diagnostic, extended one step further back to "check ingestion completeness first"). For growing memory usage, check every pipeline stage for a spot where a list or accumulator is being built up across the entire batch rather than processed and discarded per-item (a common regression: an early version's generator-based design later "optimized" by someone collecting results into a list for convenience, unintentionally reintroducing §42.2's exact problem). **Root cause:** Silent, unsurfaced ingestion failures for specific documents; a non-generator, list-accumulating stage reintroduced into what should be an entirely streaming pipeline. **Fix:** Surface ingestion failure statistics prominently and investigate the specific failing documents' extraction path; audit every pipeline stage to confirm it genuinely processes one item at a time with no full-batch accumulation anywhere in the chain.

### 42.9 Interview Thinking

"How would you build a pipeline to ingest ten thousand PDF documents into a search index without running out of memory?" is testing whether the generator-chain pattern (§42.3) is your default architecture, with explicit per-document failure isolation (§42.5) raised unprompted — a strong answer also distinguishes the CPU-bound extraction/chunking stages from the pipeline's overall orchestration, correctly proposing a process pool or worker fleet (§42.4) for the former while keeping the latter simple and responsive.

### 42.10 Mini Lab

Using a small local directory of a few PDF files (including at least one deliberately corrupted or non-PDF file renamed with a `.pdf` extension, to simulate a real extraction failure), implement §42.6's full pipeline. Confirm the corrupted file is caught and logged without crashing the run, and that `stats` correctly reports both processed and failed counts. Then add a simple memory-usage print (or use a memory profiler, companion §54) at the start and end of `ingest_corpus` and confirm memory usage doesn't grow proportionally with the number of documents processed, directly verifying the streaming, non-accumulating design.

---
