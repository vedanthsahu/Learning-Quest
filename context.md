CONTEXT

I am preparing for the Anthropic Claude Certified Developer – Foundations (CCDV-F) certification.

My goal is NOT to blindly memorize the official syllabus. I want to build a practical, exam-oriented understanding of the Claude ecosystem so that I can recognize concepts in scenario-based questions and understand how they behave in real applications.

I am a Python backend engineer with experience in:
- Python and FastAPI
- Async backend systems
- REST APIs
- RAG systems
- FAISS / Milvus
- LLM applications
- Local LLMs
- AI orchestration
- Backend architecture
- PostgreSQL
- AWS
- Observability
- Production-oriented AI system design

Therefore, do NOT waste excessive space teaching generic programming or generic AI concepts that an experienced backend/AI engineer would already understand.

My main weakness is Claude-specific exposure.

From two 53-question practice exams taken BEFORE studying, I scored:
- Mock 1: 43/53 = 81.1%
- Mock 2: 40/53 = 75.5%

The mistakes were concentrated around Claude-specific mechanics and terminology rather than fundamental software engineering or AI concepts.

Important gaps identified from the mocks included:
- Claude API mechanics
- Claude Code
- Skills and SKILL.md
- Claude Code vs API capabilities
- Prompt caching
- Thinking blocks
- `output_config.effort`
- MCP responsibilities and architecture boundaries
- Model lifecycle and deprecation
- Safe model migration and model pinning
- Context accumulation and context management
- Structured output / JSON schema
- Semantic validation and silent failures
- Managed/self-hosted deployment boundaries

Therefore, this document should be designed to close that exposure gap.

DOCUMENT OBJECTIVE

Create a comprehensive CCDV-F Developer Foundations study handbook.

The handbook should combine:
1. Exam preparation
2. Practical Claude developer knowledge
3. Scenario-based reasoning
4. Production engineering perspective

The goal is that after studying this document, I should be able to answer questions such as:

"What should the developer do in this situation?"

rather than merely:

"What does this term mean?"

For every important concept, explain:
- What it is
- Why it exists
- How it works
- Where it fits architecturally
- When to use it
- When NOT to use it
- Important limitations
- Common mistakes
- Exam traps
- A realistic scenario
- How it relates to other Claude concepts
- Any important implementation detail a developer should know

TEACHING STYLE

Use a senior-engineer teaching style.

Do not write this like a beginner textbook.

Prefer:
- Architecture explanations
- Request/response flows
- Decision trees
- Comparisons
- Tables
- Examples
- Failure scenarios
- "If you see X in a question, think Y" guidance
- Practical implementation reasoning

Avoid:
- Marketing language
- Generic AI hype
- Excessive repetition
- Long historical explanations
- Explaining basic programming concepts unnecessarily
- Memorization without understanding

IMPORTANT DISTINCTION

Clearly distinguish between:

A. General engineering knowledge
Things I probably already understand.

B. Claude-specific knowledge
Things I need to learn because they are specific to Anthropic's ecosystem.

C. Exam-specific traps
Details where the wording of a question can cause confusion.

D. Production knowledge
Things that may not be heavily tested but are important for actually building reliable Claude applications.

PRIORITY STRUCTURE

The checklist below is intentionally divided into priority tiers.

Do NOT give every item equal depth.

Use approximately:

TIER 1 — MUST KNOW
Deep explanations.
Multiple examples.
Scenario questions.
Architecture diagrams where useful.
Implementation-level understanding.

TIER 2 — IMPORTANT
Solid explanations.
Examples and common exam traps.
Less depth than Tier 1.

TIER 3 — LESS FREQUENT / SECONDARY
Concise but accurate explanations.
Focus on recognition and exam relevance.

TIER 4 — GOOD TO HAVE / BACKUP
Short explanations.
Focus on terminology, recognition, and unusual scenarios.
Do not allow these topics to consume the majority of the document.

