## §35. Backup, Restore, and Seed vs Production Data

### 1. The Vocabulary

- **Backup** — a point-in-time copy of the database, kept so data can be recovered after loss or
  corruption.
- **Restore** — actually bringing a backup back into a usable database — the step teams
  systematically under-practice compared to taking backups in the first place.
- **Seed data** — a small, fixed dataset used to populate a dev/test database with realistic-
  enough data to work with.
- **RPO (Recovery Point Objective)** — how much data loss (measured in time) is acceptable —
  "at most 1 hour of data lost" — which directly determines how often backups need to run.
- **RTO (Recovery Time Objective)** — how long recovery is allowed to take.

### 2. Where It Sits, and Why Teams Use It

A backup that has never been restored is an unverified assumption, not a safety net — this is one
of the most common gaps between "we have backups" (true) and "we could actually recover if we
needed to" (untested, and sometimes false).

### 3. What Actually Breaks

- **Backups exist but have never been test-restored** — a corrupted backup file, a schema
  mismatch, or a missing piece of configuration only gets discovered during an actual emergency,
  which is the worst possible time to discover it.
- **Backup frequency not matched to actual RPO tolerance** — nightly backups mean up to 24 hours
  of potential data loss; if the business can't tolerate that, the backup schedule (or replication
  strategy) needs to change, not just "we have backups" as a checkbox.
- **Seed/test data accidentally resembling production closely enough to cause confusion** — or
  the opposite: seed data so minimal and clean that it never exercises the edge cases (nulls,
  weird characters, large values) that real production data actually contains.
- **Running a destructive script against production because it "looked like" the staging
  connection string** — a real, recurring category of incident; separating credentials and adding
  explicit environment confirmation prompts for destructive operations meaningfully reduces this
  risk.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "A backup strategy isn't complete until a restore has actually been tested, end to end."
- "Backup frequency should be chosen based on an actual RPO the business can tolerate, not just
  'we run something nightly.'"
- "I'm deliberately careful about which credentials/connection string a script is pointed at
  before running anything destructive."

### 5. Interview-Ready Answer

> "I treat 'we have backups' and 'we can actually recover' as two different claims — the second
> one only holds if a restore has been tested, not just assumed to work. Backup frequency should
> map to an actual RPO the business has agreed is tolerable, and for seed data, I try to make it
> realistic enough — including edge cases like nulls and unusual characters — to actually catch
> bugs before they reach real data."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §24 (PostgreSQL for Backend Engineers) chapter
(backup/restore mechanics); companion Software Systems Handbook's §52 (Reliability Engineering
Deep Dive) chapter (RPO/RTO, disaster recovery).

---
