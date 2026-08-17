## §142. Securing S3 in Practice: Block Public Access, Bucket Policy, Encryption, Versioning

### 1. The Vocabulary

- **Block Public Access** — an account- and bucket-level setting that overrides other permissions
  to prevent public access, regardless of what a bucket policy or ACL says — the single strongest
  safety net against an accidental public bucket.
- **Bucket policy vs ACL** — a bucket policy is a JSON document controlling access at the bucket
  (and prefix/object) level; ACLs are an older, more limited, largely-deprecated mechanism —
  modern guidance is bucket policies plus IAM, not ACLs.
- **Encryption at rest (SSE-S3, SSE-KMS)** — protects data if the underlying storage is somehow
  compromised; it does **not** control who can request the object over the API — that's a
  completely separate axis, access control.
- **Versioning** — keeps prior versions of an object when overwritten or deleted, protecting
  against accidental overwrite/deletion — separate from both encryption and access control.

### 2. Where It Sits, and Why Teams Use It

The core fact every real S3 setup depends on: encryption answers "is the data unreadable to
someone who somehow got the raw disk," while access control (Block Public Access, bucket policy,
IAM) answers "who can call `GetObject` at all" — these are two independent controls, and having one
does not substitute for the other. The "accidentally public bucket" story almost always starts with
someone believing encryption was enough, or disabling Block Public Access to make static hosting
"just work" without narrowing the resulting public access to only the intended files.

### 3. What Actually Breaks

- **Believing encryption controls access** — "I turned on encryption" is not an answer to "who can
  read this data" — a bucket can be fully encrypted and still be world-readable if its access
  policy allows it.
- **Disabling Block Public Access broadly for a static site** — the correct pattern is public read
  access scoped specifically to the static assets (or better, private bucket + CloudFront Origin
  Access Control, §145), not a blanket removal of the account-level safety net.
- **No versioning on a bucket holding anything important** — an accidental overwrite or delete (a
  bad deploy script, a wrong CLI flag) is permanent without it.
- **Assuming a private bucket needs no further review** — a bucket policy or an IAM policy granted
  to too broad a principal can still expose "private" data even with Block Public Access enabled
  for anonymous/public access specifically.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "Encryption and access control are separate concerns — encryption protects data at rest, access
  control decides who can call the API at all."
- "For anything meant to be public, like static site assets, I scope public access narrowly rather
  than disabling Block Public Access broadly."
- "I turn on versioning for anything where an accidental overwrite or delete would actually hurt."

### 5. Interview-Ready Answer

> "I don't treat encryption as an access control — it protects data at rest, but who can call
> `GetObject` is a separate question answered by Block Public Access, the bucket policy, and IAM.
> For a private application bucket, I leave Block Public Access fully enabled and grant access only
> through scoped IAM roles or presigned URLs. For something genuinely public, like static site
> assets, I'd rather front it with CloudFront and an Origin Access Control than disable the
> account-level public-access protections directly on the bucket. And I turn on versioning
> anywhere an accidental overwrite would actually cost something."

### 6. Go Deeper

companion Cloud Engineering Playbook's §4 (S3) chapter for the full policy/ACL/encryption
mechanics; this book's §67 (S3 static website trap) for the specific privacy incident this chapter
expands on, and §145 (static site/SPA deployment patterns) for the CloudFront+OAC alternative.

---
