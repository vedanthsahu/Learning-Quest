## 26. Fine-Tuning Mechanics: SFT, Continued Pretraining, LoRA, QLoRA, PEFT, Adapters, RLHF, DPO, Constitutional AI, Dataset Engineering, When NOT to Fine-Tune

### 26.1 The Problem: Adjusting a Model's Weights Is a Fundamentally Different Lever Than Adjusting Its Input

§9 established the adaptation spectrum and the "when not to fine-tune" principle conceptually. This chapter develops the actual mechanics of each adaptation technique and, critically, the dataset-engineering discipline that determines whether fine-tuning succeeds or silently produces a worse model — since, unlike a bad prompt (instantly visible and reversible), a bad fine-tuning dataset produces a degraded model that isn't obviously broken until evaluated (§29).

### 26.2 Continued Pretraining vs. Supervised Fine-Tuning (SFT): Two Different Training Objectives

**Continued pretraining** keeps training a base model on the same objective it was originally trained with (next-token prediction over raw text) but on new, domain-specific text — adapting the model's general knowledge and "fluency" in a domain (medical literature, legal text, a specific codebase's conventions) without teaching it any particular task format. **Supervised fine-tuning (SFT)** trains on curated input-output pairs demonstrating the exact task and format desired (e.g., question-answer pairs, instruction-response pairs) — directly shaping *behavior* rather than general domain knowledge. In practice, most production fine-tuning is SFT, since the goal is nearly always "respond in this specific way to this kind of input," not "learn more about this general domain" — continued pretraining is reserved for cases where the base model's fluency in a highly specialized domain vocabulary is itself insufficient, a rarer and more expensive scenario.

### 26.3 PEFT, LoRA, and QLoRA: Adapting Without Retraining Every Parameter

