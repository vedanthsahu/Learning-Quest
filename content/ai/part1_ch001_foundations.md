# PART I — PASS 1: AI MENTAL MODELS

## 1. Foundations: What Is AI, and What Does an AI Engineer Actually Build

### 1.1 The Problem This Chapter Solves

An engineer entering the AI industry today faces a vocabulary problem before they face any technical problem: "AI," "machine learning," "deep learning," and "generative AI" are used almost interchangeably in casual conversation, yet a job description, a vendor's marketing page, and a research paper each mean something different by these terms — and choosing the wrong one as your mental model leads directly to choosing the wrong tool for a real engineering problem. This chapter's job is narrow: give you a precise enough map of these terms that every later chapter's engineering decisions make sense, and establish the one central fact this entire handbook is built around — you are not going to train a model from scratch, and you almost certainly should not.

### 1.2 A Precise, Nested Vocabulary

```
   ARTIFICIAL INTELLIGENCE (AI)
   -- any technique that makes a system behave in a way that
      seems intelligent (this includes hand-written rule
      engines and search algorithms, not just learning systems)
        |
        v
   MACHINE LEARNING (ML)
   -- a system that improves its behavior by learning patterns
      from data, rather than following hand-written rules
        |
        v
   DEEP LEARNING (DL)
   -- machine learning using multi-layered neural networks,
      specifically effective at learning patterns from very
      large, high-dimensional, unstructured data (images, audio,
      raw text) that hand-engineered features struggled with
        |
        v
   GENERATIVE AI (GenAI)
   -- deep learning models trained specifically to PRODUCE new
      content (text, images, audio, code) resembling their
      training data, rather than only classifying or predicting
      a fixed label
        |
        v
   LARGE LANGUAGE MODELS (LLMs)
   -- generative AI models specifically trained on text,
      large enough in parameter count and training data volume
      to exhibit broad, general-purpose language capability
      rather than a single narrow task
```

Each layer down this diagram is a strict subset of the layer above it — every LLM is generative AI, every generative AI system is deep learning, every deep learning system is machine learning, every machine learning system is AI, but the reverse is not true at any level. The engineering-relevant reason this nesting matters: when someone says "we're adding AI to the product," the correct first question is *which layer of this diagram do they actually mean* — a rule-based recommendation engine, a classical ML fraud-scoring model, and an LLM-powered chat assistant are all "AI" by the loosest definition, and they require completely different engineering skill sets, infrastructure, and evaluation approaches. This handbook is about the bottom two layers of the diagram — generative AI and LLMs specifically — because that is where the ChatGPT/Claude/Copilot-class products this handbook targets actually live.

### 1.3 Why You Are Not Training a Model From Scratch

Training a modern, capable LLM from scratch requires a training corpus of trillions of tokens, thousands of GPUs running for weeks to months, and a research and engineering team with deep expertise in distributed training — a capital and expertise investment measured in tens to hundreds of millions of dollars, undertaken today by a small number of organizations (OpenAI, Anthropic, Google, Meta, and a handful of others). This is not a threshold that shrinks meaningfully with better tooling — it is a threshold set by the fundamental data and compute scale required to reach general-purpose capability, and it is the direct reason this handbook's entire premise holds: for the overwhelming majority of engineers building AI products, the engineering problem is never "how do I train a better base model," it is "given one of these already-trained models as a fixed, purchased capability, how do I build a reliable, fast, affordable, safe product around it." Recognizing this distinction early is what separates productive AI engineering from a wasted detour into research territory this handbook deliberately does not cover.

### 1.4 Open vs. Closed Models: The First Real Engineering Decision

Once you accept §1.3, the first genuine engineering decision every AI product must make is which model to build on, and the highest-level fork in that decision is **open-weight** versus **closed (API-only) models**.

