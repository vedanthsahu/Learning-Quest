// Static quiz content -- not user data, so it lives in code, not data.json. Only
// quizResults (score/attempts per quiz id) is persisted to the save file.
// partIndex must match the book's actual `parts` array order (see generate_content_and_data.py).

export const QUIZZES = [
  {
    id: "pbh-part1",
    bookId: "pbh",
    partIndex: 1,
    partName: "Part I — Modern Python",
    questions: [
      {
        q: "Why is a mutable default argument like `def f(items=[])` dangerous?",
        options: [
          "It's created once at function definition and shared across every call that doesn't pass its own value",
          "Python re-creates it fresh on every call, so it's slower than necessary",
          "It only works correctly inside async functions",
          "It causes a SyntaxError in Python 3.11+",
        ],
        correct: 0,
        explain: "The default is evaluated once when the function is defined, not per call — every call sharing the default mutates the same object.",
      },
      {
        q: "What does a context manager's `__exit__` guarantee that a plain try/finally-less block doesn't?",
        options: [
          "Faster execution",
          "Cleanup runs even if an exception is raised inside the `with` block",
          "The resource is opened lazily",
          "It automatically retries on failure",
        ],
        correct: 1,
        explain: "`__exit__` is called on the way out regardless of whether the block succeeded or raised — that's the entire point of the pattern.",
      },
      {
        q: "What's the key difference a Protocol gives you over inheriting from an abstract base class?",
        options: [
          "Protocols run faster at import time",
          "Structural typing: a class satisfies a Protocol just by having the right methods, with no explicit inheritance",
          "Protocols can't be used with type checkers",
          "Protocols require a metaclass",
        ],
        correct: 1,
        explain: "Protocols check shape, not lineage — any object with matching methods satisfies the Protocol, useful for swapping implementations (e.g., a fake repository in tests).",
      },
      {
        q: "Why does this handbook insist on pinned/locked dependency versions rather than loose ranges?",
        options: [
          "Loose ranges are slower to install",
          "Locked versions guarantee the exact same build is reproducible across machines and over time",
          "Python requires it since 3.10",
          "It has no real benefit, it's just convention",
        ],
        correct: 1,
        explain: "A lock file is what makes 'works on my machine' actually mean 'works everywhere' — the same versions get installed every time.",
      },
      {
        q: "In a custom exception hierarchy for an API, why define a base `AppError` that all domain exceptions inherit from?",
        options: [
          "It's required by FastAPI",
          "It lets a single centralized handler catch and format every domain error consistently",
          "It makes exceptions serialize faster",
          "Python requires all exceptions to share a common base beyond `Exception`",
        ],
        correct: 1,
        explain: "A shared base class is what lets one exception handler map every domain-specific error to a consistent API error response.",
      },
    ],
  },
  {
    id: "pbh-part2",
    bookId: "pbh",
    partIndex: 2,
    partName: "Part II — Concurrency",
    questions: [
      {
        q: "What does the GIL actually prevent?",
        options: [
          "Multiple processes running at once",
          "More than one thread executing Python bytecode at the exact same instant within one process",
          "Any use of the `threading` module",
          "Network I/O from happening concurrently",
        ],
        correct: 1,
        explain: "The GIL serializes bytecode execution across threads in one process — it's why CPU-bound work doesn't parallelize via threads alone.",
      },
      {
        q: "Why do threads still help even though the GIL exists?",
        options: [
          "They don't — threads are useless in Python",
          "I/O-bound waits release the GIL, so other threads can run while one thread waits on a slow socket/disk",
          "The GIL only applies to async code",
          "Threads bypass the GIL automatically in Python 3.12",
        ],
        correct: 1,
        explain: "A thread blocked on I/O releases the GIL, letting other threads make progress — this is exactly why thread pools work well for blocking I/O.",
      },
      {
        q: "What's the single most common way a synchronous call accidentally blocks an async event loop?",
        options: [
          "Using `await` too many times",
          "Calling a blocking library (e.g. a sync DB driver or `requests`) directly inside an `async def` function",
          "Importing `asyncio` twice",
          "Using more than one `async def` function per file",
        ],
        correct: 1,
        explain: "A blocking call inside async code stalls the entire event loop for its duration — every other concurrent request pays for it, not just the one that made the call.",
      },
      {
        q: "Why is a fire-and-forget `asyncio.create_task(...)` with no reference kept a real bug risk?",
        options: [
          "It runs twice by default",
          "The task can be garbage-collected mid-execution since nothing holds a reference to it",
          "It blocks the event loop",
          "It requires manual `await` to even start",
        ],
        correct: 1,
        explain: "Without a kept reference, the task object can be garbage collected before it finishes, silently cancelling the background work.",
      },
      {
        q: "What does a bounded queue give you that an unbounded one doesn't, in a producer-consumer pipeline?",
        options: [
          "Faster throughput always",
          "Backpressure — producers slow down/block once the queue is full, instead of memory growing without limit",
          "Automatic retries",
          "Guaranteed ordering (unbounded queues don't preserve order)",
        ],
        correct: 1,
        explain: "A bounded queue forces producers to slow down when consumers fall behind, preventing unbounded memory growth — the core idea of backpressure.",
      },
    ],
  },
  {
    id: "pbh-part3",
    bookId: "pbh",
    partIndex: 3,
    partName: "Part III — FastAPI & ASGI",
    questions: [
      {
        q: "What does ASGI provide that WSGI (the older standard) doesn't?",
        options: [
          "Support for async request handling, WebSockets, and long-lived connections",
          "Faster JSON parsing",
          "Built-in database connection pooling",
          "Automatic API documentation",
        ],
        correct: 0,
        explain: "WSGI's one-request-one-response synchronous model can't natively support async handlers, WebSockets, or streaming — ASGI was designed specifically to fill that gap.",
      },
      {
        q: "Why must a more specific literal route (`/notes/search`) be declared BEFORE a parameterized one (`/notes/{note_id}`)?",
        options: [
          "It doesn't matter, FastAPI sorts routes automatically",
          "FastAPI matches routes in declaration order, so the parameterized route would otherwise shadow the literal one",
          "Literal routes are always faster",
          "Only GET routes have this issue",
        ],
        correct: 1,
        explain: "A `{note_id}` path parameter matches literally anything, including the string 'search' — declaring it first would make `/notes/search` unreachable.",
      },
      {
        q: "What's the main advantage of FastAPI's dependency injection (`Depends`) over calling shared logic directly inside each route?",
        options: [
          "It's the only way to access the request body",
          "Dependencies are composable, testable in isolation, and can be overridden in tests without touching route code",
          "It automatically caches every dependency forever",
          "It removes the need for Pydantic models",
        ],
        correct: 1,
        explain: "Depends lets you swap a real dependency for a fake one in tests, and lets one dependency build on another — direct function calls give you neither.",
      },
      {
        q: "Why should input and output Pydantic models usually be separate (e.g. `NoteIn` vs `Note`)?",
        options: [
          "Pydantic requires two classes per model",
          "The output often needs server-generated fields (an id, timestamps) that clients should never be able to set on input",
          "It's purely a style preference with no functional benefit",
          "Separate models are required for OpenAPI generation to work at all",
        ],
        correct: 1,
        explain: "Splitting input/output models prevents a client from smuggling in fields like `id` or `created_at` that only the server should control.",
      },
      {
        q: "Why does FastAPI's `BackgroundTasks` explicitly warn it's 'not for critical work'?",
        options: [
          "It runs in a separate, unreliable process",
          "It runs in the same process after the response is sent — a crash before it completes loses the work entirely",
          "It has a hard 1-second time limit",
          "It can only be used with GET requests",
        ],
        correct: 1,
        explain: "BackgroundTasks has no durability guarantee — a process crash between sending the response and finishing the task loses it, unlike a real task queue.",
      },
    ],
  },
  {
    id: "pbh-part4",
    bookId: "pbh",
    partIndex: 4,
    partName: "Part IV — Databases",
    questions: [
      {
        q: "What is the N+1 query problem?",
        options: [
          "A query that returns N+1 rows instead of N",
          "Fetching a list with one query, then triggering one additional query per item to fetch related data",
          "A migration that adds N+1 columns",
          "An off-by-one error in pagination",
        ],
        correct: 1,
        explain: "One query for the list plus one implicit query per item's related data scales linearly with list size — the classic ORM performance trap.",
      },
      {
        q: "What does `SELECT ... FOR UPDATE` inside a transaction actually do?",
        options: [
          "It updates the row immediately",
          "It locks the selected row(s) so a concurrent transaction can't read or modify them until this transaction finishes",
          "It forces a full table scan",
          "It's a no-op outside of PostgreSQL",
        ],
        correct: 1,
        explain: "Row-level locking via FOR UPDATE is exactly how you prevent two concurrent transactions from racing on the same row — e.g., preventing a double-booking.",
      },
      {
        q: "Why does adding a NOT NULL column in one single migration step risk an incident on a large table?",
        options: [
          "It never actually works",
          "Depending on the database, it can require rewriting every existing row under a table-locking operation, blocking reads/writes for its full duration",
          "NOT NULL columns are deprecated",
          "It silently deletes existing rows",
        ],
        correct: 1,
        explain: "The safe pattern is three steps: add nullable, backfill in batches, then add the constraint — avoiding one long, table-locking rewrite.",
      },
      {
        q: "What does a connection pool's `pool_size` actually bound?",
        options: [
          "The number of tables the app can query",
          "The number of concurrently-open, reusable database connections available to the application",
          "The maximum query execution time",
          "The number of database migrations that can run at once",
        ],
        correct: 1,
        explain: "The pool caps how many connections exist at once; too small for actual concurrent demand causes checkout timeouts under load.",
      },
      {
        q: "What's the key difference between a connection-pool leak and genuine pool undersizing?",
        options: [
          "There is no difference",
          "A leak gets progressively worse over time even under constant traffic; undersizing tracks traffic level directly and recovers during lulls",
          "Undersizing only happens with SQLite",
          "A leak is always caused by too many indexes",
        ],
        correct: 1,
        explain: "Watching utilization over time is the fastest way to tell them apart — a leak trends upward regardless of load; undersizing tracks load and recovers.",
      },
    ],
  },
  {
    id: "pbh-part5",
    bookId: "pbh",
    partIndex: 5,
    partName: "Part V — External Systems",
    questions: [
      {
        q: "Why is `httpx` generally preferred over `requests` in an async FastAPI codebase?",
        options: [
          "requests is deprecated",
          "httpx has a genuine async-native client, while requests is purely synchronous and would block the event loop",
          "httpx is faster for every workload regardless of concurrency",
          "requests can't parse JSON",
        ],
        correct: 1,
        explain: "Using a synchronous HTTP client inside async code is exactly the blocking-call trap — httpx's async client avoids it natively.",
      },
      {
        q: "What problem does an idempotency key solve for a retried external call (e.g., a payment charge)?",
        options: [
          "It makes the call faster",
          "It lets the receiving system deduplicate a retried request so it isn't processed twice",
          "It encrypts the request body",
          "It's only relevant for GET requests",
        ],
        correct: 1,
        explain: "A retry after an ambiguous failure (timeout, dropped connection) risks double-processing; an idempotency key lets the server recognize 'I already did this.'",
      },
      {
        q: "Why does scaling WebSocket connections across multiple server instances require a pub/sub layer (like Redis pub/sub)?",
        options: [
          "WebSockets don't work with more than one instance at all",
          "A WebSocket connection is pinned to the specific instance that accepted it, so instances need a shared channel to relay messages to whichever instance holds the recipient's connection",
          "Pub/sub is required by the WebSocket protocol itself",
          "It's only needed for HTTP polling, not WebSockets",
        ],
        correct: 1,
        explain: "Sender and recipient may be connected to different instances entirely — pub/sub bridges that gap without instances needing to know about each other directly.",
      },
      {
        q: "In OAuth2/JWT, what's the fundamental tradeoff between using JWTs and server-side sessions?",
        options: [
          "JWTs are always strictly better",
          "JWTs avoid a database lookup on every check but make instant revocation hard; sessions support instant revocation but require a lookup per check",
          "Sessions can't expire",
          "There is no real tradeoff, they're interchangeable",
        ],
        correct: 1,
        explain: "This is a genuine, stated tradeoff — not a solved problem — which is why short-lived JWTs plus an optional revocation blocklist is a common compromise.",
      },
      {
        q: "What does 'at-least-once' delivery from a message queue imply for how consumer code must be written?",
        options: [
          "Nothing special — messages always arrive exactly once in practice",
          "Consumer logic must be idempotent, since the same message can be delivered and processed more than once",
          "Consumers must be single-threaded",
          "It only applies to Kafka, not RabbitMQ",
        ],
        correct: 1,
        explain: "At-least-once means duplicates are possible by design — the consumer, not the broker, is responsible for handling a message safely if it arrives twice.",
      },
    ],
  },
  {
    id: "pbh-part6",
    bookId: "pbh",
    partIndex: 6,
    partName: "Part VI — File & Document Engineering",
    questions: [
      {
        q: "Why is validating an uploaded file's magic bytes safer than trusting its `Content-Type` header?",
        options: [
          "Magic bytes are faster to check",
          "The Content-Type header and file extension are both entirely client-controlled and trivially spoofable; the actual byte content is not",
          "Magic bytes are required by HTTP",
          "It only matters for image files",
        ],
        correct: 1,
        explain: "A client can label any file as anything in its header — checking the actual leading bytes is the only way to verify real content type.",
      },
      {
        q: "Why must an uploaded file's storage path never be derived from the client-supplied filename?",
        options: [
          "It's slower to parse",
          "A crafted filename (e.g. containing `../`) could enable path traversal to write outside the intended directory",
          "Filenames are case-sensitive on some systems",
          "It has no security implication, only a style one",
        ],
        correct: 1,
        explain: "Generating a fresh server-side key (e.g. a UUID) makes path traversal via a malicious filename structurally impossible.",
      },
      {
        q: "Why is `defusedxml` recommended over the standard library's XML parser for untrusted input?",
        options: [
          "It parses XML faster",
          "The standard library's XML parser is vulnerable to XXE (XML External Entity) attacks on untrusted input by default",
          "It supports more XML versions",
          "It's required for JSON compatibility",
        ],
        correct: 1,
        explain: "XXE can be used to read local files or make server-side requests via a malicious XML document — defusedxml disables the vulnerable entity-expansion behavior.",
      },
      {
        q: "Why should large file uploads be streamed in chunks rather than read fully into memory first?",
        options: [
          "Streaming is required by the HTTP spec",
          "Buffering the whole file means memory usage scales with the largest possible upload, risking exhaustion under large or concurrent uploads",
          "Chunked reads are always faster on disk",
          "It's only relevant for video files",
        ],
        correct: 1,
        explain: "Streaming keeps memory usage bounded regardless of file size — buffer-then-process ties memory directly to the size of whatever gets uploaded.",
      },
      {
        q: "In a document-ingestion pipeline (e.g. for RAG), why process documents through a generator chain rather than loading everything into one big list first?",
        options: [
          "Generators are required by Python 3.11+",
          "A generator chain processes one document at a time, keeping memory bounded and isolating a single bad document's failure from the rest",
          "It makes the pipeline run in parallel automatically",
          "It removes the need for error handling",
        ],
        correct: 1,
        explain: "Streaming through a generator chain means one corrupt document doesn't require the whole batch to already be in memory, and its failure can be isolated.",
      },
    ],
  },
  {
    id: "pbh-part7",
    bookId: "pbh",
    partIndex: 7,
    partName: "Part VII — Backend Architecture",
    questions: [
      {
        q: "In a layered architecture (routes → service → repository), what should the service layer NOT know about?",
        options: [
          "Business rules",
          "The specific database/ORM details used by the repository layer",
          "Which use case it's serving",
          "Input validation",
        ],
        correct: 1,
        explain: "Keeping the service layer ignorant of storage specifics is what lets the repository's implementation change (or be swapped for a fake in tests) without touching business logic.",
      },
      {
        q: "Why use `SecretStr` (or similar) for configuration values like API keys instead of plain strings?",
        options: [
          "It encrypts the value in memory",
          "It prevents the value from being accidentally exposed in logs, reprs, or error messages",
          "It's required for environment variables to load at all",
          "It makes the value immutable",
        ],
        correct: 1,
        explain: "SecretStr's repr masks the value by default, closing off the common accidental-leak path of a secret ending up in a stack trace or debug log.",
      },
    ],
  },
  {
    id: "pbh-part8",
    bookId: "pbh",
    partIndex: 8,
    partName: "Part VIII — Testing",
    questions: [
      {
        q: "What's the key difference between a mock and a fake in testing?",
        options: [
          "They're the same thing with different names",
          "A mock records/verifies calls made to it; a fake is a real, working (simplified) implementation that satisfies the same interface",
          "Fakes can only be used in integration tests",
          "Mocks are always faster",
        ],
        correct: 1,
        explain: "A Protocol-satisfying fake repository (e.g., an in-memory dict) behaves like the real thing for the test's purposes, while a mock just tracks interactions.",
      },
      {
        q: "Why do Testcontainers-based integration tests typically wrap each test in a transaction that's rolled back afterward?",
        options: [
          "It's faster to always start with a completely fresh container per test",
          "It gives each test a clean database state without paying the cost of restarting the container every time",
          "It's required by the testing framework",
          "Rollback is the only way to run tests in parallel",
        ],
        correct: 1,
        explain: "Rolling back a transaction after each test is much cheaper than tearing down and recreating a whole container, while still guaranteeing test isolation.",
      },
    ],
  },
  {
    id: "pbh-part9",
    bookId: "pbh",
    partIndex: 9,
    partName: "Part IX — Performance Engineering",
    questions: [
      {
        q: "What should you always do before optimizing a slow function?",
        options: [
          "Rewrite it in a faster language",
          "Profile it first to confirm it's actually the bottleneck, rather than guessing",
          "Add more caching everywhere",
          "Increase the server's CPU allocation",
        ],
        correct: 1,
        explain: "Guessing at bottlenecks wastes more time than profiling would have — this handbook's single most repeated performance-engineering rule.",
      },
      {
        q: "Why compare `tracemalloc` snapshots by growth in object count, not absolute count, when hunting a memory leak?",
        options: [
          "Absolute counts are always inaccurate",
          "A large absolute count can be normal steady-state usage; it's specifically growth over time that indicates an unbounded leak",
          "tracemalloc can only report growth, not totals",
          "Growth is easier to read in the console output",
        ],
        correct: 1,
        explain: "Many objects existing at once can be entirely healthy — the leak signature is a count that keeps climbing across snapshots taken over time.",
      },
    ],
  },
  {
    id: "pbh-part10",
    bookId: "pbh",
    partIndex: 10,
    partName: "Part X — Security",
    questions: [
      {
        q: "Why return an identical 404 for both a genuinely nonexistent resource and one that exists but the user isn't authorized for?",
        options: [
          "404 is simply the default status code",
          "A distinct 403 would let an attacker enumerate which IDs exist versus which are merely forbidden (an IDOR/enumeration risk)",
          "It's required by the HTTP specification",
          "It makes error handling code shorter",
        ],
        correct: 1,
        explain: "Making 'doesn't exist' and 'exists but forbidden' indistinguishable closes off attempts to probe which resource IDs are valid.",
      },
      {
        q: "Why are bcrypt/argon2 preferred over SHA-256 for password hashing?",
        options: [
          "SHA-256 isn't a real hash function",
          "bcrypt/argon2 are deliberately slow and salted, making brute-force guessing computationally expensive; SHA-256's speed is a liability here",
          "bcrypt produces shorter output",
          "SHA-256 can't be used in Python",
        ],
        correct: 1,
        explain: "A fast hash lets an attacker with a leaked hash try billions of guesses per second — deliberate slowness is a feature for password storage specifically.",
      },
    ],
  },
  {
    id: "pbh-part11",
    bookId: "pbh",
    partIndex: 11,
    partName: "Part XI — Production Backend Engineering",
    questions: [
      {
        q: "What's the actual difference between a liveness probe and a readiness probe?",
        options: [
          "They're two names for the same check",
          "Readiness failing stops new traffic without restarting the pod; liveness failing triggers a restart",
          "Liveness only applies to databases",
          "Readiness checks run only once at startup",
        ],
        correct: 1,
        explain: "These represent genuinely different responses to different failure conditions — conflating them causes either unnecessary restarts or stuck, unhealthy pods still receiving traffic.",
      },
      {
        q: "In a three-state circuit breaker, what does the Half-Open state actually do?",
        options: [
          "It permanently blocks all future calls",
          "After a cooldown, it allows exactly one trial call through to test whether the dependency has recovered",
          "It doubles the number of retries",
          "It's identical to the Closed state",
        ],
        correct: 1,
        explain: "Half-Open is the controlled 'is it safe to try again yet' probe — a single trial call decides whether to fully reopen (Closed) or trip back to Open.",
      },
    ],
  },
  {
    id: "pbh-part12",
    bookId: "pbh",
    partIndex: 12,
    partName: "Part XII — Python Backend Failure Engineering",
    questions: [
      {
        q: "If a workload is genuinely CPU-bound, why doesn't converting it to async help?",
        options: [
          "Async only works with databases",
          "Async provides concurrency for I/O waits; a CPU-bound task has no waiting to overlap, so there's nothing for async to gain",
          "CPU-bound code can't run inside an event loop at all",
          "It does help, this is a myth",
        ],
        correct: 1,
        explain: "Async's benefit comes from overlapping I/O waits across many tasks — a pure computation has no wait to overlap, so async can even add slight overhead with zero benefit.",
      },
      {
        q: "Why is a missing timeout the most common root cause behind a hung worker?",
        options: [
          "Timeouts are rarely actually useful",
          "Without a timeout, a call to an unresponsive dependency can suspend the calling code indefinitely, with nothing to force it to give up",
          "Missing timeouts only affect logging",
          "It's actually deadlocks, not timeouts, that are most common",
        ],
        correct: 1,
        explain: "A timeout converts an unbounded hang into a bounded, recoverable failure — its absence is why one unresponsive dependency can freeze a whole worker forever.",
      },
    ],
  },
  {
    id: "pbh-part13",
    bookId: "pbh",
    partIndex: 13,
    partName: "Part XIII — Capstone (Fieldnote)",
    questions: [
      {
        q: "In the Fieldnote capstone's five-question ADR format, what's the purpose of question 5 ('what would make us revisit this')?",
        options: [
          "It's just a formality with no real use",
          "It states, at decision time, the concrete condition that should trigger reopening the decision later — turning a static choice into a tested prediction",
          "It's used to assign the decision to a specific engineer",
          "It only applies to database-related decisions",
        ],
        correct: 1,
        explain: "The capstone retrospective showed two of thirteen ADRs were revisited exactly when their own stated trigger predicted — a direct payoff of writing this down at decision time.",
      },
      {
        q: "Why did Fieldnote deliberately use in-memory storage in Stage 1 instead of PostgreSQL from day one?",
        options: [
          "PostgreSQL wasn't available yet",
          "Stage 1's only goal was proving the API/route shape; adding real persistence before that need existed would be premature",
          "In-memory storage is always the better choice",
          "It was a mistake that had to be fixed later",
        ],
        correct: 1,
        explain: "This is the one ADR explicitly designed to be revisited (and it was, at Stage 4) — a deliberate, scoped simplification, not an oversight.",
      },
    ],
  },
  {
    id: "pbh-part14",
    bookId: "pbh",
    partIndex: 14,
    partName: "Part XIV — Engineering Mastery",
    questions: [
      {
        q: "What is the single most common reason a technically strong candidate underperforms in a system-design interview?",
        options: [
          "Not knowing enough algorithms",
          "Naming a specific technology in the first minute, before requirements are clarified",
          "Talking too slowly",
          "Not drawing a diagram",
        ],
        correct: 1,
        explain: "Jumping to a technology before establishing requirements signals memorized pattern-matching rather than genuine reasoning — this handbook's most repeated interview trap.",
      },
      {
        q: "Why is retrying a non-idempotent operation (like a payment charge) without an idempotency key dangerous?",
        options: [
          "It's slower than not retrying",
          "It converts a single transient failure into a risk of a duplicate real-world side effect, like a double charge",
          "It only matters for GET requests",
          "Retries are always automatically safe",
        ],
        correct: 1,
        explain: "Retries are a correctness-neutral improvement only when the underlying operation is idempotent — otherwise they trade a failure for a possible duplicate.",
      },
    ],
  },
];

export function quizForPart(bookId, partIndex) {
  return QUIZZES.find((q) => q.bookId === bookId && q.partIndex === partIndex) || null;
}
export function quizById(id) {
  return QUIZZES.find((q) => q.id === id) || null;
}
export function quizResultFor(quizResults, quizId) {
  return quizResults?.[quizId] || null;
}