CROSS-REFERENCE THE CONCEPTS

Do not treat every checklist item as an isolated chapter.

For example:

Claude API
→ tool use
→ thinking
→ context
→ caching
→ agents
→ evaluation
→ production deployment

should be explained as one connected ecosystem.

Similarly:

Claude Code
→ Skills
→ SKILL.md
→ rules
→ subagents
→ tools
→ MCP

should be connected rather than explained as unrelated definitions.

SCENARIO-BASED LEARNING

For major topics, include realistic scenarios similar to certification questions.

Example structure:

Scenario:
A production application is experiencing increasing latency because the same large system instructions and tools are being sent repeatedly.

Question:
What Claude capability should the developer consider?

Reasoning:
Explain how to identify the relevant concept and eliminate incorrect alternatives.

Exam takeaway:
A short rule that can be remembered.

Do NOT simply reproduce questions from practice exams. Create original scenarios.

EXAM TRAP SECTION

At the end of every major topic, include:

"Common Exam Traps"

with several concise bullets.

Examples of the type of distinction I want:
- API tools are not automatically Claude Code tools.
- Pinning a model does not prevent deprecation.
- `required` means field presence; `enum` constrains allowed values.
- Context does not automatically forget old information.
- MCP server responsibilities are different from host/client responsibilities.
- A successful HTTP response does not necessarily mean semantic success.

The document should train me to recognize these distinctions quickly.

IMPLEMENTATION MINDSET

Whenever possible, answer:

"What would I actually have to do in code or architecture?"

For API concepts, show simplified request/response examples when useful.

For architecture concepts, show flows such as:

Application
→ Claude API
→ tool call
→ application executes tool
→ tool result
→ Claude
→ final response

For MCP:

Host
→ MCP client
→ MCP server
→ external system

For agents:

User
→ agent
→ reasoning/planning
→ tool
→ observation
→ next step
→ termination

Use diagrams where they materially improve understanding.

DO NOT OVERFOCUS ON CODE

This is a developer certification, not a programming exam.

Code examples should be:
- Short
- Illustrative
- Correct
- Focused on the concept

Do not turn every section into a coding tutorial.

KNOWLEDGE VALIDATION

At the end of each major Tier 1 topic, include a small "Check Yourself" section with approximately 3–5 original questions.

Questions should test:
- Concept recognition
- Scenario reasoning
- Choosing between similar concepts
- Understanding boundaries
- Failure handling

Put answers and explanations immediately after the questions or in a clearly separated answer section.

FINAL REVISION SECTION

At the end of the document, create:

1. "CCDV-F Final Revision Sheet"
   - Extremely condensed
   - One or two pages if possible
   - High-value facts only

2. "Claude-Specific Things I Must Not Confuse"
   - Short comparison table

3. "Exam Decision Rules"
   - If X → think Y
   - If X is happening → avoid Y
   - If requirement says A → use B

4. "Last-Day Checklist"
   - What I should revise immediately before the exam

5. "Weakness Tracker"
   - A checklist where I can mark concepts as:
     [ ] Not learned
     [ ] Learned
     [ ] Can explain
     [ ] Can answer scenario questions
     [ ] Exam ready

ACCURACY REQUIREMENT

Do not invent Claude features or API behavior.

Where a detail is version-dependent, clearly mark it as version-dependent and explain the stable underlying concept.

If there is uncertainty about an exact current Anthropic API parameter, behavior, or product feature, flag it rather than confidently inventing an answer.

The purpose of this document is to become my primary study handbook, so technical accuracy matters more than making the document sound polished.

STRUCTURE

Start with:

"How to Use This Handbook"

Explain that I should not read the document passively.

Recommended workflow:

1. Learn the concept.
2. Understand the architecture.
3. Study the example.
4. Review the exam traps.
5. Answer the check-yourself questions.
6. Explain the concept in my own words.
7. Mark the weakness tracker.
8. Return to failed concepts after practice exams.

