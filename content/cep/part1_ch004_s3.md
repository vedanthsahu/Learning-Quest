## 4. S3

> **Decision Snapshot** — Tier 1 · Storage · Verdict: the default choice for any unstructured, large, or infrequently-random-accessed data — files, backups, static assets, data lake storage. Primary alternative: EBS if you need a filesystem attached to a single instance; EFS if you need a shared POSIX filesystem across many instances.

### One-Line Summary
Object storage with effectively unlimited capacity, 99.999999999% durability, and a simple key-value-over-HTTP model — the default place to put a file in AWS.

### Category
Storage

### Tier
Tier 1

### What It Does
S3 (Simple Storage Service) stores objects (files, of any size up to 5TB each) inside buckets, addressed by a key (a string that looks like a file path but is really just an opaque identifier — S3 has no real directory structure, only the illusion of one via key prefixes). There's no server to provision, no capacity to plan for, and durability is handled by replicating every object across multiple facilities automatically. Access is entirely over HTTPS (or the S3 API via an SDK), not a mounted filesystem — this single fact is what makes it fundamentally different from EBS/EFS and is the source of most "wait, why can't I just..." confusion for engineers new to it.

### When Should I Use It?
- Storing uploaded files, generated reports, backups, or any blob that doesn't need to be a mounted filesystem.
- Static website hosting or serving assets via CloudFront.
- Data lake storage for analytics (companion §31 Athena, §33 Redshift Spectrum both query S3 directly).
- Large file uploads/downloads streamed directly by clients, offloading that bandwidth entirely from your application servers.

### When Should I NOT Use It?
- You need a real, POSIX-compliant filesystem mounted by an application expecting file-locking, random-write-in-place semantics, or directory operations — use EBS (single instance) or EFS (shared) instead.
- Extremely low-latency, high-IOPS random access patterns a database is actually built for — S3 is not a database.
- You need strongly consistent, transactional multi-object writes — S3 gives you strong read-after-write consistency per object since 2020, but there's no cross-object transaction.

