"""
Step 1 — Prepare HuggingFace Dataset for outfit compatibility training
======================================================================
Combines:
  1. Synthetic rule-based data  (always available, 2,400 records)
  2. Polyvore Outfits           (optional, ~21k records — download separately)

Polyvore download:
  https://github.com/xthan/polyvore-dataset
  Place the downloaded directory at: data/polyvore_outfits/

Output:
  data/outfit_compat_train/   ← HuggingFace Arrow Dataset
  data/outfit_compat_val/     ← HuggingFace Arrow Dataset

Usage:
  python 1_prepare_dataset.py
  python 1_prepare_dataset.py --no-polyvore   # synthetic only
  python 1_prepare_dataset.py --limit 5000    # cap total records
"""

import argparse
import json
import sys
from pathlib import Path


# ── Polyvore category → Wearly taxonomy ───────────────────────────────────────

POLYVORE_TO_WEARLY = {
    "tops":          "shirt",
    "blouses":       "shirt",
    "shirts":        "shirt",
    "dress shirts":  "formal_shirt",
    "t-shirts":      "tshirt",
    "tank tops":     "tshirt",
    "bottoms":       "pants",
    "pants":         "pants",
    "trousers":      "pants",
    "jeans":         "jeans",
    "shorts":        "shorts",
    "shoes":         "shoes",
    "sneakers":      "sneakers",
    "loafers":       "loafers",
    "boots":         "shoes",
    "heels":         "shoes",
    "outerwear":     "jacket",
    "jackets":       "jacket",
    "coats":         "jacket",
    "accessories":   "accessory",
    "bags":          "accessory",
    "scarves":       "accessory",
    "belts":         "belt",
    "watches":       "watch",
    "jewellery":     "accessory",
}

# Polyvore compatibility scores are binary (0/1) — map to our 0-100 scale
# with some noise to avoid all-or-nothing distribution
def polyvore_binary_to_score(compat: int) -> int:
    import random
    rng = random.Random(compat)
    if compat == 1:
        return rng.randint(72, 95)
    else:
        return rng.randint(10, 42)


# ── Polyvore loader ────────────────────────────────────────────────────────────

def load_polyvore(polyvore_dir: Path) -> list[dict]:
    """
    Loads outfit compatibility from Polyvore Outfits dataset.
    Expected structure:
      polyvore_outfits/
        compatibility_train.txt  — lines: "compat_label item_id item_id ..."
        compatibility_test.txt
        item_metadata.json       — {item_id: {category_id, title, ...}}
        categories.json          — {category_id: category_name}
    """
    import random
    rng = random.Random(99)

    meta_path = polyvore_dir / "item_metadata.json"
    cats_path = polyvore_dir / "categories.json"
    compat_path = polyvore_dir / "compatibility_train.txt"

    if not all(p.exists() for p in [meta_path, cats_path, compat_path]):
        print(f"  [polyvore] Missing files in {polyvore_dir}. Skipping.")
        return []

    print(f"  Loading Polyvore metadata…")
    with open(meta_path) as f:
        metadata = json.load(f)
    with open(cats_path) as f:
        categories = json.load(f)

    print(f"  Loading compatibility labels…")
    records = []
    with open(compat_path) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 3:
                continue
            compat_label = int(parts[0])
            item_ids = parts[1:]

            items = []
            for iid in item_ids:
                item = metadata.get(iid)
                if not item:
                    continue
                cat_id = str(item.get("category_id", ""))
                cat_name = categories.get(cat_id, "").lower()
                wearly_cat = POLYVORE_TO_WEARLY.get(cat_name, "accessory")
                title = item.get("title", "Item")[:40]
                items.append({
                    "category":   wearly_cat,
                    "color_name": "Mixed",
                    "color_hex":  "#888888",
                    "tags":       ["casual"],
                    "name":       title,
                })

            if len(items) < 2:
                continue

            score = polyvore_binary_to_score(compat_label)
            if compat_label == 1:
                verdict = "Strong compatibility — these items work well together"
                reasons = ["Items are stylistically coherent", "Formality levels are balanced"]
                suggestions = ["Consider adding a watch or belt to complete the look"]
            else:
                verdict = "Poor compatibility — these items clash or mismatch"
                reasons = ["Items have conflicting styles", "Formality levels are mismatched"]
                suggestions = ["Rebuild around a neutral base item"]

            records.append({
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": _format_prompt(items, "casual")},
                    {"role": "assistant", "content": json.dumps({
                        "score": score, "verdict": verdict,
                        "reasons": reasons, "suggestions": suggestions,
                    })},
                ]
            })

    print(f"  Loaded {len(records):,} Polyvore records")
    return records


