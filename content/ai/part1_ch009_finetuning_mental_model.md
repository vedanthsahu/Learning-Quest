## 9. Mental Model: Fine-Tuning and Adaptation

### 9.1 The Problem: Sometimes Prompting and RAG Genuinely Aren't Enough

§6.4 introduced the RAG-versus-fine-tuning question. This chapter develops the fine-tuning side properly: sometimes a base model's *behavior* — its tone, its output format consistency, its skill at a narrow, specialized task — needs to change in a way no amount of prompting or retrieved context reliably achieves, because the underlying capability or behavioral tendency simply isn't there to be prompted out. **Fine-tuning** adjusts a model's actual internal weights, using additional training data, to shift its behavior more durably and consistently than any prompt can.

### 9.2 The Adaptation Spectrum: From Full Retraining to a Frozen Model

```
MOST INVASIVE                                    LEAST INVASIVE
Continued Pretraining -> SFT -> PEFT (LoRA/QLoRA) -> Prompting
     |                     |          |                  |
  retrain on          supervised   adjust a SMALL     no weight
  large domain        fine-tuning  number of          changes at
  corpus, adjusting   on labeled   additional          all -- pure
  broad model         input/output parameters,         in-context
  knowledge           pairs        leaving most of      instruction
                                   the base model
                                   FROZEN
```

**Continued pretraining** extends a base model's training on a large volume of domain-specific text (medical literature, legal documents), broadening its general domain knowledge without task-specific labels — expensive, and appropriate only when a domain's language and concepts are genuinely underrepresented in the base model's original training data. **Supervised Fine-Tuning (SFT)** trains the model on explicit input/output example pairs for a specific task or behavior, adjusting the full model (or a large fraction of it) — more targeted than continued pretraining, still comparatively expensive and requiring a genuine, well-curated labeled dataset (§9.6).

### 9.3 PEFT, LoRA, and QLoRA: Adapting Without Retraining Everything

**Parameter-Efficient Fine-Tuning (PEFT)** is a family of techniques that adapt a model's behavior by training only a small number of additional parameters, while keeping the vast majority of the original model's weights completely frozen — dramatically reducing the compute, memory, and data required compared to full fine-tuning, while still meaningfully shifting behavior for many practical purposes. **LoRA (Low-Rank Adaptation)** is the most widely-used PEFT technique: instead of updating a model's large weight matrices directly, it trains small, additional "low-rank" matrices that are combined with the frozen original weights at inference time — capturing the needed behavioral adjustment in a far smaller number of trainable parameters. **QLoRA** combines LoRA with quantization (representing the frozen base model's weights in lower precision, §27) specifically to reduce the GPU memory required during fine-tuning itself, making it practical to fine-tune large models on much more modest, affordable hardware. **Adapters** and **prompt/prefix tuning** are further, related PEFT variants — adapters insert small trainable modules between a model's existing layers; prompt/prefix tuning learns a small set of additional "virtual tokens" prepended to every input, adjusting behavior without touching the model's core weights at all.

### 9.4 RLHF, DPO, and Constitutional AI: Aligning Behavior, Not Just Teaching Facts

**RLHF (Reinforcement Learning from Human Feedback)** is the technique most responsible for turning raw, next-token-predicting base models into the helpful, instruction-following assistants this handbook is actually about — humans rank multiple model outputs for the same prompt by quality/helpfulness/safety, a separate "reward model" learns to predict those human preferences, and the base model is then further trained to produce outputs the reward model scores highly. **DPO (Direct Preference Optimization)** achieves a similar alignment goal more directly, without needing to train a separate reward model at all, by optimizing directly against preference-ranked data — generally simpler and cheaper to run than full RLHF while achieving comparable results for many use cases. **Constitutional AI** (Anthropic's approach, directly relevant to understanding Claude's specific training, §57) has a model critique and revise its own outputs against a written set of principles, reducing (though not eliminating) the volume of raw human labeling otherwise required. The engineering-relevant point: these are primarily how foundation model *providers* align their base models before you ever see them — as an application engineer, you are far more likely to use lighter-weight PEFT techniques (§9.3) than to run RLHF yourself, but understanding what RLHF/DPO actually did to the model you're building on explains a great deal about why it behaves the way it does (why it refuses certain requests, why it has a particular "personality").

### 9.5 Synthetic Data and Dataset Engineering

