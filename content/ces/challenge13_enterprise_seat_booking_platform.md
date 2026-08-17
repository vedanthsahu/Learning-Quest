## Project 13: Enterprise Seat Booking Platform

### Problem Statement

A company with multiple office floors wants employees and guests to be able to reserve a specific desk or seat for a specific day, from a floor plan, so the office doesn't get overcrowded and people can find a spot in advance. Admins need to see and manage bookings across the whole organization, apply different rules to different groups of people, and handle the inevitable cases where two people try to book the same seat at nearly the same moment.

### Functional Requirements

- Display a floor's layout with individual seats, showing which are available or already booked for a given date.
- Allow a user to book a specific, available seat for a specific date.
- Allow a booking to be modified or cancelled.
- Allow an administrator to view and manage bookings across the organization, filtered by various conditions (date, floor, employee vs. guest, department).
- Support different booking rules or limits for different categories of user (e.g., employees vs. visiting guests).

### Non-Functional Requirements

- **Correctness under concurrency**: two people must never both successfully book the same seat for the same date — this is the single most important guarantee in the entire system.
- **Auditability**: it should be possible to see the history of changes to a booking, not just its current state.
- **Query flexibility for admins**: administrators need to filter and combine multiple conditions when reviewing bookings, not just look up one booking at a time.
- **Reasonable latency**: checking seat availability and completing a booking should feel fast, even during a peak booking rush (e.g., everyone booking Monday morning seats at 9 AM Friday).

### Project Scope

**In scope**: floor/seat modeling, booking creation with double-booking prevention, booking modification/cancellation with audit history, admin filtering across multiple conditions, differentiated rules per user category. **Out of scope**: real-time floor-plan visualization/rendering, integration with building access-control hardware, recurring/recurring-series bookings.

### Engineering Questions (Answer Them Yourself First)

- If two users click "book" on the exact same seat and date within the same second, what has to happen at the database level to guarantee only one succeeds?
- Is "cancelling a booking" the same as "deleting the record of it ever having existed"? What does the auditability requirement imply about the answer?
- If an admin wants to see "all guest bookings for Floor 3 last week, excluding cancelled ones," how many separate, independent conditions is that, and does your design let them be combined freely or only in predefined combinations?
- What's different about "a booking was modified" versus "a new booking replaced an old one," and does that distinction matter for the audit trail?

### Architecture Thinking

Sketch the exact sequence of operations that must happen, in what order, for a booking to be created safely — where specifically does the double-booking race actually get closed? Consider how you'd model the difference between a booking's *current* state and its full history of changes — is history a separate concept from the booking itself, or an inherent part of how you store it? Estimate: if an admin's filter UI allows combining any number of optional conditions (date range, floor, user type, status), how would you build a query that handles this without writing a separate hardcoded query for every possible combination?

### Progressive Hint System

**Level 1**: Consider what database mechanism specifically prevents two concurrent transactions from both reading "this seat is free" and both proceeding to book it. **Level 2**: Research row-level locking within a transaction as a way to serialize concurrent access to the same specific seat-date combination. **Level 3**: Research the pattern of never deleting or overwriting a modified record in place, but instead inserting a new record representing the change, with the current state derived by querying for the most recent one — and research dynamically building a query by conditionally adding WHERE clauses based on which filters were actually supplied. **Level 4**: A standard design uses `SELECT ... FOR UPDATE` (or a unique constraint on seat+date) within a transaction to make booking creation atomic and safe under concurrency; modifications are recorded as new versioned entries rather than in-place overwrites, with the current, user-facing view always reflecting the latest version and full history remaining queryable; admin filtering is built by dynamically composing query conditions based on which filter parameters are actually present in the request, rather than a fixed set of hardcoded query variants.

### Common Engineering Traps

- **Checking seat availability with a simple SELECT, then inserting the booking as a separate, later step** — under what specific timing does this let two users both book the same seat?
- **Relying purely on application-level checks (e.g., checking in Python code) rather than a database-level constraint to prevent double-booking** — what happens if two application server instances process the two competing requests at the exact same moment?
- **Overwriting a booking's row in place when it's modified, with no separate history table or versioning** — what specific admin or audit question becomes impossible to answer with this design?
- **Writing a separate hardcoded SQL query for every possible combination of admin filter conditions** — how many queries would you need, and what happens the first time a new filter is requested?

### Reflection Questions

- How would you test, under genuine concurrent load (not sequential test calls), that your design actually prevents double-booking?
- If a booking is modified three times, should an admin be able to see all four states (original plus three edits), or just the current one and the fact that changes happened?
- What would you need to add if the business later wanted "recurring bookings" (the same seat, every Monday, for a month) — would that fit cleanly into your current model, or require rethinking it?

### Completion Checklist

- [ ] I have a specific, database-enforced mechanism preventing double-booking under real concurrency.
- [ ] I have a design that preserves full booking history, not just current state.
- [ ] I have a dynamic filtering approach for admin queries that doesn't require a hardcoded query per filter combination.
- [ ] I have considered how different user categories get different booking rules without duplicating logic per category.
- [ ] I am ready to compare my reasoning against the Solution Guide.

---
