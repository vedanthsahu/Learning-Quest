## 7. Mental Model: Prompt and Context Engineering

### 7.1 The Problem: The Prompt Is the Only Interface You Have

Unlike ordinary software, where you can add a new function, a new API endpoint, or a new configuration flag to change behavior, an LLM's behavior for a given request is shaped entirely by what's inside its context window at that moment — the system instructions, the conversation history, any retrieved documents (§6), and the user's own message. **Prompt engineering** is the discipline of deliberately shaping that content to reliably produce the desired behavior; **context engineering** is the broader discipline of deciding *what* belongs in that limited, priced (§2.5, §15) space at all, and what should be left out, summarized, or retrieved just-in-time instead.

### 7.2 System Prompts vs. User Messages: Two Different Jobs

A **system prompt** sets persistent instructions and persona for the entire conversation (tone, role, constraints, output format) and is typically not shown to or writable by the end user directly — the equivalent of a fixed configuration set by the product's engineers. The **user message** is the specific, per-turn request. Conflating these — putting behavior-defining instructions inside a user-editable field — is a direct, common cause of the prompt injection vulnerability developed fully in §13 and §30: if a "user message" field can override core behavior instructions, anything an attacker can get into that field (including, notably, retrieved document content in a RAG system, §6) can potentially hijack the model's behavior.

### 7.3 Few-Shot vs. Zero-Shot: Showing, Not Just Telling

**Zero-shot** prompting asks the model to perform a task from instructions alone, with no examples. **Few-shot** prompting includes a small number of worked examples of the desired input/output pattern directly in the prompt — often dramatically improving reliability for tasks with a specific, non-obvious output format (a particular JSON schema, a particular tone), at the direct cost of consuming more of the context window (and more tokens, §15) on every single request. The engineering tradeoff: few-shot examples are a cheap, fast way to improve reliability without fine-tuning (§9), but they are a recurring, per-request cost — if the same few-shot pattern is needed on every request, prompt caching (§7.6, §24) becomes directly relevant to controlling that recurring cost.

### 7.4 Chain of Thought: Letting the Model "Show Its Work"

**Chain of Thought (CoT)** prompting asks the model to work through a problem step by step in its output, rather than jumping directly to a final answer — empirically improving accuracy on tasks requiring multi-step reasoning (arithmetic, logic, multi-part questions), because the model's own intermediate, generated tokens become additional context it can condition subsequent tokens on, rather than needing to arrive at a complex answer in a single, un-scaffolded leap. It is important to distinguish this prompting technique — asking a model to *narrate* a reasoning process in its output — from a **reasoning model's** internal, architecturally-different extended computation (§19), which is a distinct, model-level capability rather than a prompting pattern applied to any model.

### 7.5 Tree of Thoughts, ReAct, and Reflection: Structured Reasoning Patterns

**Tree of Thoughts (ToT)** extends CoT by exploring multiple candidate reasoning paths in parallel (rather than one single linear chain) and evaluating which path seems most promising before committing — appropriate for problems with several plausible solution strategies where committing early to one path risks getting stuck. **ReAct** (Reason + Act) interleaves reasoning steps with actual tool calls (§8's agent mental model) — the model reasons about what it needs, takes an action (a tool call), observes the result, and reasons again — the foundational pattern behind most modern agent loops. **Reflection** has the model critique its own prior output and revise it, a simple but often effective technique for catching a model's own errors before they reach the user, at the direct cost of at least one additional generation pass (more latency and tokens, §15, §32).

### 7.6 Context Compression, Prompt Compression, and Prompt Caching

As conversations or retrieved context grow, three distinct techniques manage the resulting cost and context-window pressure. **Context compression** (developed fully in §23-24) summarizes or selectively prunes retrieved/historical content before it enters the prompt, keeping only what's genuinely relevant to the current turn. **Prompt compression** applies more aggressive, sometimes lossy techniques (removing redundant phrasing, using a smaller model to compress a large context into a denser summary) specifically to reduce token count while preserving essential meaning. **Prompt caching** is different in kind from the other two — rather than reducing content, it exploits the fact (already introduced generically in the companion handbook's §55.4 for AI infrastructure) that many requests share an identical prefix (the same system prompt, the same few-shot examples), letting a provider skip redundant computation for that shared portion and charge less for it — a pure engineering optimization with no content tradeoff at all, developed mechanically in §24.

### 7.7 Engineering Intuition

> **How do I know if a poor response is a prompt problem or a model-capability problem?** Try the same request with a more capable model (§1.5's tier triangle) — if quality improves substantially, the underlying task may be near the current model's capability ceiling; if it doesn't improve, the prompt itself (structure, missing examples, ambiguous instructions) is more likely the issue.
>
> **What symptoms indicate a prompt-injection-shaped vulnerability (§13) rather than an ordinary prompt bug?** User-controllable or retrieved content directly influencing behavior meant to be fixed by the system prompt (§7.2) — this is a security concern, not merely a prompt-quality one.
>
> **What would over-engineering look like here?** Reaching for Tree of Thoughts or a multi-step Reflection loop (§7.5) for a simple, well-defined extraction or classification task that a plain zero-shot prompt already handles reliably — added latency and cost with no accuracy benefit for a task that was never actually hard.

### 7.8 Decision Tree: Which Prompting Technique Fits?

```
Is the task a simple, well-defined classification/extraction
with an obvious output format?
  YES -> Zero-shot, possibly with a brief system prompt (§7.2).
  NO  -> Does the desired output need a specific, non-obvious
         format or style the model doesn't reliably produce
         zero-shot?
    YES -> Few-shot examples (§7.3) -- weigh against prompt
           caching (§7.6) if the same examples repeat every call.
    NO  -> Does the task require multi-step reasoning
           (arithmetic, logic, multi-part analysis)?
      YES -> Chain of Thought (§7.4); Tree of Thoughts (§7.5)
             specifically if multiple competing solution paths
             genuinely exist.
      NO  -> Does the task require taking real actions/using
             tools, not just generating text?
        YES -> ReAct (§7.5) -- this is the agent mental model,
               continue to §8.
```

### 7.9 Python Snippet: Few-Shot Prompt Assembly

```python
# Demonstrates §7.3: building a few-shot prompt programmatically,
# rather than hardcoding examples inline every time.

def build_few_shot_prompt(task_instruction, examples, new_input):
    example_block = "\n\n".join(
        f"Input: {ex['input']}\nOutput: {ex['output']}"
        for ex in examples
    )
    return f"""{task_instruction}

Examples:
{example_block}

Input: {new_input}
Output:"""

instruction = "Classify the sentiment of the input as positive, negative, or neutral."
examples = [
    {"input": "This product changed my life!", "output": "positive"},
    {"input": "It broke after one day.", "output": "negative"},
]
prompt = build_few_shot_prompt(instruction, examples, "It's fine, does the job.")
print(prompt)
# Every token in `example_block` above is a RECURRING cost on
# every single call -- this is exactly what §7.6's prompt
# caching exists to avoid re-billing you for, repeatedly.
```

### 7.10 Further Reading

- Wei et al., "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models" (2022) — the foundational CoT paper.
- Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models" (2022) — the foundational paper behind the agent loop pattern developed in §8 and §25.

---
