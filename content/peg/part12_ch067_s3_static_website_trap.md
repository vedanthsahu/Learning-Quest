## §67. S3 in Practice: Buckets, Privacy, and the Static Website Trap

### 1. The Vocabulary

- **Bucket** — S3's top-level storage container; object keys inside it form a flat namespace that
  looks like folders but isn't a real filesystem.
- **Block Public Access** — an account/bucket-level setting that, when enabled, overrides any
  individual permission that would otherwise make objects public — a safety net against
  accidental exposure.
- **Presigned URL** — a time-limited URL granting temporary access to a private object, without
  making the object or bucket public at all.
- **S3 static website hosting** — a specific bucket feature that serves objects directly over
  HTTP(S) as if the bucket were a basic web server, intended for genuinely public content.

### 2. Where It Sits, and Why Teams Use It

S3 is the default answer to "where do I put a file" in AWS, which means it's also where a huge
share of real accidental-data-exposure incidents happen — not because S3 is insecure, but because
its permission model has more nuance than "just make it private" captures.

### 3. What Actually Breaks

- **"I'll just make it private"** stated as if that's the whole story, when in practice privacy is
  the *intersection* of bucket policy, object-level ACLs, and the account-level Block Public
  Access setting — someone who's actually worked with S3 will talk about restricting inbound
  access *and* explicitly confirming Block Public Access is on, not just one vague setting.
- **Enabling static website hosting on a bucket that also holds sensitive data** — static website
  hosting is specifically designed to serve content publicly over plain HTTP; a bucket configured
  for it is meant to be public. A very real, common pattern: buckets used to host single-page
  applications directly via static website hosting (often *behind* CloudFront rather than exposed
  directly) — completely legitimate, but only appropriate for content that's meant to be fully
  public. The mistake is reusing that same bucket, or a sibling bucket with copy-pasted
  permissions, for anything that isn't meant to be public — public-site buckets and private-data
  buckets should never share permissions.
- **A single overly-broad bucket policy applied "temporarily"** — similar to §63's least-privilege
  point, a bucket policy opened up to unblock something quickly, with no follow-up to narrow it
  again, is a classic path to a real exposure incident.
- **Assuming an object is private just because the bucket "looks" private in the console** — a
  bucket-level policy can still make specific objects or prefixes public unless Block Public
  Access is explicitly enforced; checking the effective permission requires more than a glance.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- Not just "I'll make it private" — but "I'll keep Block Public Access enabled at the account
  level, restrict the bucket policy to the specific principals that need access, and use
  presigned URLs for any temporary access a client needs, rather than making anything public."
- "Static website hosting is for genuinely public content, and I keep those buckets completely
  separate from anything holding private data."
- "I treat any 'temporarily open this up' bucket policy change as a tracked item to revert, not a
  permanent state."

### 5. Interview-Ready Answer

> "S3 privacy isn't one setting — it's bucket policy, object ACLs, and the account-level Block
> Public Access setting working together, and I keep Block Public Access on by default rather than
> relying on remembering to configure every individual policy correctly. For anything that needs
> temporary external access, I'd use a presigned URL rather than making the object public. And
> specifically, static website hosting is a real, common pattern for serving public content
> directly from S3 — often behind CloudFront — but that bucket needs to be kept completely
> separate from anything storing actual private data, since website hosting is designed to serve
> its contents to anyone."

### 6. Go Deeper

companion Cloud Engineering Playbook's §4 (S3) chapter (bucket policy vs. IAM policy vs. ACL,
presigned URLs, Block Public Access in full depth).

---