**Closed models** (GPT-4/5-class OpenAI models, Claude, Gemini) are accessed exclusively through a hosted API — you never see or control the model's actual weights. *Advantages*: no infrastructure to operate, typically the highest raw capability available at any given time, and the provider handles scaling, updates, and much of the underlying safety work. *Disadvantages*: you pay per token indefinitely (§15's token economics), your data passes through a third party (a real consideration for regulated or sensitive data), and you have no ability to fine-tune the model's actual weights (only prompt-level and, for some providers, limited fine-tuning-API-level customization).

**Open-weight models** (Llama, Mistral, Qwen, DeepSeek, and others) are downloadable, and you can run them on your own infrastructure or a cloud GPU you control. *Advantages*: full control over deployment, data never leaves your infrastructure, and genuine fine-tuning (§26) of the actual model weights is possible. *Disadvantages*: you now own GPU procurement, serving infrastructure (§27-28), and — critically — the ongoing operational burden of a system that used to be someone else's problem when it was a hosted API.

This is a direct instance of the managed-versus-self-hosted tradeoff already developed generically in the companion handbook (§13.4-13.6 there) — closed models are the "fully managed" end of the spectrum, open-weight models are "you provision and operate it yourself," and the decision criteria transfer directly: data sensitivity, cost at your actual volume, and whether you have (or want to build) the operational expertise to run inference infrastructure.

### 1.5 Model Families and the Capability/Cost/Latency Triangle

Within both the open and closed categories, providers typically offer several model sizes/tiers (a small, fast, cheap model; a mid-tier model; a large, most-capable, most-expensive model). The engineering-relevant fact: these tiers are not simply "better or worse" — they occupy different points on a **capability, cost, and latency triangle**, and the single most common early mistake in AI product engineering is defaulting to the most capable (and most expensive, slowest) model for every request, rather than matching model tier to the actual requirement of each specific task. A request classifying a support ticket into one of five categories rarely needs the same model capability as a request drafting a nuanced legal summary — and routing the former to a small, fast, cheap model while reserving the largest model for the latter (a pattern named explicitly as **model routing** in §27) is one of the highest-leverage, lowest-risk cost optimizations available to any AI product, precisely because it costs nothing in product quality when applied correctly.

### 1.6 AI Capabilities and Limitations: What These Systems Are Actually Good and Bad At

An LLM is fundamentally a system trained to predict the statistically most plausible next piece of text given everything before it — an extraordinarily powerful capability for tasks that are fundamentally about producing plausible, well-formed language (summarization, drafting, explaining, translating, conversing, and, surprisingly effectively, code generation, since code is itself a structured language). It is fundamentally *not* a database, a calculator, or a guaranteed source of factual truth — it has no built-in mechanism distinguishing a well-formed, plausible-sounding false statement from a well-formed, plausible-sounding true one, which is the root cause of **hallucination** (confidently generating incorrect information), covered in full production depth in §35. This single fact — plausibility, not truth, is what the model is actually optimizing for — is the reason nearly every architectural pattern in this handbook (RAG, evaluation, guardrails) exists: they are all, in one way or another, engineering compensations for exactly this gap between "sounds right" and "is right."

### 1.7 The AI Product Lifecycle

Building an AI product follows a lifecycle distinct from ordinary software in one specific, consequential way: ordinary software's correctness can typically be verified by a deterministic test suite (the companion handbook's §15.2), while an AI product's quality is probabilistic and must be *evaluated*, continuously, against representative examples — a discipline this handbook develops in full starting at §12 and §29. A realistic lifecycle looks like: prototype (validate the core idea works at all, often with the largest available closed model and no optimization), productionize (add RAG/tools/memory as the product's actual requirements demand, per each of Parts I-III's chapters), evaluate (build the golden-dataset and automated evaluation discipline before, not after, scaling traffic), optimize (model routing, caching, quantization — §27, §33 — once cost and latency are measured, not guessed at), and operate (observability, incident response, continuous evaluation — §31, §41-42 — for as long as the product exists). Skipping the evaluation step and jumping straight from prototype to scaled production is the single most common structural mistake this handbook will return to repeatedly, because it is the AI-product-specific instance of the companion handbook's general warning (§1.5 there) against adopting sophistication — or, in this case, skipping necessary rigor — without the discipline to know whether it's actually working.

