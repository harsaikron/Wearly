"""
Step 4 — Evaluate Fine-tuned Model vs Base Model
==================================================
Runs a side-by-side comparison of:
  - Base model (gemma4:e4b via Ollama)
  - Fine-tuned model (wearly-fashion-v1 via Ollama)

Metrics measured:
  1. JSON validity rate      — does the output parse as valid JSON?
  2. Category accuracy       — correct clothing category?
  3. Colour accuracy         — colour name within 20% of target?
  4. Tag precision/recall    — correct occasion tags?
  5. Response latency        — time per inference (ms)
  6. Format compliance       — all required fields present?

Usage:
  # Evaluate with default val dataset
  python 4_evaluate.py

  # Evaluate specific model
  python 4_evaluate.py --model wearly-fashion-v1 --samples 100

  # Compare base vs fine-tuned
  python 4_evaluate.py --compare

  # Export results to JSON
  python 4_evaluate.py --compare --output results/eval_report.json
"""

import argparse
import json
import time
import sys
from pathlib import Path
from typing import Any, Optional
from collections import Counter

VALID_CATEGORIES = {
    "shirt", "formal_shirt", "tshirt", "pants", "jeans",
    "shorts", "shoes", "sneakers", "loafers", "jacket",
    "watch", "belt", "accessory",
}
VALID_TAGS = {
    "office", "casual", "date_night", "weekend", "smart_casual",
    "minimal", "luxury", "travel", "festive", "gym",
}
REQUIRED_FIELDS = {"suggested_name", "category", "color_hex", "color_name", "tags"}

BASE_MODEL     = "gemma4:e4b"
TUNED_MODEL    = "wearly-fashion-v1"
OLLAMA_HOST    = "http://localhost:11434"

EVAL_PROMPT    = "Analyze this clothing item and return JSON with: suggested_name, category, color_hex, color_name, tags."
SYSTEM_PROMPT  = """You are Wearly's clothing classifier AI.
Return ONLY valid JSON with: suggested_name, category, color_hex, color_name, tags."""


# ── Ollama inference ──────────────────────────────────────────────────────────