_SYSTEM = """You are Wearly's outfit compatibility expert, trained to evaluate how well clothing items work together.

For every outfit, return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "verdict": "<one sentence summary>",
  "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "suggestions": ["<improvement 1>", "<improvement 2>"]
}

Score guide: 0-34 poor, 35-49 needs work, 50-64 decent, 65-79 good, 80-100 excellent."""

def _format_prompt(items: list[dict], occasion: str) -> str:
    lines = []
    for i, it in enumerate(items, 1):
        cat = it["category"].replace("_", " ").title()
        col = it.get("color_name", "")
        lines.append(f"{i}. {col} {cat}")
    items_block = "\n".join(lines)
    return f"Rate this outfit for the '{occasion}' occasion:\n\n{items_block}\n\nReturn ONLY valid JSON."


# ── Main ───────────────────────────────────────────────────────────────────────

def main(args: argparse.Namespace) -> None:
    data_dir = Path("data")
    synth_train = data_dir / "outfit_train.jsonl"
    synth_val   = data_dir / "outfit_val.jsonl"

    if not synth_train.exists():
        print("Synthetic data not found. Running generator…")
        import subprocess, sys
        subprocess.run([sys.executable, str(data_dir / "generate_synthetic.py")], check=True)

    # ── Load synthetic data ───────────────────────────────────────────────────
    print("\n[1/3] Loading synthetic data…")
    train_records = [json.loads(l) for l in open(synth_train, encoding="utf-8")]
    val_records   = [json.loads(l) for l in open(synth_val,   encoding="utf-8")]
    print(f"  Synthetic train: {len(train_records):,}  val: {len(val_records):,}")

    # ── Optionally load Polyvore ──────────────────────────────────────────────
    if not args.no_polyvore:
        polyvore_dir = data_dir / "polyvore_outfits"
        if polyvore_dir.exists():
            print("\n[2/3] Loading Polyvore Outfits dataset…")
            polyvore_records = load_polyvore(polyvore_dir)
            if polyvore_records:
                import random
                rng = random.Random(42)
                rng.shuffle(polyvore_records)
                n_val = max(100, len(polyvore_records) // 10)
                val_records   += polyvore_records[:n_val]
                train_records += polyvore_records[n_val:]
                print(f"  After merge — train: {len(train_records):,}  val: {len(val_records):,}")
        else:
            print("\n[2/3] Polyvore not found at data/polyvore_outfits/ — using synthetic only")
            print("       Download from: https://github.com/xthan/polyvore-dataset")
    else:
        print("\n[2/3] --no-polyvore flag set — skipping")

    # ── Apply limit ───────────────────────────────────────────────────────────
    if args.limit and args.limit > 0:
        import random
        rng = random.Random(77)
        rng.shuffle(train_records)
        rng.shuffle(val_records)
        ratio = len(val_records) / (len(train_records) + len(val_records))
        n_val   = min(len(val_records),   int(args.limit * ratio))
        n_train = min(len(train_records), args.limit - n_val)
        train_records = train_records[:n_train]
        val_records   = val_records[:n_val]
        print(f"\nLimited to {args.limit:,} total: {n_train:,} train + {n_val:,} val")

    # ── Save as HuggingFace Dataset ───────────────────────────────────────────
    print("\n[3/3] Saving HuggingFace Arrow Dataset…")
    try:
        from datasets import Dataset
        train_ds = Dataset.from_list(train_records)
        val_ds   = Dataset.from_list(val_records)

        train_path = data_dir / "outfit_compat_train"
        val_path   = data_dir / "outfit_compat_val"
        train_ds.save_to_disk(str(train_path))
        val_ds.save_to_disk(str(val_path))
        print(f"  Saved → {train_path}")
        print(f"  Saved → {val_path}")

    except ImportError:
        print("  HuggingFace datasets not installed — saving as JSONL fallback")
        import random
        rng = random.Random(1)
        rng.shuffle(train_records)
        rng.shuffle(val_records)
        with open(data_dir / "outfit_train_merged.jsonl", "w") as f:
            for r in train_records:
                f.write(json.dumps(r) + "\n")
        with open(data_dir / "outfit_val_merged.jsonl", "w") as f:
            for r in val_records:
                f.write(json.dumps(r) + "\n")
        print(f"  Saved as JSONL: {data_dir}/outfit_train_merged.jsonl")

    print(f"\n✓ Dataset ready — {len(train_records):,} train + {len(val_records):,} val")
    print("  Next step: python 2_train.py")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare outfit compatibility dataset")
    parser.add_argument("--no-polyvore", action="store_true", help="Skip Polyvore dataset")
    parser.add_argument("--limit",       type=int, default=0, help="Cap total records (0 = no limit)")
    main(parser.parse_args())
