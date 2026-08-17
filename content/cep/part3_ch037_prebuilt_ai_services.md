## 37. Pre-Built AI Services: Textract, Rekognition, Polly & Lex

> **Decision Snapshot** — Tier 3 · Reference Level · Verdict: know these exist as ready-made, API-callable AI capabilities (document extraction, image/video analysis, text-to-speech, conversational bots) — reach for one when its specific pre-built capability fits directly, rather than training a custom model for a solved problem.

### What They Do
Four distinct pre-built AI services sharing the same "call an API, get an AI-powered result, no model training" shape: **Textract** extracts text and structured data (forms, tables) from scanned documents/images; **Rekognition** analyzes images and video for object/scene/face detection and content moderation; **Polly** converts text to natural-sounding speech; **Lex** builds conversational chatbots/voice interfaces using the same underlying technology as Alexa.

### When to Reach for Them
Whenever the specific, pre-built capability directly matches your need — extracting fields from invoices (Textract), moderating user-uploaded images (Rekognition), generating voice output for an application (Polly), or a scoped conversational interface (Lex) — without justifying the cost and complexity of training a custom model for a problem these already solve well.

### When to Avoid Them
When your actual need is more specialized or domain-specific than these general-purpose services handle well — at that point, a custom model (via SageMaker, companion §38) or a foundation-model-based approach (companion AI Systems Engineering Handbook) is the more appropriate tool.

### One Architecture Diagram
```
S3 (uploaded document) → Textract (extract fields) → Application (structured data)
S3/video stream → Rekognition (detect objects/moderate content) → Application (flagged/tagged)
Application text → Polly (synthesize speech) → Audio output
User input → Lex (intent recognition) → Lambda (fulfillment)
```

### Interview Questions
1. When would you reach for Rekognition versus training a custom image-classification model?
2. What's a concrete production use case for Textract beyond simple OCR?
3. How does Lex fit into a broader conversational-AI architecture alongside Lambda?

### Cloud-Agnostic Mapping
Textract/Rekognition/Polly/Lex (AWS) ≈ Azure AI Document Intelligence / Vision / Speech / Bot Service (Azure) ≈ Document AI / Vision AI / Text-to-Speech / Dialogflow (GCP).

---
