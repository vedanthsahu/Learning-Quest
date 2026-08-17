## §105. Upload & File Mysteries

*Format: Symptom → What's Actually Going On → The Fix → What to Say About It.*

### "Upload works for small files but fails for large ones."

- **What's actually going on**: Most likely a size limit somewhere in the chain — the
  application, a reverse proxy/load balancer's own request size cap, or the client-side upload
  logic buffering the whole file in memory before sending. Large files can also simply be timing
  out if the whole request is expected to complete within a fixed window.
- **The fix**: Check size limits at every layer (application, proxy, load balancer), and consider
  switching to a chunked/multipart upload or a presigned-URL direct-to-storage approach for
  anything beyond a small size threshold.
- **What to say**: "I'd check size limits at every layer between the client and storage, not just
  the application's own config — a proxy or load balancer often has its own cap."
- **See also**: §72, §79, §80.

---