### Common Real-World Use Cases
- User-uploaded file storage (companion Python Backend Handbook §41's streaming-upload pattern lands objects here, never in application memory or a database).
- Static asset hosting behind CloudFront.
- Application logs, backups, and data lake landing zones.
- Hosting build artifacts and deployment packages.

### Typical Architecture
```
Client → [presigned URL from your API] → S3 (direct upload, bypassing your servers)
                                              ↓
                                   S3 Event Notification → Lambda (processing)
                                              ↓
                                        S3 (processed result) → CloudFront → Client
```
The presigned-URL pattern — your API generates a short-lived, scoped URL, the client uploads/downloads directly against S3 — is the standard way to move large files without ever routing their bytes through your own application servers.

### Important Concepts
- **Storage classes** — Standard, Infrequent Access, Glacier (and its retrieval-tier variants), Intelligent-Tiering — the same durability, different cost/retrieval-latency tradeoffs; lifecycle policies automate the move between them as data ages.
- **Consistency model** — strong read-after-write consistency for all operations since December 2020 (this was not always true; older material describing "eventual consistency" for S3 is outdated).
- **Versioning** — keeps every version of an object rather than overwriting; the standard defense against accidental deletion/overwrite, and a prerequisite for cross-region replication.
- **Presigned URLs** — time-limited, scoped access to a specific object without making the bucket or object public.
- **Bucket policies vs. IAM policies vs. ACLs** — three overlapping ways to control access; bucket policies and IAM policies are the modern, recommended tools, ACLs are a legacy mechanism best avoided in new designs.
- **Multipart upload** — splits a large upload into parallel chunks; the mechanism behind reliably uploading multi-gigabyte files.

### Security Considerations
Block Public Access should be enabled account-wide by default and only selectively disabled with explicit justification — accidental public buckets are one of the most common, most publicized real-world cloud security incidents. Use bucket policies scoped to specific IAM principals/roles rather than broad wildcard access. Enable default encryption at rest (SSE-S3 or SSE-KMS) account-wide. For sensitive data, use SSE-KMS specifically so key usage is independently auditable via CloudTrail (companion §29), not just bucket access.

### Monitoring
S3 request metrics (via CloudWatch, opt-in per bucket) show request counts and error rates; S3 Storage Lens gives account/organization-wide visibility into storage growth and access patterns, which is often the fastest way to find "why is this bucket so expensive" before it becomes a Cloud Failure Engineering incident (companion §52).

### Scaling
S3 scales automatically and near-infinitely — there is no capacity to provision. The practical scaling concern is request-rate patterns against a single key prefix (a very old limitation around prefix-based partitioning has been substantially relaxed, but extremely hot, sequential-key access patterns can still benefit from key-prefix randomization) and multipart upload for large objects.

### Cost Model
You pay for storage (per GB per month, varying by storage class), requests (PUT/GET/LIST, priced differently), and data transfer out (to the internet — transfer *within* the same region to another AWS service is typically free). Storage class mismanagement — leaving infrequently-accessed data in Standard indefinitely — is the single most common source of an unexpectedly high S3 bill, and the direct subject of companion §52's failure-engineering chapter.

### Common Mistakes
- Leaving Block Public Access disabled without a specific, reviewed reason.
- Never configuring a lifecycle policy, letting old data sit in the most expensive storage class forever.
- Routing large file uploads/downloads through the application server instead of using presigned URLs.
- Relying on ACLs for access control in a new design instead of bucket/IAM policies.
- Assuming eventual consistency still applies (it hasn't since 2020) and building unnecessary workarounds for a problem that no longer exists.

### Migration Path
**Outgrowing it**: if you find yourself needing POSIX filesystem semantics against S3-stored data, that's a signal you actually need EFS (shared) or EBS (single-instance), not a sign S3 is broken. **Downgrading**: rare — S3 is close to a universal default for object storage at any scale; there's little reason to move away from it once adopted correctly.

### Interview Questions
1. Why can't you mount an S3 bucket as a regular filesystem the way you would EBS or EFS?
2. What's a presigned URL, and what problem does it solve?
3. How does S3's consistency model work today, and how did it change in 2020?
4. What's the difference between a bucket policy, an IAM policy, and an ACL for controlling S3 access?
5. How would you design a lifecycle policy for data that's frequently accessed for 30 days, then rarely touched?
6. Why is Block Public Access a default-on account setting rather than something configured per bucket?
7. What causes an S3 bill to grow unexpectedly, and how would you investigate it?
8. How does multipart upload work, and why does it matter for large files?
9. What's the tradeoff between SSE-S3 and SSE-KMS for encryption at rest?
10. How would you design a system where clients upload directly to S3 without ever sending the file through your API?

### Python Example
```python
import boto3

s3 = boto3.client("s3", region_name="us-east-1")

# Generate a presigned URL so the CLIENT uploads directly to S3 -- the file's bytes
# never pass through this application's own servers at all.
presigned_url = s3.generate_presigned_url(
    ClientMethod="put_object",
    Params={
        "Bucket": "my-app-uploads",
        "Key": f"uploads/{user_id}/{upload_id}.pdf",
        "ContentType": "application/pdf",
    },
    ExpiresIn=300,  # 5 minutes -- short-lived, scoped to exactly this one upload
)
```
`ExpiresIn=300` keeps the URL's validity window tight and specific to the moment the client actually needs to upload — a presigned URL with no meaningful expiry, or one reused across many uploads, undermines the entire point of scoping access narrowly.

### Best Practices
- Enable Block Public Access account-wide; require explicit justification to disable it per bucket.
- Configure lifecycle policies for every bucket holding data that ages.
- Use presigned URLs for direct client upload/download, bypassing your application servers.
- Default to SSE-KMS for sensitive data so key usage is independently auditable.
- Enable S3 Storage Lens and review it periodically, not only when a bill spikes.

### Cloud-Agnostic Mapping
| Concept | AWS | Azure | GCP |
|---|---|---|---|
| Object Storage | S3 | Blob Storage | Cloud Storage |

---
