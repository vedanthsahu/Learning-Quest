## 24. PostgreSQL for Backend Engineers

### 24.1 The Problem: Application Memory Is Volatile; Business Data Cannot Be

Every mechanism Parts I-III developed operates on data living in a single process's memory (companion §9.2) — the moment that process restarts, crashes, or is simply one of several parallel workers (§16.8), that memory is gone or was never shared in the first place. A backend's actual business data (bookings, users, guests) must survive process restarts, be visible consistently across every worker process and every server instance, and support queries far more complex than "look up this one key" — this is the problem a relational database, specifically PostgreSQL for this handbook's purposes, exists to solve.

### 24.2 Engineering Constraint: A Relational Database Enforces Structure and Relationships, Not Just Storage

PostgreSQL isn't merely "a place to durably store data" — companion §6 (Data Storage) and §7 (Databases) already established why a raw file or a simple key-value store fails to provide the guarantees a real backend needs: enforced relationships between records (a booking must reference a real, existing seat), enforced constraints (a status column can only hold one of a fixed set of values), and the ability to query across relationships efficiently (find all bookings for seats on a specific floor) — all of which the actual Seat Management backend's schema (sites → buildings → floors → seats → bookings) depends on directly.

### 24.3 Python Mechanism: `psycopg2`/`psycopg` as the Raw Driver Layer

A **database driver** (`psycopg2`, or its newer async-capable successor `psycopg`) is the library that actually speaks PostgreSQL's wire protocol — opening a TCP connection, sending SQL text, and parsing the binary result rows back into Python objects. Every higher-level tool (SQLAlchemy, §25) is ultimately built on top of a driver like this one; the actual Seat Management backend, notably, uses `psycopg2` directly with hand-written SQL rather than an ORM at all — a legitimate, deliberate architectural choice (§25.3 develops the ORM-vs-raw-SQL tradeoff explicitly) that this chapter's mechanism-level content applies to either approach.

### 24.4 Decision Framework: A Connection Is Expensive to Open; Reuse, Don't Recreate

Opening a new database connection involves a real TCP handshake, PostgreSQL-side authentication, and server-side process/resource setup — meaningfully more expensive than most in-process operations, and doing it fresh for every single query would add unacceptable latency to every request. This is precisely why lifespan (§17.2) creates a connection *pool* once at startup rather than a route handler opening its own connection per request — §26 develops connection pooling in full, but the underlying reason traces directly back to this chapter's connection-cost fact.

### 24.5 Python Mechanism: Parameterized Queries Are Not Optional

Building a SQL query by string-formatting user input directly into it (`f"SELECT * FROM users WHERE email = '{email}'"`) is the single most dangerous pattern in backend database code — it allows **SQL injection** (companion §63 develops the full attack), where a malicious `email` value can alter the query's actual logic entirely. A **parameterized query** (`cur.execute("SELECT * FROM users WHERE email = %s", (email,))`) sends the query text and the user-supplied values *separately* to PostgreSQL, which substitutes them safely — the driver and database, not string concatenation, handle escaping, making injection structurally impossible for any query written this way.

### 24.6 Implementation

```python
import psycopg2
from psycopg2.extras import RealDictCursor

def get_active_bookings_for_seat(conn, seat_id: str, tenant_id: str) -> list[dict]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:   # rows come back
                                                                # as dicts, not
                                                                # raw tuples
        cur.execute(
            """
            SELECT id, booking_date, booking_status
            FROM bookings
            WHERE seat_id = %s
              AND tenant_id = %s
              AND booking_status = 'CONFIRMED'
            ORDER BY booking_date
            """,
            (seat_id, tenant_id),          # PARAMETERIZED -- never
        )                                   # f-string interpolation (§24.5)
        return [dict(row) for row in cur.fetchall()]


def create_booking(conn, *, tenant_id: str, seat_id: str, booking_date, user_id: str) -> dict:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO bookings (tenant_id, seat_id, booking_date, booked_for_user_id, booking_status)
            VALUES (%s, %s, %s, %s, 'CONFIRMED')
            RETURNING id, booking_date, booking_status
            """,
            (tenant_id, seat_id, booking_date, user_id),
        )
        result = dict(cur.fetchone())
        conn.commit()                       # explicit commit -- nothing is
        return result                        # persisted until this call (§27)
```

`RealDictCursor` returns each row as a dict keyed by column name rather than an anonymous tuple, directly matching the actual Seat Management backend's own repository-layer convention. Every value that varies per call (`seat_id`, `tenant_id`, `booking_date`, `user_id`) is passed as a separate parameter in the tuple argument to `.execute(...)`, never interpolated into the query string itself (§24.5) — this is true regardless of whether the value originated from trusted internal code or directly from client input, since consistent discipline here is what makes the practice actually reliable rather than dependent on remembering which specific values are "safe."

### 24.7 Production Considerations

`RETURNING` (used in `create_booking` above) lets an `INSERT` return the newly-created row's server-generated values (an auto-assigned `id`, defaulted columns) in the same round-trip as the insert itself, avoiding a separate `SELECT` immediately afterward — a small but real latency and correctness improvement (a subsequent `SELECT` by some other identifying field risks a race if another process modifies the row in between) worth using as a default habit rather than an occasional optimization. `conn.commit()` must be called explicitly for `psycopg2`'s default transaction behavior — forgetting it means a connection accumulates uncommitted changes that either silently vanish when the connection closes, or worse, remain uncommitted and invisible to other connections/transactions indefinitely, blocking related rows via unreleased locks (§27 develops transaction and isolation-level mechanics fully).

### 24.8 Debugging

**Symptoms:** A query that should return recently-inserted data returns nothing, or an application that inserts data appears to silently lose it after a restart. **Investigation:** Check whether `.commit()` was called after the insert, and on which connection object — a commit called on the wrong connection (a common mistake when multiple connections are in play, such as one for a "check" query and a different one for the actual write) doesn't commit the intended transaction at all. **Root cause:** An uncommitted transaction whose changes exist only in that one connection's uncommitted state, invisible to any other query and lost entirely if that connection closes without committing. **Fix:** Ensure every write path calls `.commit()` (or uses a context-manager-based transaction wrapper, companion §3.6, that commits automatically on success) on the exact same connection object the write itself used.

### 24.9 Interview Thinking

"Why are parameterized queries important, beyond just being 'best practice'?" tests whether you can explain SQL injection's actual mechanism (§24.5) — string interpolation lets attacker-controlled input change the query's structure itself, not just its data — rather than reciting "it prevents injection" as an unexplained rule; a strong answer also connects this to why an ORM's query-building API (§25) provides this protection by construction, as one of its real, non-syntactic benefits.

### 24.10 Mini Lab

Using a local PostgreSQL instance (or a lightweight embedded/in-memory equivalent for the exercise), create a minimal `bookings` table and write both `get_active_bookings_for_seat` and `create_booking` as in §24.6. Deliberately write a third, unsafe version of the lookup function using f-string interpolation instead of parameterization, then construct an `email`-like input value containing a single quote and a SQL comment marker to demonstrate (in a safe, local, educational context only) how the unsafe version's query is altered, while the parameterized version handles the same input safely.

---
