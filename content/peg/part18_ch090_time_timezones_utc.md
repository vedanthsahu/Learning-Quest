## §90. Time & Timezones: Why You Always Store UTC

### 1. The Vocabulary

- **UTC (Coordinated Universal Time)** — the single, timezone-independent reference time; the
  standard for storing timestamps.
- **Local time** — a timezone-adjusted representation of a moment, meant for *display*, not
  storage.
- **DST (Daylight Saving Time)** — the twice-yearly clock shift some regions observe, which
  creates real, recurring edge cases (an hour that happens twice, or doesn't happen at all).
- **Timezone database (IANA/tz database)** — the maintained source of truth for timezone rules
  (`America/New_York`, not `EST`, since fixed offset abbreviations don't account for DST).

### 2. Where It Sits, and Why Teams Use It

Every system that records "when" something happened touches this, and it's one of the most
common sources of subtle, hard-to-reproduce bugs — because timezone bugs often only manifest for
users in specific zones, or on specific days of the year (DST transitions), making them easy to
miss in testing.

### 3. What Actually Breaks

- **Storing local time instead of UTC** — a timestamp stored in "whatever timezone the server
  happened to be in" becomes ambiguous or wrong the moment the server's timezone changes, the
  data is read by a system in a different zone, or DST shifts the offset.
- **A cron job scheduled assuming the wrong timezone** — the classic "cron ran at the wrong time"
  bug (§46, §101) is almost always this: the schedule was written assuming local time, but the
  actual server/scheduler runs in UTC (or vice versa).
- **A date "off by one day" for some users specifically** — converting a stored UTC timestamp to a
  user's local timezone for display, near midnight, can shift the calendar date forward or
  backward relative to what's stored — a very common, specific bug pattern (see §108).
- **Using a fixed timezone abbreviation like "EST" instead of a proper IANA identifier** —
  abbreviations are ambiguous (multiple regions share the same one) and don't encode DST rules at
  all, unlike a real timezone identifier such as `America/New_York`.
- **DST transition edge cases** — a scheduled time that falls exactly within the "skipped" or
  "repeated" hour during a DST transition needs explicit handling; naive datetime arithmetic can
  produce a nonsensical or duplicate result.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I store every timestamp in UTC, and only convert to local time at the point of display, never
  for storage."
- "I use proper IANA timezone identifiers (`America/New_York`), not fixed abbreviations like
  'EST,' since abbreviations don't encode DST rules and can be ambiguous."
- "A 'date is off by one day for some users' bug is almost always a UTC-to-local conversion issue
  happening near a day boundary."

### 5. Interview-Ready Answer

> "The rule I follow without exception is store in UTC, display in local time — never the
> reverse. Almost every timezone bug I've seen traces back to that rule being violated somewhere:
> a cron job scheduled assuming local time when the server runs in UTC, or a date that's off by
> one day for users in certain timezones because a UTC timestamp was converted near a midnight
> boundary. I also use real IANA timezone identifiers rather than fixed abbreviations, since
> abbreviations don't encode daylight saving rules and can be genuinely ambiguous across regions."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §38 (Structured Data Formats: CSV, Excel, JSON,
XML & ZIP) chapter and companion Python Backend Engineering Handbook's §24 (PostgreSQL for
Backend Engineers) chapter (timestamp storage patterns).

---