**Full fine-tuning** updates every parameter in the model — maximally expressive but requiring enormous compute and memory (gradients and optimizer state for every parameter, easily several times the model's raw storage size, §11.3) and producing an entirely new full-size model copy per fine-tuned variant. **PEFT (Parameter-Efficient Fine-Tuning)** is the umbrella term for techniques that freeze the vast majority of the original model's weights and train only a small number of additional parameters — dramatically reducing memory and compute cost while retaining most of full fine-tuning's quality benefit for most tasks. **LoRA (Low-Rank Adaptation)** is the dominant PEFT technique: instead of updating a weight matrix directly, it learns two much smaller matrices whose product approximates the *change* that would have been made to that weight matrix — since this decomposition has far fewer total parameters than the original matrix, training and storing it is dramatically cheaper, and multiple LoRA adapters (one per task or customer) can be swapped in and out of the same frozen base model, avoiding the need to store many full model copies. **QLoRA** combines LoRA with quantization (§10.6, §27.6) of the frozen base model's weights during training — enabling fine-tuning of very large models on hardware that couldn't hold the full-precision base model at all, at a small, generally acceptable additional quality cost from the quantization itself.

### 26.4 Adapters and Prompt/Prefix Tuning: Other Points on the PEFT Spectrum

**Adapters** insert small, trainable neural network modules between the frozen layers of the base model (rather than LoRA's low-rank decomposition of existing weight matrices) — conceptually similar in goal (few trainable parameters, frozen base model) but architecturally distinct, and less commonly used in current practice than LoRA, which has become the de facto standard PEFT technique. **Prompt tuning** and **prefix tuning** take an even lighter-weight approach: rather than modifying any of the model's internal weights at all, they learn a small set of continuous, trainable "virtual token" vectors prepended to every input — the model itself is entirely unmodified and frozen, and only this small learned prefix is trained, making it the cheapest PEFT variant in both compute and storage terms, at the cost of generally being less expressive/effective than LoRA for tasks requiring more substantial behavioral change.

### 26.5 RLHF, DPO, and Constitutional AI: Aligning Behavior, Not Just Task Format

**RLHF (Reinforcement Learning from Human Feedback)** trains a separate "reward model" to predict which of two candidate outputs a human would prefer, then uses that reward model to further train the primary model via reinforcement learning to produce outputs the reward model scores highly — the technique underlying most of the "helpful, harmless" behavior shaping in major deployed models, distinct from SFT's direct imitation of example outputs since RLHF instead optimizes toward *preferences* between outputs. **DPO (Direct Preference Optimization)** achieves a similar preference-alignment goal without RLHF's separate reward model and reinforcement learning loop at all — training directly on preference pairs (a preferred and a dispreferred output for the same input) using a more stable, simpler supervised-learning-style objective, making it meaningfully cheaper and more stable to run than full RLHF while achieving broadly comparable alignment quality in practice, which is why DPO has become a common lower-cost alternative rather than a strictly inferior shortcut. **Constitutional AI** uses a written set of explicit principles ("the constitution") to have a model critique and revise its own outputs (a specific, structured application of the reflection mechanism from §24.4, §25.4) as part of generating its own training data for further alignment — reducing reliance on large volumes of direct human preference labeling by having the model generate self-critique data guided by explicit written principles instead.

### 26.6 Synthetic Data Risks and Dataset Engineering: Where Fine-Tuning Actually Succeeds or Fails

**Synthetic data** — training examples generated by a model rather than collected from real human interactions — is often necessary to reach sufficient training-data volume affordably, but carries a specific, well-documented risk: **model collapse**, where training repeatedly on a model's own generated data (or data generated by a similar model) amplifies that model's existing biases, errors, and stylistic quirks rather than correcting them, since there's no new, independent signal being introduced. **Dataset engineering** — curating a fine-tuning dataset's quality, diversity, and correctness — is, in practice, the single highest-leverage factor determining fine-tuning success, directly analogous to the companion handbook's "garbage in, garbage out" data-quality principle (companion §61.3) but with a sharper consequence here: a model fine-tuned on a biased, low-diversity, or subtly incorrect dataset doesn't fail loudly, it produces a confidently-wrong model that evaluation (§29), not casual inspection, is required to catch.

### 26.7 When NOT to Fine-Tune: The Decision That Must Come Before Any of the Above

§9.7 established this principle conceptually; mechanically, fine-tuning should be avoided when: the actual need is *new factual knowledge* the model lacks (RAG, §6, adds retrievable facts far more cheaply and updatably than fine-tuning, which "bakes in" knowledge that becomes stale the moment underlying facts change and requires re-training to update at all); the need is *better instruction-following on a well-specified format* (a well-engineered prompt or few-shot examples, §24.3, often achieves this without any training cost); or the volume/quality of available training data is insufficient to reliably improve behavior rather than degrade it (§26.6's risk). Fine-tuning is the right tool specifically when the need is a genuine, stable *behavioral or stylistic* shift that prompting cannot reliably achieve, and sufficient quality training data exists to achieve it safely.

### 26.8 Engineering Intuition

> **How do I know if my fine-tuning task should use LoRA/QLoRA rather than full fine-tuning?** Nearly always start with LoRA/QLoRA (§26.3) — full fine-tuning's higher expressiveness is rarely the actual bottleneck for typical production adaptation tasks, while its compute/memory/storage cost is a real, immediate burden; reserve full fine-tuning for cases where LoRA has been evaluated (§29) and demonstrably underperforms.

> **Why did my fine-tuned model get noticeably worse at general tasks after training on my narrow dataset?** This is **catastrophic forgetting** — training heavily on a narrow dataset can degrade the model's broader pretrained capabilities; mitigations include lower learning rates, PEFT methods (§26.3-26.4, which by construction preserve more of the frozen base model's original behavior), and including a mix of general-capability examples alongside the narrow target task in the training data.

> **What would over-engineering look like here?** Building an RLHF pipeline (§26.5, expensive, requires a separate reward model and RL infrastructure) when DPO achieves comparable alignment quality at a fraction of the engineering and compute cost, or fine-tuning at all when the actual problem (§26.7) is a knowledge gap RAG would solve more cheaply and more updatably.

### 26.9 Decision Tree: Should I Fine-Tune, and With What Technique?

```
Is the actual problem "the model doesn't know X"?
  YES -> Use RAG (§6, §23), not fine-tuning -- knowledge should be
         retrievable and updatable, not baked into weights.
Is the actual problem "the model doesn't follow this format/
instruction reliably"?
  YES -> Try better prompting/few-shot examples (§24.3) first --
         only fine-tune if this is evaluated as insufficient.
Do you have a genuine, stable behavioral/stylistic adaptation
need AND sufficient quality training data (§26.6)?
  YES -> Fine-tune, starting with LoRA/QLoRA (§26.3) by default.
    Need broad alignment to preferences/values, not just a task
    format?
      -> DPO (§26.5) is the practical default; RLHF (§26.5) only
         if DPO is evaluated as insufficient for the specific
         alignment goal.
```

### 26.10 Python Snippet: Configuring a LoRA Fine-Tune and Inspecting Trainable Parameters

```python
# Demonstrates §26.3: LoRA trains a SMALL fraction of parameters
# relative to the frozen base model -- this snippet shows exactly
# how small, using the Hugging Face PEFT library.

from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

base_model = AutoModelForCausalLM.from_pretrained("base-model-name")

lora_config = LoraConfig(
    r=8,                    # rank of the low-rank decomposition --
                             # smaller r = fewer trainable params
    lora_alpha=16,           # scaling factor for the LoRA update
    target_modules=["q_proj", "v_proj"],  # apply LoRA only to
                                            # attention's query/value
                                            # projections (§17.2)
    lora_dropout=0.05,
)

peft_model = get_peft_model(base_model, lora_config)
peft_model.print_trainable_parameters()
# Typical output: "trainable params: 4,194,304 || all params:
# 7,000,000,000 || trainable%: 0.06%" -- illustrating exactly WHY
# LoRA training and storage cost is a small fraction of full
# fine-tuning's.
```

### 26.11 Further Reading

- Hu et al., "LoRA: Low-Rank Adaptation of Large Language Models" (2021) — the primary source for §26.3.
- Dettmers et al., "QLoRA: Efficient Finetuning of Quantized LLMs" (2023) — the primary source for §26.3's QLoRA.
- Rafailov et al., "Direct Preference Optimization: Your Language Model is Secretly a Reward Model" (2023) — the primary source for §26.5's DPO.
- Bai et al., "Constitutional AI: Harmlessness from AI Feedback" (2022) — the primary source for §26.5's Constitutional AI.

---
