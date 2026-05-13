# Self-Learning Data Accumulator

Every time a user uploads a clothing item to Wearly, the AI analysis result is saved here as a training example.

## How it works

1. User uploads photo → `/api/analyze-clothing` calls the AI
2. AI returns: category, color_hex, color_name, tags
3. `/api/analyze-clothing` fires a background POST to `/api/learn`
4. `/api/learn` appends the example to `live_examples.jsonl`
5. When you have 500+ examples, run the re-training pipeline

## Re-training with live data

```bash
# 1. Generate fresh dataset (merges live examples automatically)
cd fine-tuning/module1-clothing-classifier
python generate_v2_dataset.py

# 2. Re-train with live examples included
python 2_train_v2.py

# 3. Export to Ollama
python 3_export.py

# 4. Verify improvement
python 4_evaluate.py
```

## File: live_examples.jsonl

Each line is one training example in chat format:
```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "Analyze this clothing item."},
    {"role": "assistant", "content": "{\"category\":\"tshirt\",\"color_name\":\"Sage Green\",...}"}
  ],
  "_meta": {"type": "clothing_analysis", "backend": "groq", "timestamp": "..."}
}
```

## Evolution schedule (recommended)

| Live examples | Action |
|---|---|
| 0–99 | Collect only |
| 100–499 | Optional quick re-train (50 steps) |
| 500+ | Full re-train (900 steps) — significant accuracy boost |
| 2000+ | Switch to multi-epoch training |