def ollama_infer(model: str, user_message: str, system: str = SYSTEM_PROMPT) -> tuple[str, float]:
    """Call Ollama and return (response_text, latency_ms)."""
    import urllib.request
    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_message},
        ],
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.1},
    }).encode()

    req = urllib.request.Request(
        f"{OLLAMA_HOST}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            latency_ms = (time.perf_counter() - t0) * 1000
            return data["message"]["content"], latency_ms
    except Exception as e:
        latency_ms = (time.perf_counter() - t0) * 1000
        return f"ERROR: {e}", latency_ms


# ── Metrics ───────────────────────────────────────────────────────────────────

def evaluate_response(predicted: str, ground_truth: dict) -> dict[str, Any]:
    """Score a single model response against ground truth."""
    result: dict[str, Any] = {
        "json_valid": False,
        "fields_complete": False,
        "category_correct": False,
        "color_correct": False,
        "tags_precision": 0.0,
        "tags_recall": 0.0,
        "tags_f1": 0.0,
        "format_score": 0.0,
        "raw": predicted,
    }

    # Clean up common model mistakes
    cleaned = predicted.strip()
    if cleaned.startswith("```"):
        cleaned = "\n".join(cleaned.split("\n")[1:-1])

    try:
        pred_json = json.loads(cleaned)
        result["json_valid"] = True
    except json.JSONDecodeError:
        return result

    # Field completeness
    present = REQUIRED_FIELDS.intersection(pred_json.keys())
    result["fields_complete"] = len(present) == len(REQUIRED_FIELDS)
    result["format_score"] = len(present) / len(REQUIRED_FIELDS)

    # Category accuracy
    pred_cat = pred_json.get("category", "").lower().strip()
    result["category_correct"] = pred_cat == ground_truth.get("category", "")

    # Colour accuracy (colour name match, case-insensitive partial)
    pred_colour = pred_json.get("color_name", "").lower().strip()
    true_colour = ground_truth.get("color_name", "").lower().strip()
    result["color_correct"] = (
        pred_colour == true_colour or
        pred_colour in true_colour or
        true_colour in pred_colour
    )

    # Tag precision/recall
    pred_tags = set(t.lower() for t in pred_json.get("tags", []) if isinstance(t, str))
    true_tags = set(t.lower() for t in ground_truth.get("tags", []))

    if pred_tags:
        precision = len(pred_tags & true_tags) / len(pred_tags)
    else:
        precision = 0.0
    if true_tags:
        recall = len(pred_tags & true_tags) / len(true_tags)
    else:
        recall = 1.0

    f1 = 2 * precision * recall / (precision + recall + 1e-8)
    result["tags_precision"] = precision
    result["tags_recall"]    = recall
    result["tags_f1"]        = f1

    return result


def aggregate_metrics(results: list[dict]) -> dict[str, float]:
    """Compute mean metrics across all evaluation examples."""
    n = len(results)
    if n == 0:
        return {}
    return {
        "json_valid_pct":     sum(r["json_valid"]         for r in results) / n * 100,
        "fields_complete_pct":sum(r["fields_complete"]    for r in results) / n * 100,
        "category_accuracy":  sum(r["category_correct"]   for r in results) / n * 100,
        "color_accuracy":     sum(r["color_correct"]      for r in results) / n * 100,
        "tags_precision":     sum(r["tags_precision"]     for r in results) / n * 100,
        "tags_recall":        sum(r["tags_recall"]        for r in results) / n * 100,
        "tags_f1":            sum(r["tags_f1"]            for r in results) / n * 100,
        "format_score":       sum(r["format_score"]       for r in results) / n * 100,
        "n_samples":          n,
    }


# ── Evaluation runner ─────────────────────────────────────────────────────────

def run_eval(
    model: str,
    samples: list[dict],
    show_errors: bool = False,
) -> tuple[dict, list[float]]:
    """Evaluate a model on a list of samples. Returns (metrics, latencies)."""
    results = []
    latencies = []

    for i, sample in enumerate(samples):
        msgs = sample.get("messages", [])
        user_msg    = next((m["content"] for m in msgs if m["role"] == "user"), "")
        assistant   = next((m["content"] for m in msgs if m["role"] == "assistant"), "{}")

        try:
            ground_truth = json.loads(assistant)
        except json.JSONDecodeError:
            ground_truth = {}

        predicted, latency_ms = ollama_infer(model, user_msg)
        latencies.append(latency_ms)
        metric = evaluate_response(predicted, ground_truth)
        results.append(metric)

        # Progress
        status = "✓" if metric["category_correct"] else "✗"
        print(f"  [{i+1:3d}/{len(samples)}] {status} "
              f"cat={'✓' if metric['category_correct'] else '✗'} "
              f"json={'✓' if metric['json_valid'] else '✗'} "
              f"colour={'✓' if metric['color_correct'] else '✗'} "
              f"{latency_ms:.0f}ms", end="\r")

        if show_errors and not metric["json_valid"]:
            print(f"\n  ERROR response: {predicted[:100]}")

    print()
    return aggregate_metrics(results), latencies


# ── Pretty print ──────────────────────────────────────────────────────────────

def print_report(model: str, metrics: dict, latencies: list[float]) -> None:
    avg_lat = sum(latencies) / len(latencies) if latencies else 0
    p50_lat = sorted(latencies)[len(latencies) // 2] if latencies else 0

    print(f"\n{'='*55}")
    print(f"  Model: {model}")
    print(f"{'='*55}")
    print(f"  JSON validity      : {metrics.get('json_valid_pct',0):.1f}%")
    print(f"  Fields complete    : {metrics.get('fields_complete_pct',0):.1f}%")
    print(f"  Category accuracy  : {metrics.get('category_accuracy',0):.1f}%")
    print(f"  Colour accuracy    : {metrics.get('color_accuracy',0):.1f}%")
    print(f"  Tag precision      : {metrics.get('tags_precision',0):.1f}%")
    print(f"  Tag recall         : {metrics.get('tags_recall',0):.1f}%")
    print(f"  Tag F1             : {metrics.get('tags_f1',0):.1f}%")
    print(f"  Format score       : {metrics.get('format_score',0):.1f}%")
    print(f"  Avg latency        : {avg_lat:.0f}ms")
    print(f"  P50 latency        : {p50_lat:.0f}ms")
    print(f"  Samples            : {metrics.get('n_samples',0)}")
    print(f"{'='*55}")


def print_comparison(base_m: dict, tuned_m: dict) -> None:
    print(f"\n{'='*65}")
    print(f"  {'Metric':<25} {'Base (gemma4:e4b)':>17} {'Fine-tuned':>15} {'Delta':>8}")
    print(f"  {'-'*62}")

    metrics_order = [
        ("JSON validity",       "json_valid_pct"),
        ("Fields complete",     "fields_complete_pct"),
        ("Category accuracy",   "category_accuracy"),
        ("Colour accuracy",     "color_accuracy"),
        ("Tag F1",              "tags_f1"),
        ("Format score",        "format_score"),
    ]

    for label, key in metrics_order:
        base_val  = base_m.get(key, 0)
        tuned_val = tuned_m.get(key, 0)
        delta     = tuned_val - base_val
        arrow     = "▲" if delta > 0 else ("▼" if delta < 0 else "─")
        print(f"  {label:<25} {base_val:>15.1f}%  {tuned_val:>13.1f}%  {arrow}{abs(delta):>5.1f}%")

    print(f"{'='*65}")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Wearly clothing classifier")
    parser.add_argument("--model",    type=str,  default=TUNED_MODEL,   help="Ollama model to evaluate")
    parser.add_argument("--samples",  type=int,  default=50,            help="Number of validation samples")
    parser.add_argument("--data-dir", type=str,  default="data",        help="Dataset directory")
    parser.add_argument("--compare",  action="store_true",              help="Compare base vs fine-tuned")
    parser.add_argument("--output",   type=str,  default=None,          help="Save results to JSON file")
    parser.add_argument("--errors",   action="store_true",              help="Show error responses")
    args = parser.parse_args()

    # Load validation data
    val_path = Path(args.data_dir) / "synthetic_val.jsonl"
    if not val_path.exists():
        print(f"No validation data at {val_path}. Run: python 1_prepare_dataset.py")
        sys.exit(1)

    all_samples = [json.loads(l) for l in open(val_path)]
    samples = all_samples[:args.samples]
    print(f"Evaluating on {len(samples)} samples…")

    if args.compare:
        print(f"\n[1/2] Evaluating base model: {BASE_MODEL}")
        base_metrics, base_lats = run_eval(BASE_MODEL, samples, args.errors)
        print_report(BASE_MODEL, base_metrics, base_lats)

        print(f"\n[2/2] Evaluating fine-tuned: {TUNED_MODEL}")
        tuned_metrics, tuned_lats = run_eval(TUNED_MODEL, samples, args.errors)
        print_report(TUNED_MODEL, tuned_metrics, tuned_lats)

        print("\nComparison:")
        print_comparison(base_metrics, tuned_metrics)

        if args.output:
            out = {
                "base_model":  {"name": BASE_MODEL,  "metrics": base_metrics,  "latencies": base_lats},
                "tuned_model": {"name": TUNED_MODEL, "metrics": tuned_metrics, "latencies": tuned_lats},
            }
            Path(args.output).parent.mkdir(parents=True, exist_ok=True)
            json.dump(out, open(args.output, "w"), indent=2)
            print(f"\n✓ Results saved: {args.output}")
    else:
        metrics, latencies = run_eval(args.model, samples, args.errors)
        print_report(args.model, metrics, latencies)

        if args.output:
            out = {"model": args.model, "metrics": metrics, "latencies": latencies}
            json.dump(out, open(args.output, "w"), indent=2)
            print(f"\n✓ Results saved: {args.output}")
