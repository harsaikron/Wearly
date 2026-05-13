"""
Step 4 — Evaluate outfit compatibility scorer
=============================================
Compares base Gemma 4 vs fine-tuned wearly-outfit-v1 across:
  - JSON validity rate
  - Score range accuracy (does a bad outfit score low?)
  - Field completeness (score, verdict, reasons, suggestions)
  - Score correlation with expected quality tier
  - Latency

Requires Ollama running locally with at least one model:
  - gemma4:e4b    (base)
  - wearly-outfit-v1  (fine-tuned, optional)

Usage:
  python 4_evaluate.py
  python 4_evaluate.py --compare          # side-by-side with base model
  python 4_evaluate.py --n 100            # evaluate on 100 samples
  python 4_evaluate.py --output results/eval.json
"""

import argparse
import json
import time
import statistics
from pathlib import Path
from typing import Any


OLLAMA_BASE_URL   = "http://localhost:11434/api/generate"
BASE_MODEL        = "gemma4:e4b"
FINETUNED_MODEL   = "wearly-outfit-v1"

# Expected score ranges by quality tier in synthetic data
TIER_RANGES = {
    "high": (65, 100),
    "mid":  (35, 74),
    "low":  (0,  49),
}


# ── Ollama inference ───────────────────────────────────────────────────────────

def ollama_generate(model: str, prompt: str, system: str, timeout: int = 60) -> tuple[str, float]:
    import urllib.request
    import urllib.error

    payload = json.dumps({
        "model":  model,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.2, "num_predict": 400},
    }).encode()

    t0 = time.perf_counter()
    try:
        req = urllib.request.Request(
            OLLAMA_BASE_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read())
            latency = time.perf_counter() - t0
            return data.get("response", ""), latency
    except Exception as e:
        return f"ERROR: {e}", time.perf_counter() - t0


# ── Metrics ───────────────────────────────────────────────────────────────────

REQUIRED_FIELDS = {"score", "verdict", "reasons", "suggestions"}

def parse_response(raw: str) -> dict | None:
    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        return json.loads(cleaned)
    except Exception:
        return None


def score_response(parsed: dict | None, expected_tier: str | None = None) -> dict[str, Any]:
    if parsed is None:
        return {
            "valid_json":    False,
            "fields_ok":     False,
            "score_in_range": False,
            "score_value":   None,
            "reasons_count": 0,
            "suggestions_count": 0,
        }

    fields_ok = all(k in parsed for k in REQUIRED_FIELDS)
    score_val = parsed.get("score")
    score_in_range = isinstance(score_val, (int, float)) and 0 <= score_val <= 100

    # Check if score is in the right tier
    tier_correct = False
    if expected_tier and score_in_range:
        lo, hi = TIER_RANGES[expected_tier]
        tier_correct = lo <= score_val <= hi

    return {
        "valid_json":      True,
        "fields_ok":       fields_ok,
        "score_in_range":  score_in_range,
        "score_value":     score_val,
        "tier_correct":    tier_correct,
        "reasons_count":   len(parsed.get("reasons", [])),
        "suggestions_count": len(parsed.get("suggestions", [])),
    }


def aggregate(results: list[dict]) -> dict:
    n = len(results)
    if n == 0:
        return {}

    valid     = sum(r["valid_json"]   for r in results)
    fields    = sum(r["fields_ok"]    for r in results)
    in_range  = sum(r["score_in_range"] for r in results)
    tier_ok   = sum(r.get("tier_correct", False) for r in results)
    scores    = [r["score_value"] for r in results if r["score_value"] is not None]
    reasons   = [r["reasons_count"] for r in results if r["valid_json"]]
    latencies = [r.get("latency", 0) for r in results]

    return {
        "n":               n,
        "json_valid_pct":  round(100 * valid    / n, 1),
        "fields_ok_pct":   round(100 * fields   / n, 1),
        "score_range_pct": round(100 * in_range / n, 1),
        "tier_accuracy":   round(100 * tier_ok  / n, 1),
        "avg_score":       round(statistics.mean(scores),    1) if scores    else None,
        "avg_reasons":     round(statistics.mean(reasons),   1) if reasons   else None,
        "avg_latency_s":   round(statistics.mean(latencies), 2) if latencies else None,
        "p50_latency_s":   round(statistics.median(latencies), 2) if latencies else None,
    }


