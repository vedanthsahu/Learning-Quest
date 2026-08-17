## 56. Serialization, Compression & Streaming Performance

### 56.1 The Problem: Converting Python Objects to Bytes (and Back) Is Not Free, and Its Cost Scales With Response Size

Every API response ultimately requires serializing Python objects (Pydantic models, companion §21) into JSON bytes to send over the network, and every request requires the reverse. For small responses, this cost is negligible relative to everything else happening in a request — for large responses (a bulk export, a large paginated collection returned in full rather than genuinely paginated, companion §31.2's exact scaling concern) or very high request volume, serialization itself can become a measurable, even dominant, contributor to total request latency and CPU usage.

### 56.2 Python Mechanism: `orjson` — A Meaningfully Faster JSON Library, Drop-In Compatible

Python's built-in `json` module is written partly in C but has real, measurable overhead compared to `orjson` (a Rust-based JSON library) for both serialization and deserialization — commonly benchmarked at several times faster for typical backend payload shapes, with `orjson` additionally handling `datetime`, `UUID`, and `dataclass` serialization natively (directly closing companion §38.5's JSON-native-type-gap problem for these specific types, without needing a custom `default=` function for them at all). FastAPI can be configured to use `orjson` for its own response serialization (`ORJSONResponse`), making this a low-effort, broadly-applicable performance improvement for any FastAPI application with meaningful JSON serialization volume.

### 56.3 Decision Framework: Compression Trades CPU Time for Network Transfer Time

HTTP response compression (gzip, or the more modern brotli) reduces the number of bytes actually transmitted over the network, at the direct cost of CPU time spent compressing on the server side (and decompressing on the client side) — a clear win when network transfer time is the larger cost (a large response body, a client on a slow or metered connection) and a clear loss when the response is already small (compression overhead can exceed the transfer-time savings for tiny payloads) or when server CPU is already the binding constraint rather than network bandwidth. Most production deployments enable compression selectively, above a minimum response-size threshold, rather than universally for every response regardless of size.

### 56.4 Engineering Constraint: Where Compression Happens Changes Who Pays Its Cost

