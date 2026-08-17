## 38. Structured Data Formats: CSV, Excel, JSON, XML & ZIP

### 38.1 The Problem: Backends Constantly Exchange Data With Systems That Don't Speak Your Internal Models

A backend regularly needs to import data from an external source (a bulk user-upload CSV, an Excel export from a client's HR system) or export data to one (a downloadable report, a data feed for a partner integration) — none of these external systems know or care about your internal Pydantic models (§21) or database schema (§24); they speak a small number of standardized interchange formats, and a backend engineer needs fluency in reading and writing each one correctly, including their specific, non-obvious failure modes.

### 38.2 Python Mechanism: CSV — Simple in Concept, Genuinely Tricky in Practice

Python's built-in `csv` module handles the format's real subtleties correctly where naive string-splitting (`line.split(",")`) fails: a field containing a comma, a quote character, or an embedded newline, all legal within a properly-quoted CSV field. **Never** parse or generate CSV via manual string splitting/joining — every one of these edge cases will eventually appear in real data (a guest's organization name containing a comma is not a hypothetical, it's a near-certainty at any real scale), and the `csv` module already handles all of them correctly.

### 38.3 Decision Framework: `csv.DictReader`/`DictWriter` Over Raw List-Based Rows

`csv.reader`/`csv.writer` operate on plain lists of values, positionally — fragile the moment column order changes or a column is added/removed, since code reading `row[3]` has no self-documenting connection to which actual field that index represents. `csv.DictReader`/`DictWriter` read/write using the header row as field names, making code reference `row["email"]` instead of `row[3]` — meaningfully more robust to column reordering and self-documenting at the call site, and the correct default choice for nearly all real backend CSV handling.

### 38.4 Python Mechanism: Excel Files Are a Genuinely Different, More Complex Format Than CSV

An `.xlsx` file is not "CSV with extra formatting" — it's a structured, zip-based container (§38.7 develops ZIP's role directly) holding multiple worksheets, cell-level formatting, formulas, and data types richer than CSV's plain text. `openpyxl` (or `pandas` with its Excel-reading support, common for data-heavy backend work) is required to read/write `.xlsx` correctly — a critical, easy-to-miss engineering fact: an Excel *formula* cell's underlying value versus its last-computed display value are genuinely different things to read depending on which library mode you use, and reading the wrong one (computed value expected, but the library returns the formula string, or vice versa) is a common, confusing source of bugs when processing user-uploaded spreadsheets.

### 38.5 Python Mechanism: JSON's Native Type Gaps — Dates, Decimals, and `NaN`

