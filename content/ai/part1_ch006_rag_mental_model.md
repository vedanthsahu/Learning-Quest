## 6. Mental Model: Retrieval-Augmented Generation (RAG)

### 6.1 The Problem: A Model's Knowledge Is Frozen and Generic

§1.6 established that an LLM's core weakness is confidently generating plausible-sounding but potentially false text — and a specific, common cause of this is simply that the model's training data has a cutoff date and contains no knowledge of your organization's specific, private, or recent information at all. Ask a general-purpose model about your company's internal refund policy, and it will either say it doesn't know, or — worse — confidently generate a plausible-sounding but entirely fabricated policy, because plausibility, not truth, is what it's optimizing for (§1.6). **Retrieval-Augmented Generation (RAG)** is the direct engineering answer: before asking the model to respond, retrieve relevant, real, current information (using exactly the search and retrieval mechanisms from §3-5) and supply it directly in the prompt, so the model's response is *grounded* in real, verifiable, current data instead of relying solely on its frozen training knowledge.

### 6.2 The Naive RAG Pipeline, End to End

```
User question
     |
     v
Embed the question (§3)
     |
     v
Retrieve top-K relevant chunks from a vector database (§4-5)
     |
     v
Assemble a prompt: [system instructions] + [retrieved chunks]
                    + [user question]
     |
     v
Send to the LLM -- it generates an answer GROUNDED in the
supplied chunks, ideally citing which chunk supported which claim
```

This is "naive" RAG specifically because every step is done once, straightforwardly, with no correction or adaptation — and naive RAG's limitations (irrelevant retrieved chunks derailing the answer, no mechanism to notice and recover from bad retrieval, no adjustment for genuinely easy versus genuinely hard queries) are exactly what motivate the more sophisticated RAG variants — Corrective, Adaptive, Agentic, Graph, Self-RAG — developed mechanically in §23, once you already understand why the naive version alone isn't sufficient for many real production requirements.

### 6.3 Grounding and Citation: Why RAG Helps With Trust, Not Just Accuracy

Beyond simply supplying more accurate information, RAG has a second, distinct benefit: because the model's answer is explicitly built from identifiable, retrieved source chunks, a well-designed RAG system can **cite** exactly which source supported which part of its answer — letting a user verify the claim directly, rather than trusting the model's assertion blindly. This citation capability is precisely why RAG-based products (Perplexity being the most visible public example, examined in depth in §58) present answers with visible source links — the citation isn't a cosmetic feature, it's a direct, load-bearing consequence of the retrieval-then-generate architecture, and a product that generates citations without a real, traceable retrieval step underneath is not actually providing the verification benefit its citations imply.

### 6.4 RAG vs. Fine-Tuning: The Single Most Common Early Architectural Question

A recurring, consequential early decision: should new or private knowledge be given to a model via RAG (retrieving and supplying it at request time) or via fine-tuning (§9, actually adjusting the model's weights to internalize new knowledge or behavior)? The engineering-relevant distinction: RAG is well suited to knowledge that changes frequently, needs to be traceable/citable, and where you need the model's underlying reasoning/language ability unchanged, just supplemented with current facts. Fine-tuning is well suited to changing the model's *behavior* or *style* consistently (always respond in a specific format, always adopt a specific persona) or teaching it a specialized skill, not to teaching it fast-changing facts, since fine-tuning is a comparatively slow, offline process — updating a fine-tuned model's "knowledge" of yesterday's data requires re-running the fine-tuning process, while RAG's retrieved data can be updated instantly by simply changing what's in the vector database. This exact tradeoff is developed into a full decision tree in §9.7, but the mental model to hold now: RAG for facts that change, fine-tuning for behavior that should be consistent.

### 6.5 Hallucination Mitigation: RAG Helps, But Doesn't Fully Solve It

A common and important misconception worth flagging even at the mental-model level: RAG substantially reduces hallucination but does not eliminate it — a model can still ignore or misread the retrieved context and generate an answer inconsistent with the supplied sources (a distinct failure mode from hallucinating due to no information at all), and it can still be given genuinely irrelevant retrieved chunks (a retrieval-quality failure, §4.7, §34) that lead it toward a plausible-sounding but wrong answer built from the wrong sources. This is precisely why evaluation (§12, §29) explicitly measures **faithfulness** (does the answer actually match what the retrieved sources say) as a distinct metric from raw correctness — RAG changes hallucination from "making things up entirely" to a narrower, more diagnosable problem of "correctly using the sources it was given," which is real progress but not a complete solution.

### 6.6 Engineering Intuition

> **How do I know if my product needs RAG?** If the product needs to answer questions about information that's private, frequently changing, or postdates the model's training cutoff, RAG is close to a hard requirement, not an optional enhancement.
>
> **What symptoms indicate RAG is implemented but not actually helping?** Answers that contradict the retrieved sources visible in your system's logs, or citations that don't actually support the specific claim they're attached to — both point to a faithfulness problem (§6.5), not a retrieval problem.
>
> **What would over-engineering look like here?** Reaching for Agentic or Graph RAG (§23) before validating that naive RAG (§6.2) actually fails on your product's real query distribution — exactly the companion handbook's general anti-pattern (§1.5 there), now in RAG-specific clothing.

### 6.7 Decision Tree: RAG, Fine-Tuning, or Both?

```
Does the required knowledge change frequently (daily/weekly),
and does the product need to CITE its sources?
  YES -> RAG (§6.1-6.3).
  NO  -> Is the goal to change the model's consistent BEHAVIOR,
         STYLE, or a specialized SKILL, rather than supply facts?
    YES -> Fine-tuning (§9) is a better fit than RAG for this
           specific goal.
    NO  -> Reconsider whether either is needed -- a well-crafted
           system prompt (§7) alone may suffice for simpler needs.
  Note: RAG and fine-tuning are NOT mutually exclusive -- many
  production systems use RAG for current facts AND a fine-tuned
  or carefully-prompted model for consistent behavior/style,
  simultaneously (§9.7 develops this combination explicitly).
```

### 6.8 Python Snippet: A Minimal, Complete RAG Loop

```python
# Demonstrates the FULL §6.2 pipeline in miniature -- retrieval
# (reusing §5.7's search function conceptually) then grounded
# generation, in under 25 lines.

def retrieve(query_vector, index, top_k=3):
    # (identical mechanism to §5.7 -- omitted here for brevity)
    ...

def build_grounded_prompt(question, retrieved_chunks):
    context = "\n\n".join(f"[Source {i+1}]: {c}"
                           for i, c in enumerate(retrieved_chunks))
    return f"""Answer the question using ONLY the sources below.
Cite the source number for each claim. If the sources don't
contain the answer, say so explicitly rather than guessing.

{context}

Question: {question}
Answer:"""

question = "What is our refund policy for damaged items?"
retrieved = [
    "Damaged items may be returned within 30 days for a full refund.",
    "Store hours are 9am-6pm, Monday through Saturday.",
]  # imagine these came from retrieve() above

prompt = build_grounded_prompt(question, retrieved)
# response = llm_client.generate(prompt)  -- sent to the model
print(prompt)
```

Notice the explicit instruction *"if the sources don't contain the answer, say so explicitly rather than guessing"* — this single line is a direct, deliberate mitigation for §6.5's warning, and its presence or absence is frequently the entire difference between a RAG system that fails gracefully and one that hallucinates confidently from irrelevant context.

### 6.9 Further Reading

- Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020) — already cited in the companion handbook's §22.10; the original RAG paper.
- Anthropic and OpenAI's respective public documentation on "grounding" and "citations" in their API/product offerings — practical, current, vendor-specific implementation guidance.

---