# ── Test samples ──────────────────────────────────────────────────────────────

TEST_OUTFITS = [
    {
        "tier":    "high",
        "occasion": "office",
        "items": "1. White Formal Shirt\n2. Navy Blue Pants\n3. Black Oxford Shoes\n4. Black Watch",
    },
    {
        "tier":    "high",
        "occasion": "casual",
        "items": "1. White Tshirt\n2. Blue Jeans\n3. White Sneakers",
    },
    {
        "tier":    "high",
        "occasion": "date_night",
        "items": "1. Charcoal Jacket\n2. White Formal Shirt\n3. Black Pants\n4. Black Loafers",
    },
    {
        "tier":    "mid",
        "occasion": "smart_casual",
        "items": "1. Sky Blue Shirt\n2. Denim Blue Jeans\n3. White Sneakers",
    },
    {
        "tier":    "mid",
        "occasion": "casual",
        "items": "1. Olive Shirt\n2. Khaki Shorts\n3. Brown Loafers",
    },
    {
        "tier":    "low",
        "occasion": "office",
        "items": "1. White Tshirt\n2. Grey Shorts\n3. Black Dress Shoes",
    },
    {
        "tier":    "low",
        "occasion": "smart_casual",
        "items": "1. Neon Green Tshirt\n2. Hot Pink Shorts\n3. Cobalt Blue Sneakers",
    },
    {
        "tier":    "low",
        "occasion": "office",
        "items": "1. Formal Shirt\n2. Shorts\n3. Sneakers",
    },
]

SYSTEM = """You are Wearly's outfit compatibility expert.
For every outfit, return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "verdict": "<one sentence summary>",
  "reasons": ["<reason 1>", "<reason 2>"],
  "suggestions": ["<improvement 1>"]
}"""

def make_prompt(outfit: dict) -> str:
    return (
        f"Rate this outfit for the '{outfit['occasion'].replace('_', ' ')}' occasion:\n\n"
        f"{outfit['items']}\n\n"
        f"Return ONLY valid JSON."
    )


# ── Evaluation runner ─────────────────────────────────────────────────────────

def evaluate_model(model: str, outfits: list[dict], timeout: int = 60) -> list[dict]:
    results = []
    for outfit in outfits:
        prompt = make_prompt(outfit)
        raw, latency = ollama_generate(model, prompt, SYSTEM, timeout)
        parsed = parse_response(raw)
        metrics = score_response(parsed, outfit.get("tier"))
        metrics["latency"] = latency
        metrics["raw"]     = raw[:200]
        results.append(metrics)
    return results


def print_report(model: str, agg: dict, label: str = "") -> None:
    title = f"{model}{' (' + label + ')' if label else ''}"
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")
    print(f"  JSON valid        : {agg.get('json_valid_pct', 0):.1f}%")
    print(f"  Fields complete   : {agg.get('fields_ok_pct', 0):.1f}%")
    print(f"  Score in 0-100    : {agg.get('score_range_pct', 0):.1f}%")
    print(f"  Tier accuracy     : {agg.get('tier_accuracy', 0):.1f}%")
    print(f"  Avg score         : {agg.get('avg_score', 'N/A')}")
    print(f"  Avg reasons given : {agg.get('avg_reasons', 'N/A')}")
    print(f"  Avg latency       : {agg.get('avg_latency_s', 'N/A')}s  (p50={agg.get('p50_latency_s', 'N/A')}s)")


