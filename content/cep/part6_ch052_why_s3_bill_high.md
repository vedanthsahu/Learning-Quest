## 52. Why Is My S3 Bill So High?

*(Prerequisite: companion §4 S3)*

### 52.1 Symptoms
S3 costs grow steadily month over month, or jump sharply, disproportionate to any obvious corresponding growth in actual application usage or user-facing storage needs.

### 52.2 Possible Causes
Data accumulating in the Standard storage class indefinitely with no lifecycle policy aging it into cheaper tiers; an unexpectedly high request count (a large number of small `GET`/`PUT`/`LIST` operations, sometimes from an inefficient application access pattern or an unintended retry loop); data transfer out to the internet at a volume that wasn't anticipated; versioning enabled without a corresponding lifecycle policy to expire old versions, silently multiplying storage of frequently-overwritten objects.

### 52.3 Metrics
S3 Storage Lens (companion §4) gives account/organization-wide visibility into storage growth by bucket, storage class, and prefix — the fastest way to find where growth is actually concentrated, rather than guessing.

### 52.4 Logs
Cost Explorer (companion §29) broken down by S3 usage type (storage, requests, data transfer) shows which specific cost dimension is actually driving the bill — a common early mistake is assuming it's storage volume when the real driver is request count or data transfer.

### 52.5 Investigation
Break the bill down by usage type first (storage vs. requests vs. transfer) before investigating further — each has a genuinely different root cause and fix. For storage-driven cost, check whether lifecycle policies exist and are actually aging data as intended. For request-driven cost, check for an inefficient access pattern (e.g., frequent `LIST` operations over a large prefix, or a retry loop hitting S3 repeatedly).

### 52.6 Root Cause
In practice, the most common cause is simply the absence of a lifecycle policy — data that should have aged into Infrequent Access or Glacier after a defined period instead sits in Standard storage indefinitely, a purely configuration-driven cost that compounds every month it goes unaddressed. A close second is versioning enabled (sometimes for good reason, companion §4) without a corresponding policy to expire noncurrent versions, silently multiplying storage for any object that's overwritten repeatedly.

### 52.7 Fix
Configure lifecycle policies matched to actual data-access-age patterns (companion §4's storage-class transitions). For versioned buckets, add a noncurrent-version-expiration rule alongside versioning itself, not as an afterthought. For request-driven cost, investigate and fix the specific inefficient access pattern or retry loop identified in Storage Lens/CloudTrail data-event logs.

### 52.8 Tradeoffs
Lifecycle transitions to colder storage classes trade retrieval latency/cost for storage savings — appropriate only for data whose actual access pattern genuinely tolerates that latency; applying aggressive lifecycle transitions to data that's still frequently accessed trades a storage saving for a worse (and possibly net more expensive, given retrieval fees) access experience.

### 52.9 Prevention
Configure lifecycle policies and (where versioning is enabled) noncurrent-version expiration at bucket-creation time, as a standard practice, not a reactive fix after a bill spike. Review S3 Storage Lens and Cost Explorer's S3 breakdown on a recurring schedule, not only when a bill is already unexpectedly high.

### 52.10 Decision Tree
```
Break down the S3 cost increase by usage type in Cost Explorer:
  STORAGE-driven -> Check for a missing lifecycle policy, or versioning without
     noncurrent-version expiration. Add/fix the policy.
  REQUEST-driven -> Investigate access patterns via Storage Lens / CloudTrail data
     events for an inefficient pattern or unintended retry loop.
  TRANSFER-driven -> Check whether traffic should be served via CloudFront (companion
     §8) instead of directly from S3, both cheaper and faster for repeat access.
```

---