JSON has no native date/datetime type (Python's `json` module raises `TypeError` on a bare `datetime` object unless given a custom serializer), no native arbitrary-precision decimal type (financial amounts should generally use `Decimal`, not `float`, and JSON's number type doesn't distinguish them), and technically-invalid-but-commonly-emitted values like `NaN`/`Infinity` that some JSON parsers accept non-standardly and others reject outright. Pydantic (§21) handles the datetime and Decimal serialization gap automatically and correctly for FastAPI's request/response cycle — but any *manual* `json.dumps`/`json.loads` call outside that managed path needs the same care applied explicitly, typically via a custom `default=` serializer function for `json.dumps`.

### 38.6 Python Mechanism: XML — Namespace-Aware Parsing, and a Real Security Warning

XML remains common in enterprise integrations (SOAP APIs, certain legacy system exports) despite JSON's dominance elsewhere. Python's `xml.etree.ElementTree` handles basic parsing but requires explicit namespace-prefix handling for any real-world XML using namespaces (common in enterprise contexts) — a genuinely fiddly, easy-to-get-wrong detail worth budgeting real time for on first encounter. More seriously: **never parse untrusted XML with a parser configured to resolve external entities** — an XML External Entity (XXE) attack embeds a malicious entity reference that a naively-configured parser will resolve, potentially reading arbitrary local files or making unintended network requests; `defusedxml` (a drop-in, hardened replacement for the standard library's XML parsing) should be the default choice for any XML originating from an untrusted source (companion §63's OWASP-adjacent security discipline, applied specifically here).

### 38.7 Engineering Constraint: ZIP Is the Container Format Underneath Several "Different" Formats

`.xlsx`, `.docx`, and `.pptx` (§39) are all, structurally, ZIP archives containing a specific internal directory structure of XML files — recognizing this is directly useful: Python's `zipfile` module can open any of them to inspect or manually manipulate their internal structure for advanced cases the higher-level libraries (§38.4, §39) don't directly expose, and it explains why these file formats compress well and can be partially corrupted in specific, ZIP-structure-related ways (a truncated download producing a file that "looks" like the right size but fails to open) that are otherwise confusing without this structural knowledge.

### 38.8 Implementation

```python
import csv
import io
import json
from datetime import date, datetime
from decimal import Decimal

def parse_guest_upload_csv(file_content: bytes) -> list[dict]:
    text = file_content.decode("utf-8-sig")     # -sig strips a possible
                                                    # byte-order-mark, common
                                                    # in Excel-exported CSVs
    reader = csv.DictReader(io.StringIO(text))    # §38.3: dict-based, not
    return list(reader)                            # positional


def json_serialize_with_dates_and_decimals(obj: dict) -> str:
    def default(value):
        if isinstance(value, (date, datetime)):
            return value.isoformat()                # §38.5's gap, closed
        if isinstance(value, Decimal):
            return str(value)                         # preserve precision --
                                                         # NEVER float(value)
        raise TypeError(f"Cannot serialize {type(value)}")

    return json.dumps(obj, default=default)


# Demonstrating the CSV edge case §38.2 warns about:
sample = 'name,organization\n"Ada Lovelace","Analytical Engines, Inc."\n'
rows = list(csv.DictReader(io.StringIO(sample)))
print(rows)   # [{'name': 'Ada Lovelace', 'organization': 'Analytical Engines, Inc.'}]
              # -- the comma INSIDE the quoted organization field is correctly
              # preserved as part of one field, not split into two columns
```

`parse_guest_upload_csv`'s `utf-8-sig` decoding and `DictReader` usage together handle two of the most common real-world CSV gotchas (a BOM from an Excel export, and column-order fragility) in three lines. `json_serialize_with_dates_and_decimals`'s `default` function is the standard pattern for closing JSON's native type gaps (§38.5) — critically, converting a `Decimal` to `str` rather than `float` to avoid the precision loss `float` would silently introduce for financial or otherwise precision-sensitive values.

### 38.9 Production Considerations

Any file upload accepted from a user (§41 develops the upload mechanism itself) should validate its actual content against the *expected* format before processing, not just trust the file extension or declared content-type header, both of which a client can set to anything regardless of the file's real content — a `.csv`-named file is not guaranteed to actually be valid CSV, and processing code should fail with a clear, specific error on malformed input rather than crash unpredictably deep inside a parsing library. For XML specifically, defaulting to `defusedxml` (§38.6) for any user- or partner-supplied XML should be a non-negotiable, default-on security posture, not an opt-in hardening step applied only after a specific incident prompts it.

### 38.10 Debugging

**Symptoms:** A CSV upload from a specific client consistently fails or produces misaligned columns, while uploads from other sources work fine; a JSON serialization call fails with `TypeError: Object of type datetime is not JSON serializable`. **Investigation:** For the CSV case, check whether the problematic client's export contains commas, quotes, or newlines embedded within field values, and confirm the parsing code actually uses `csv.DictReader` rather than manual string splitting (§38.2). For the JSON error, identify which specific object in the payload is a `datetime`/`Decimal`/other non-native type reaching a raw `json.dumps` call outside Pydantic's managed serialization path. **Root cause:** Manual string-splitting CSV parsing that breaks on a legally-quoted special character; a bare `json.dumps` call missing a `default=` serializer for non-native JSON types. **Fix:** Replace manual CSV parsing with `csv.DictReader`/`DictWriter`; add an explicit `default=` serializer function (§38.8's pattern) to any manual `json.dumps` call handling dates, decimals, or other non-native types.

### 38.11 Interview Thinking

"How would you safely parse a CSV file where a field might contain a comma?" tests whether you know the `csv` module handles proper quoting correctly and reach for it by default, rather than proposing manual string-splitting with ad hoc special-case handling — a strong answer also proactively mentions the `DictReader`/positional-reader distinction (§38.3) as a related, second-order robustness concern interviewers sometimes probe together.

### 38.12 Mini Lab

Write a small script that generates a CSV file (using `csv.DictWriter`) containing at least one row with a comma embedded in a field value and one row with an embedded double-quote character, then reads it back using `csv.DictReader` and confirms both special characters round-trip correctly. Separately, write a function serializing a dict containing a `datetime`, a `Decimal`, and a plain string to JSON using the `default=` pattern from §38.8, and confirm it produces valid, correctly-formatted JSON for all three types.

---