Fine-tuning of any kind requires a genuine, well-curated dataset — and increasingly, a meaningful fraction of that data is **synthetic**: generated by another (often larger, more capable) model rather than collected purely from real human-produced examples. This is a real, practical technique (distilling a larger model's capability into training data for adapting a smaller one, §9.3's LoRA being a common recipient), but it carries a real risk worth naming explicitly: synthetic data inherits and can amplify the generating model's own biases and errors, and a fine-tuning dataset built entirely from one model's synthetic output risks teaching the fine-tuned model that same model's specific blind spots, rather than genuine ground truth. **Dataset engineering** — the deliberate curation, deduplication, quality-filtering, and balance-checking of a fine-tuning dataset — is consistently more determinative of fine-tuning success than the specific technique (SFT vs. LoRA vs. QLoRA) chosen, directly echoing the "garbage in, garbage out" principle that governs every data-dependent system this handbook or its companion covers.

### 9.6 When Should You NOT Fine-Tune? (The Question This Chapter Must Answer Directly)

Fine-tuning is one of the most commonly over-adopted techniques in real AI product engineering, reached for reflexively when a simpler fix would work — directly the AI-specific instance of the companion handbook's general warning (§1.5 there) against sophistication preceding its justifying constraint. Do not fine-tune when: the actual need is supplying current or private *facts* (use RAG, §6.4, which is faster to update and more traceable); the actual need can be met by better prompting or few-shot examples (§7.3, dramatically cheaper and faster to iterate on than any fine-tuning run); you don't yet have a genuinely large, high-quality, well-curated dataset (§9.5) — fine-tuning on a small, noisy dataset frequently makes behavior worse, not better; or you haven't yet measured, with real evaluation (§12), that prompting alone actually fails on your specific task — fine-tuning should be a response to a measured, specific gap, never a default starting point.

### 9.7 Engineering Intuition

> **How do I know if my task needs fine-tuning versus better prompting?** Exhaust prompt engineering (§7) and, if applicable, RAG (§6) first, with real evaluation (§12) measuring the gap — fine-tune only once you can point to a specific, measured, persistent behavioral or capability gap that no amount of prompt iteration closes.
>
> **What symptoms indicate a fine-tuning dataset problem rather than a technique problem?** A fine-tuned model performing worse or more inconsistently than the base model on held-out examples — very often a dataset quality/size/balance problem (§9.5), not evidence that fine-tuning "doesn't work" for the use case.
>
> **What would over-engineering look like here?** Reaching for full SFT or continued pretraining (§9.2) when LoRA/QLoRA (§9.3) would achieve the needed behavioral shift at a small fraction of the compute cost and turnaround time.

### 9.8 Decision Tree: Should I Fine-Tune?

```
Have you already tried better prompting/few-shot examples (§7)
and, if relevant, RAG (§6), with real evaluation (§12) measuring
the gap?
  NO  -> Do that first. Do not fine-tune yet.
  YES, and a real, measured, persistent gap remains
    -> Is the gap about CONSISTENT BEHAVIOR/STYLE/a narrow SKILL,
       rather than needing current or private FACTS?
      NO (it's about facts) -> Use RAG (§6.4), not fine-tuning.
      YES -> Do you have a genuinely large, high-quality,
             well-curated dataset (§9.5) for this behavior?
        NO  -> Build/curate that dataset first -- fine-tuning on
               a poor dataset will likely make things worse.
        YES -> Is your compute budget/timeline constrained?
          YES -> LoRA/QLoRA (§9.3).
          NO, and the behavioral shift needed is very broad
             -> Full SFT, or continued pretraining if even the
                domain's underlying knowledge is a genuine gap.
```

### 9.9 Python Snippet: LoRA Fine-Tuning, the Core Mechanism

```python
# Demonstrates §9.3's core idea using Hugging Face's PEFT library:
# freeze the base model, train only small additional matrices.

from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

base_model = AutoModelForCausalLM.from_pretrained("mistralai/Mistral-7B-v0.1")

lora_config = LoraConfig(
    r=8,                 # rank of the small trainable matrices --
                         # LOWER = fewer trainable params, cheaper,
                         # less expressive; a direct capability/cost dial
    lora_alpha=16,       # scaling factor for the LoRA update
    target_modules=["q_proj", "v_proj"],  # WHICH weight matrices
                                            # get adapted -- attention
                                            # projections are the
                                            # most common, highest-
                                            # leverage choice
    lora_dropout=0.05,
)

model = get_peft_model(base_model, lora_config)
model.print_trainable_parameters()
# Typically prints something like:
# trainable params: 4,194,304 || all params: 7,241,732,096 || 0.058%
# -- THIS is §9.3's entire point, made concrete: well under 1%
# of the model's parameters are actually being trained.
```

### 9.10 Further Reading

- Hu et al., "LoRA: Low-Rank Adaptation of Large Language Models" (2021) — the foundational LoRA paper.
- Dettmers et al., "QLoRA: Efficient Finetuning of Quantized LLMs" (2023) — the paper introducing QLoRA, directly extending §9.3.
- Rafailov et al., "Direct Preference Optimization" (2023) — the foundational DPO paper, extending §9.4.

---
