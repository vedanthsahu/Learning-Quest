## §6. Character Encoding & URL Encoding Gotchas

### 1. The Vocabulary

- **Character encoding (UTF-8)** — the rules for turning text into bytes; UTF-8 is the practical
  default for nearly everything on the web today.
- **Mojibake** — the garbled text (`Ã©` instead of `é`) you get when bytes encoded one way get
  decoded as if they were a different encoding.
- **URL encoding / percent-encoding** — replacing characters that aren't safe in a URL (spaces,
  `&`, `|`, non-ASCII characters) with a `%XX` hex sequence.
- **`encodeURIComponent` vs `encodeURI`** — the former escapes everything unsafe in a single URL
  *segment* (query value, path segment); the latter is for encoding a whole URL and deliberately
  leaves structural characters (`/`, `?`, `&`) alone.

### 2. Where It Sits, and Why Teams Use It

Every string that crosses a boundary — into a URL, into a database, into an HTML page, between
two systems with different default encodings — has to be encoded consistently on the way in and
decoded consistently on the way out. This is invisible when everything already agrees on UTF-8
(the common case today), and a genuine time-sink the moment something doesn't.

### 3. What Actually Breaks

- **A custom URL scheme silently mangled by a library.** A surprisingly common trap: building
  your own delimiter-based token to smuggle data through a URL or markdown link (e.g.
  `internal|book|chapter`), only to discover that some layer in the pipeline — a markdown parser,
  a URL sanitizer, a browser's own `href` normalization — percent-encodes "unsafe" characters like
  `|` before your code ever sees them. The fix is either to accept encoding and decode
  consistently, or to pick a delimiter (like `,` or `-`) that survives whatever's in the pipeline.
- **Special characters in a search query breaking the request** — an unescaped `&` or `#` in a
  query param value gets interpreted as a new param or a page fragment instead of literal text.
- **Mojibake in stored data** — text saved with one encoding assumption and read back with
  another; often shows up after connecting two systems (a legacy database, a CSV export) that
  don't agree on UTF-8 by default.
- **Emoji or non-Latin text breaking a "simple" string operation** — some characters (most emoji)
  are represented as *surrogate pairs* in UTF-16-based languages, so naive length/substring
  operations can split a character in half.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I encode untrusted values before putting them in a URL, and I know the difference between
  encoding a whole URL versus encoding one value going into it."
- "If I'm inventing a custom token format that travels through a URL or markdown, I check what
  actually survives the full pipeline, not just what looks right in my own code."
- "UTF-8 end to end is the goal — most encoding bugs come from a boundary where that assumption
  quietly breaks."

### 5. Interview-Ready Answer

> "Most of the time encoding is invisible because everything's UTF-8 by default. It stops being
> invisible at boundaries — building a URL, talking to a system with a different default, or
> inventing a custom delimiter-based format. My rule is: encode explicitly at every boundary,
> decode explicitly on the way back out, and never assume a special character will survive a
> pipeline untouched just because it looks fine in my own test."

### 6. Go Deeper

companion Python Backend Engineering Handbook's §38 (Structured Data Formats: CSV, Excel, JSON,
XML & ZIP) chapter covers encoding at the file and API-payload level in more depth.

---