Compression can happen at the application layer (FastAPI's `GZipMiddleware`) or at the reverse-proxy/load-balancer layer in front of the application (companion Software Systems Handbook §28) — doing it at the proxy layer offloads the CPU cost from the application's own process entirely, letting the proxy (often optimized in C, and frequently running on separate infrastructure) absorb that cost instead, which is generally the preferred production pattern specifically because it keeps the application's own CPU capacity dedicated to actual business logic rather than compression work.

### 56.5 Python Mechanism: Streaming Serialization for Very Large Responses — Avoiding a Full In-Memory JSON String

For a genuinely large response (companion §22.4's `StreamingResponse` mechanism, revisited here specifically for the JSON-serialization angle), serializing an entire large Python object into one complete JSON string before sending any of it defeats the memory-efficiency benefit streaming was meant to provide in the first place — a streaming-JSON approach (yielding one JSON array element at a time, with manual comma/bracket management, or a library like `ijson` for the reverse — streaming *parsing* of a large incoming JSON payload) keeps memory usage bounded regardless of total response size, directly extending companion §3.5 and §42.3's generator-based, one-item-at-a-time processing principle specifically to the serialization boundary itself.

### 56.6 Implementation

```python
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse, StreamingResponse
from fastapi.middleware.gzip import GZipMiddleware

app = FastAPI(default_response_class=ORJSONResponse)   # §56.2: applies to
                                                          # every response,
                                                          # app-wide

app.add_middleware(GZipMiddleware, minimum_size=1000)    # §56.3-56.4: only
                                                            # compress responses
                                                            # above 1KB


async def stream_large_json_array(items_iter):
    """Streams a JSON array without ever building the full string in memory
    (§56.5) -- directly extending companion §22.4/§42.3's generator pattern
    to the serialization boundary itself."""
    yield "["
    first = True
    async for item in items_iter:
        if not first:
            yield ","
        first = False
        import orjson
        yield orjson.dumps(item).decode()   # ONE item's JSON at a time
    yield "]"


@app.get("/bookings/export")
async def export_all_bookings():
    async def booking_generator():
        # In reality, this would stream rows from the database (companion
        # §3.5's streaming query pattern), not hold them all in memory.
        for i in range(100_000):
            yield {"booking_id": f"b-{i}", "status": "CONFIRMED"}

    return StreamingResponse(
        stream_large_json_array(booking_generator()),
        media_type="application/json",
    )
```

`ORJSONResponse` set as the application's `default_response_class` means every ordinary endpoint benefits from `orjson`'s speed advantage (§56.2) automatically, with zero per-route code changes needed. `GZipMiddleware`'s `minimum_size=1000` implements §56.3's threshold-based compression decision directly — small responses skip compression entirely, avoiding paying its CPU cost where it wouldn't provide a net benefit. `stream_large_json_array` manually manages the JSON array's opening/closing brackets and comma separators while yielding one item's serialized JSON at a time — for a 100,000-row export, this keeps memory usage bounded to roughly one row at a time, rather than the multi-hundred-megabyte in-memory string a naive `json.dumps(full_list)` approach would require to hold before sending anything at all.

### 56.7 Production Considerations

Switching JSON libraries (§56.2) should be validated against the application's actual data shapes before broad rollout — `orjson`'s stricter or different handling of certain edge cases (non-UTF-8-safe strings, certain numeric edge cases) compared to the standard library's `json` module can, in rare cases, surface a genuine behavioral difference worth catching in staging rather than discovering in production. Compression's CPU cost (§56.3-56.4), if kept at the application layer rather than offloaded to a proxy, should be included explicitly in capacity planning (companion §56 of the Software Systems Handbook) — a load test (companion §52) run without compression enabled will systematically under-estimate the application's real CPU cost per request if production actually runs with application-layer compression turned on.

### 56.8 Debugging

**Symptoms:** An endpoint returning a large JSON payload shows unexpectedly high CPU usage and memory consumption specifically proportional to response size; enabling response compression unexpectedly increases average latency for a specific set of endpoints rather than improving it. **Investigation:** For the large-payload case, check whether the response is built as one complete in-memory object/string before sending, versus genuinely streamed (§56.5) — profiling (companion §54) will directly show serialization as the dominant cost if this is the issue. For the compression-latency regression, check the actual response sizes for the affected endpoints against the configured compression threshold (§56.3) — compression applied to many small responses can plausibly net-negative on latency due to its own overhead exceeding any transfer-time savings. **Root cause:** Non-streaming serialization of a large response holding the entire payload in memory before any of it is sent; a compression threshold set too low (or absent), applying compression's CPU cost to responses too small to benefit from it. **Fix:** Convert large-response endpoints to genuine streaming serialization (§56.5-56.6); tune (or add) a minimum-size compression threshold matched to the actual response-size distribution where compression provides a genuine net latency benefit.

### 56.9 Interview Thinking

"How would you optimize an API endpoint that returns a very large JSON response?" is testing whether streaming serialization (§56.5) is part of your answer, not just "paginate it" (a valid complementary answer, companion §31.2, but a different fix for a related but distinct problem) — a strong answer distinguishes reducing the *total* data returned (pagination) from avoiding holding the *entire* response in memory at once during serialization (streaming), since a genuinely large single export may legitimately need the second even after the first has already been applied.

### 56.10 Mini Lab

Implement both a naive endpoint returning a `list[dict]` of 50,000 items directly (letting FastAPI serialize the whole thing normally) and the streaming version from §56.6, both against the same underlying data. Using a memory profiler (companion §54.5) or simple before/after memory measurement, compare peak memory usage between the two approaches during response generation, confirming the streaming version's memory usage stays roughly flat regardless of total item count while the naive version's grows proportionally with it.

---