Then organize the rest according to the priority tiers in the checklist below.

IMPORTANT

The checklist below is the scope to cover.

Do not remove topics from it.

Do not collapse major topics into one-line definitions.

However, do not give Tier 3 and Tier 4 the same depth as Tier 1.

The final document should feel like a practical engineering handbook for someone who already understands backend/AI engineering but needs deep exposure to Anthropic's Claude ecosystem and the CCDV-F exam.

CCDV-F Developer Foundations — Master Checklist
Tier 1 — MUST KNOW
These are the things I would want you to be able to answer without hesitation.
1. Claude API fundamentals
- [ ] Messages API
- [ ] System prompts
- [ ] User/assistant message structure
- [ ] Stateless nature of API calls
- [ ] Conversation history management
- [ ] max_tokens
- [ ] Temperature / sampling concepts
- [ ] Model IDs and model selection
- [ ] Streaming responses
- [ ] Token usage
- [ ] Input vs output tokens
- [ ] API errors and basic error handling
- [ ] Rate limits
- [ ] Retries / exponential backoff
- [ ] API authentication
- [ ] API vs Claude Code capabilities
- [ ] What must explicitly be supplied in an API request
Your mock weakness: Q7.
2. Prompt engineering
- [ ] System prompt vs user prompt
- [ ] Clear task specification
- [ ] Role/context/instructions
- [ ] Constraints
- [ ] Delimiters
- [ ] Few-shot prompting
- [ ] When examples help
- [ ] When examples become excessive
- [ ] Structured output
- [ ] Asking for JSON
- [ ] Schema-based outputs
- [ ] enum
- [ ] required
- [ ] Validation
- [ ] Prompt injection awareness
- [ ] Separating trusted instructions from untrusted data
- [ ] Long-context prompting
- [ ] Context placement
- [ ] Instruction hierarchy
Your mock weaknesses: Q33, Q45.
3. Context engineering
This deserves special attention because it overlaps heavily with your backend/RAG interests.
- [ ] Context window
- [ ] Token limits
- [ ] Conversation history
- [ ] Context accumulation
- [ ] Explicit context pruning
- [ ] Summarization/compaction
- [ ] Retrieval vs dumping everything into context
- [ ] Relevant vs irrelevant context
- [ ] Context prioritization
- [ ] Long-document handling
- [ ] Context management in agents
- [ ] What happens when context keeps accumulating
Your mock weakness: Q48.
4. Tool use / function calling
- [ ] What a tool is
- [ ] Tool definitions
- [ ] Tool schemas
- [ ] Tool input
- [ ] Tool output
- [ ] Tool-use loop
- [ ] Model decides when to call a tool
- [ ] Application executes the tool
- [ ] Application returns result
- [ ] Model continues reasoning
- [ ] Multiple tool calls
- [ ] Parallel tool calls
- [ ] Tool errors
- [ ] Tool validation
- [ ] Tool permissions
- [ ] Tool safety
- [ ] Tool-use termination
You should understand the actual request/response flow, not just definitions.
5. Agents and workflows
- [ ] Agent vs workflow
- [ ] Agent loop
- [ ] Planning
- [ ] Tool invocation
- [ ] Observation/result
- [ ] Iteration
- [ ] Termination
- [ ] Multi-step tasks
- [ ] Deterministic workflow vs autonomous agent
- [ ] When an agent is appropriate
- [ ] When a workflow is better
- [ ] Agent orchestration
- [ ] Human-in-the-loop
- [ ] Guardrails
- [ ] Failure handling
- [ ] Maximum iterations
- [ ] State management
This is particularly important for you because your existing hierarchical-AI work gives you a conceptual advantage here.
6. Claude Code
Do not assume your general coding-agent knowledge is enough.
- [ ] What Claude Code is
- [ ] Claude Code vs Claude API
- [ ] Claude Code tools
- [ ] Permissions
- [ ] Skills
- [ ] SKILL.md
- [ ] Skills vs rules
- [ ] Skills vs subagents
- [ ] Slash commands
- [ ] CLAUDE.md
- [ ] Project instructions
- [ ] User/global instructions
- [ ] Tool permissions
- [ ] Codebase understanding
- [ ] Git workflows
- [ ] Agentic coding workflow
Your mock weaknesses: Q4, Q7.
This is one of your biggest exposure gaps.
7. Model selection & optimization
- [ ] Choosing model based on task
- [ ] Capability vs cost
- [ ] Latency vs quality
- [ ] Haiku/Sonnet/Opus positioning
- [ ] Model aliases
- [ ] Model IDs
- [ ] Pinning model versions
- [ ] Model lifecycle
- [ ] Deprecation
- [ ] Migration
- [ ] Regression testing
- [ ] Production model upgrades
- [ ] Prompt compatibility across models
- [ ] Cost optimization
- [ ] Latency optimization
- [ ] Output token optimization
Your mock weaknesses: Q3, Q27.
This is very relevant to your enterprise AI systems focus.
8. Thinking / reasoning
- [ ] Extended thinking concept
- [ ] Thinking blocks
- [ ] Thinking + tool use
- [ ] Thinking budget / effort
- [ ] output_config.effort
- [ ] Reasoning vs normal generation
- [ ] Returning thinking blocks correctly
- [ ] Thinking/redacted-thinking handling
- [ ] Cost/latency implications
- [ ] When thinking is useful
- [ ] When it is unnecessary
Your mock weaknesses: Q9, Q31.
These are exactly the kind of Claude-specific mechanics you haven't encountered yet.
9. Prompt caching
- [ ] Why caching exists
- [ ] Cacheable prefixes
- [ ] Cache breakpoints
- [ ] Cache reads
- [ ] Cache writes
- [ ] Cache lifetime
- [ ] Cost implications
- [ ] Latency implications
- [ ] What can/cannot be cached
- [ ] Prefix/ordering requirements
- [ ] Interaction with tools/system prompts/context
Your mock weakness: Q8.
This should be high priority because caching is an easy place for exam questions to test precise API behavior.
10. Evaluation / testing / debugging
- [ ] Unit testing AI components
- [ ] Evaluation datasets
- [ ] Golden datasets
- [ ] Regression testing
- [ ] Automated evaluation
- [ ] LLM-as-judge
- [ ] Human evaluation
- [ ] Accuracy vs quality
- [ ] Deterministic vs nondeterministic outputs
- [ ] Semantic validation
- [ ] Tool-call validation
- [ ] Failure classification
- [ ] Silent failures
- [ ] Observability
- [ ] Debugging AI workflows
Your mock weakness: Q38.
This aligns strongly with your existing observability mindset.
11. MCP
- [ ] What MCP is
- [ ] MCP client
- [ ] MCP server
- [ ] Tools
- [ ] Resources
- [ ] Prompts
- [ ] Capability discovery
- [ ] Tool registration
- [ ] Request/response flow
- [ ] Server responsibilities
- [ ] Client responsibilities
- [ ] Host responsibilities
- [ ] Security considerations
- [ ] Authentication
- [ ] Authorization
- [ ] MCP vs ordinary API
- [ ] Sampling concept
Your mock weakness: Q28.
You don't need to become an MCP implementation expert, but you absolutely need to understand the architecture boundaries.
Tier 2 — IMPORTANT
Once Tier 1 is solid, cover these.
12. Security & safety
- [ ] Prompt injection
- [ ] Indirect prompt injection
- [ ] Jailbreaks
- [ ] Sensitive information
- [ ] Data leakage
- [ ] Least privilege
- [ ] Tool permissions
- [ ] Input validation
- [ ] Output validation
- [ ] Guardrails
- [ ] Human approval
- [ ] Sandboxing
- [ ] Secrets management
- [ ] Authentication vs authorization
- [ ] Untrusted tool output
- [ ] Agent security
13. Production architecture
- [ ] Stateless API architecture
- [ ] Session/state storage
- [ ] Queues
- [ ] Async processing
- [ ] Streaming
- [ ] Rate limiting
- [ ] Retries
- [ ] Timeouts
- [ ] Circuit breakers
- [ ] Fallbacks
- [ ] Observability
- [ ] Logging
- [ ] Metrics
- [ ] Tracing
- [ ] Cost monitoring
- [ ] SLA considerations
This is where your existing backend knowledge should make things easier.
14. Model lifecycle management
- [ ] Model versions
- [ ] Aliases
- [ ] Deprecation
- [ ] Migration strategy
- [ ] Compatibility testing
- [ ] Frozen regression set
- [ ] Canary rollout
- [ ] Rollback
- [ ] Version pinning
- [ ] Production monitoring
This is worth learning properly because it appeared twice in your 13 misses.
15. Structured outputs
- [ ] JSON
- [ ] JSON schema
- [ ] Required fields
- [ ] Optional fields
- [ ] Enum
- [ ] Type constraints
- [ ] Validation
- [ ] Retry/repair strategy
- [ ] When structured output is appropriate
- [ ] When plain text is better
16. Cost & performance optimization
- [ ] Token economics
- [ ] Input vs output cost
- [ ] Prompt caching
- [ ] Model selection
- [ ] Context reduction
- [ ] Batching where applicable
- [ ] Streaming
- [ ] Latency
- [ ] Throughput
- [ ] Rate limits
- [ ] Effort/reasoning trade-offs
17. Deployment patterns
- [ ] API-based deployment
- [ ] Managed agent deployment
- [ ] Customer-controlled tool execution
- [ ] Fully customer-controlled agent harness
- [ ] Hosted vs self-hosted responsibilities
- [ ] Security boundaries
- [ ] Data boundaries
Your mock weakness: Q52.
Tier 3 — LESS FREQUENT / SECONDARY
These aren't things I'd ignore, but don't spend your first study hours here.
Claude Code deeper features
- [ ] Advanced Skills behavior
- [ ] Advanced subagent behavior
- [ ] Hooks
- [ ] Custom commands
- [ ] MCP integration with Claude Code
- [ ] Advanced permission configuration
- [ ] Enterprise Claude Code configuration
API details
- [ ] Less-common request parameters
- [ ] Detailed streaming event types
- [ ] Advanced error types
- [ ] Fine-grained token accounting
- [ ] Edge cases around content blocks
Agents
- [ ] Complex multi-agent architectures
- [ ] Agent delegation
- [ ] Agent handoffs
- [ ] Advanced state machines
- [ ] Complex orchestration patterns
MCP
- [ ] Advanced protocol mechanics
- [ ] Sampling details
- [ ] Resource subscriptions
- [ ] Advanced transport details
- [ ] MCP authorization details
Evaluation
- [ ] Advanced evaluator design
- [ ] Statistical evaluation
- [ ] Pairwise evaluation
- [ ] Benchmark design
- [ ] Evaluation bias
Tier 4 — GOOD TO HAVE / BACKUP
These are the things I'd learn only after you are already scoring well on mocks.
- [ ] Anthropic platform ecosystem terminology
- [ ] Advanced Claude Code internals
- [ ] Rare API edge cases
- [ ] Rare MCP protocol details
- [ ] Advanced agent frameworks
- [ ] Advanced evaluation mathematics
- [ ] Fine-grained infrastructure implementation details
- [ ] Extremely specific parameter behavior that has not appeared in practice questions
- [ ] Historical/legacy Claude features
- [ ] Deep implementation details that don't affect architectural decisions
Don't spend 3 hours memorizing obscure API parameters while still being uncertain about Claude Code vs API, Skills, thinking blocks, caching, MCP boundaries, and model migration.

Just make the required length only. No need of super detailed explanations, as I will also go throught he course and documentation.