def print_comparison(base_agg: dict, ft_agg: dict) -> None:
    metrics = [
        ("JSON valid %",     "json_valid_pct"),
        ("Fields complete %", "fields_ok_pct"),
        ("Score range %",    "score_range_pct"),
        ("Tier accuracy %",  "tier_accuracy"),
        ("Avg score",        "avg_score"),
        ("Avg reasons",      "avg_reasons"),
        ("Avg latency (s)",  "avg_latency_s"),
    ]
    print(f"\n{'═' * 65}")
    print(f"  {'Metric':<25}  {'Base':>10}  {'Fine-tuned':>10}  {'Δ':>8}")
    print(f"{'─' * 65}")
    for label, key in metrics:
        b = base_agg.get(key)
        f = ft_agg.get(key)
        if b is not None and f is not None:
            delta = f - b
            arrow = "▲" if delta > 0 else ("▼" if delta < 0 else " ")
            color = "+" if delta > 0 else ""
            print(f"  {label:<25}  {b:>10.1f}  {f:>10.1f}  {color}{delta:>7.1f} {arrow}")
        else:
            print(f"  {label:<25}  {'N/A':>10}  {'N/A':>10}  {'':>9}")
    print(f"{'═' * 65}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main(args: argparse.Namespace) -> None:
    # Load test samples from val set or use built-in
    outfits = TEST_OUTFITS

    if args.data_dir:
        val_file = Path(args.data_dir) / "outfit_val.jsonl"
        if val_file.exists():
            extra = []
            for line in open(val_file):
                rec = json.loads(line)
                msgs = rec["messages"]
                user_msg = next((m["content"] for m in msgs if m["role"] == "user"), "")
                lines = user_msg.split("\n")
                occasion = "casual"
                for l in lines:
                    if "occasion" in l.lower():
                        occasion = l.split("'")[1] if "'" in l else "casual"
                        break
                # Extract items block
                item_lines = [l for l in lines if l.strip() and l[0].isdigit()]
                if item_lines:
                    extra.append({
                        "tier":    None,
                        "occasion": occasion,
                        "items":   "\n".join(item_lines),
                    })
            if extra:
                import random
                random.Random(42).shuffle(extra)
                outfits = TEST_OUTFITS + extra[:max(0, args.n - len(TEST_OUTFITS))]

    outfits = outfits[:args.n]
    print(f"Evaluating on {len(outfits)} outfits…\n")

    # ── Fine-tuned model ──────────────────────────────────────────────────────
    print(f"Running {FINETUNED_MODEL}…")
    ft_results = evaluate_model(FINETUNED_MODEL, outfits, args.timeout)
    ft_agg     = aggregate(ft_results)
    print_report(FINETUNED_MODEL, ft_agg, "fine-tuned")

    # ── Base model comparison ─────────────────────────────────────────────────
    if args.compare:
        print(f"\nRunning {BASE_MODEL} for comparison…")
        base_results = evaluate_model(BASE_MODEL, outfits, args.timeout)
        base_agg     = aggregate(base_results)
        print_report(BASE_MODEL, base_agg, "base")
        print_comparison(base_agg, ft_agg)

    # ── Save results ──────────────────────────────────────────────────────────
    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "finetuned": {"model": FINETUNED_MODEL, "aggregate": ft_agg, "per_sample": ft_results},
        }
        if args.compare:
            payload["base"] = {"model": BASE_MODEL, "aggregate": base_agg, "per_sample": base_results}
        out.write_text(json.dumps(payload, indent=2))
        print(f"\n✓ Report saved to: {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate outfit compatibility model")
    parser.add_argument("--compare",  action="store_true",  help="Compare base vs fine-tuned side-by-side")
    parser.add_argument("--n",        type=int, default=len(TEST_OUTFITS), help="Number of test samples")
    parser.add_argument("--timeout",  type=int, default=60,  help="Per-request timeout (seconds)")
    parser.add_argument("--data-dir", type=str, default="data", help="Dataset dir for extra val samples")
    parser.add_argument("--output",   type=str, default=None,   help="Save JSON report to this path")
    main(parser.parse_args())
