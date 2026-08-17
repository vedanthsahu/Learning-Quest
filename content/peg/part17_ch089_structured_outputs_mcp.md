## §89. Structured Outputs, Multi-Modal Inputs, and Tool Protocols (MCP)

### 1. The Vocabulary

- **Structured output / JSON mode** — constraining a model's response to conform to a specific
  schema, so the application can parse it reliably instead of hoping free-form text happens to be
  parseable.
- **Multi-modal input** — a model accepting more than just text (images, audio, sometimes video)
  as part of its input.
- **MCP (Model Context Protocol)** — an open, standardized protocol for connecting AI models to
  external tools and data sources, so integrations can be built once against the protocol rather
  than custom per-model/per-tool.
- **PII redaction** — automatically detecting and removing personally identifiable information
  before it's sent to (or logged alongside) a model, a real, common requirement for anything
  processing user data.

### 2. Where It Sits, and Why Teams Use It

These are the current, fast-moving practical vocabulary of AI product engineering — the specific
terms that show up in a 2025-2026-era team conversation about integrating AI features, distinct
from (but built on top of) the more stable fundamentals in §83-88.

### 3. What Actually Breaks

- **Parsing free-form text output as if it were reliable JSON** — without structured output/JSON
  mode enforced, a model can produce almost-valid JSON, extra commentary around the JSON, or
  subtly malformed structure, breaking naive parsing; structured output support (when available)
  removes this entire class of parsing bug.
- **Sending large images/audio without considering token cost** — multi-modal input often
  consumes meaningfully more tokens than the equivalent text, and that cost needs to be part of
  the same budgeting discipline as §88, not an afterthought.
- **Building a custom, one-off integration per tool instead of adopting a standard protocol** — as
  the number of tools/data sources an AI feature connects to grows, custom point-to-point
  integrations multiply maintenance burden; a standard protocol like MCP exists specifically to
  avoid that N-times-M integration problem.
- **Sending unredacted PII into a model's context (or into logs of that context)** — a real,
  common compliance and privacy gap if user data flows into prompts or gets logged without
  redaction, especially if that data might be retained by a third-party provider.

### 4. What a 2-3 Year Engineer Should Be Able to Say

- "I use structured output/JSON mode when available, rather than parsing free-form text and
  hoping it's valid JSON."
- "Multi-modal input has real token cost implications, and I factor that into the same cost
  budgeting as any other LLM usage."
- "I'd reach for a standard protocol like MCP rather than building custom integrations per tool,
  once there's more than a couple of external tools or data sources involved."
- "I check whether PII is flowing into prompts or logs, and redact it if it is."

### 5. Interview-Ready Answer

> "For anything where I need to reliably parse a model's output programmatically, I use structured
> output/JSON mode rather than parsing free-form text and hoping it's valid. For connecting a
> model to multiple external tools or data sources, I'd lean toward a standard protocol like MCP
> instead of custom integrations per tool, since that avoids a maintenance burden that grows with
> every new tool added. And regardless of the specific feature, I check whether any PII is
> flowing into prompts or being logged alongside them, since that's a real, common compliance gap
> in AI features specifically."

### 6. Go Deeper

companion AI Systems Handbook's §25 (Agent Mechanics: tool calling, memory, MCP, A2A) chapter for
the fuller architectural treatment of tool integration and data handling.

---