### 1.8 Engineering Intuition

> **How do I know which model tier to reach for on a new feature?** State the task's actual required capability level explicitly (classification, extraction, and simple formatting rarely need a frontier model) before defaulting to the largest available model — §1.5's triangle should be a deliberate choice, not an accident of using whatever model you tested with first.
>
> **What symptoms indicate a team has confused "AI" for "LLM" and built the wrong solution?** A classical, well-structured prediction problem (fraud scoring on structured transaction fields, demand forecasting) being routed through an LLM prompt instead of a purpose-built classical ML model — often slower, more expensive, and less accurate than the simpler tool the nested hierarchy in §1.2 would have pointed to directly.
>
> **What would over-engineering look like at this foundational stage?** Standing up open-weight model infrastructure (§1.4, §27-28) before a closed-model API has even validated that the product idea works — exactly the "sophistication before the constraint exists" mistake from the companion handbook's §1.5, now in its AI-specific form.
>
> **What would a startup do, versus a large enterprise?** A startup should default to a closed-model API for as long as possible, optimizing model routing (§1.5) before ever considering open-weight self-hosting. A large enterprise with genuine data-residency requirements, or sustained volume large enough to make the cost math favor self-hosting (directly the same crossover logic as the companion handbook's §68.7), may justify open-weight infrastructure much earlier.

### 1.9 Decision Tree: Closed API vs. Open-Weight Model

```
Do you have a hard data-residency/compliance requirement that
forbids sending data to a third-party API?
  YES -> Open-weight, self-hosted (§1.4).
  NO  -> Is your sustained inference volume large enough that
         self-hosting's infrastructure cost is measurably lower
         than API cost at that volume? (Do this math explicitly,
         per §15's token economics -- don't guess.)
    NO  -> Closed API. Simpler, no infrastructure burden, and
           usually the highest available capability.
    YES -> Do you have (or are you willing to build) genuine
           GPU-serving operational expertise (§27-28)?
      NO  -> Stay on a closed API despite the cost math -- the
             operational risk of under-resourced self-hosting
             usually outweighs the savings.
      YES -> Open-weight, self-hosted is justified.
```

### 1.10 Python Snippet: Your First Model Call, Read Correctly

```python
# The smallest possible "AI engineering" artifact: one API call.
# What matters here is not the call itself but reading its
# response object correctly -- every field below becomes a
# whole chapter later in this handbook.

from openai import OpenAI  # any closed-model provider's SDK is structurally similar

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o-mini",          # the model TIER choice from §1.5
    messages=[
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user", "content": "Explain what a token is, in one sentence."},
    ],
    temperature=0.2,               # sampling behavior -- see §19
)

print(response.choices[0].message.content)   # the actual generated text

usage = response.usage
print(f"prompt_tokens={usage.prompt_tokens}")      # your INPUT cost -- §15
print(f"completion_tokens={usage.completion_tokens}")  # your OUTPUT cost -- §15
print(f"total_tokens={usage.total_tokens}")        # what you're billed on
```

Every field printed at the bottom of this snippet — `prompt_tokens`, `completion_tokens` — is not incidental telemetry. It is the literal unit your cloud bill is computed from, and understanding exactly how a sentence becomes that number is the entire subject of Chapter 15.

### 1.11 Further Reading

- Andrej Karpathy, "Deep Dive into LLMs like ChatGPT" (YouTube/blog) — an unusually clear, engineering-first explanation of what modern LLMs actually are, avoiding unnecessary academic depth.
- The Stanford CRFM/HELM project's model comparison documentation — a practical, continuously-updated reference for comparing open and closed model capabilities.

---
