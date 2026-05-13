"""
Step 0 — Generate synthetic outfit compatibility training data
==============================================================
Produces 2,400 training examples covering:
  - High-compatibility outfits (score 80–100)
  - Mid-range outfits (score 50–79)
  - Low-compatibility outfits (score 0–49)
  - Edge cases: clashing colours, occasion mismatches, too many patterns

No API keys, no external downloads — pure rule-based generation.
Runtime: ~5 seconds.

Output:
  data/outfit_train.jsonl   (~2,100 records)
  data/outfit_val.jsonl     (~300 records)
"""

import json
import random
from pathlib import Path
from typing import Any

# ── Taxonomy ───────────────────────────────────────────────────────────────────

CATEGORIES = [
    "shirt", "formal_shirt", "tshirt", "pants", "jeans", "shorts",
    "shoes", "sneakers", "loafers", "jacket", "watch", "belt", "accessory",
]

OCCASIONS = ["office", "casual", "date_night", "weekend", "smart_casual",
             "minimal", "luxury", "travel", "festive", "gym"]

# Colour families — items in the same family are harmonious
COLOUR_FAMILIES = {
    "neutrals":   ["White", "Off White", "Cream", "Light Grey", "Grey", "Charcoal", "Black"],
    "navys":      ["Navy Blue", "Dark Navy", "Midnight Blue"],
    "blues":      ["Sky Blue", "Cobalt Blue", "Royal Blue", "Denim Blue"],
    "earthy":     ["Tan", "Camel", "Khaki", "Olive", "Sand", "Beige", "Brown", "Dark Brown"],
    "warm":       ["Burgundy", "Maroon", "Wine Red", "Rust", "Terracotta", "Brick Red"],
    "pastels":    ["Powder Blue", "Blush Pink", "Lilac", "Mint Green", "Peach"],
    "brights":    ["Red", "Cobalt", "Electric Blue", "Hot Pink", "Neon Green", "Yellow"],
    "greens":     ["Forest Green", "Sage", "Emerald", "Moss Green", "Teal"],
    "pinks":      ["Pink", "Hot Pink", "Rose", "Blush Pink", "Mauve"],
}

# Hex codes for common colours
COLOUR_HEX = {
    "White": "#FFFFFF", "Off White": "#FAF9F6", "Cream": "#FFFDD0",
    "Light Grey": "#D3D3D3", "Grey": "#808080", "Charcoal": "#36454F",
    "Black": "#000000", "Navy Blue": "#1A237E", "Dark Navy": "#0D1B2A",
    "Midnight Blue": "#191970", "Sky Blue": "#87CEEB", "Cobalt Blue": "#0047AB",
    "Royal Blue": "#4169E1", "Denim Blue": "#1560BD", "Tan": "#D2B48C",
    "Camel": "#C19A6B", "Khaki": "#C3B091", "Olive": "#808000",
    "Sand": "#C2B280", "Beige": "#F5F5DC", "Brown": "#964B00",
    "Dark Brown": "#5C3317", "Burgundy": "#800020", "Maroon": "#800000",
    "Wine Red": "#722F37", "Rust": "#B7410E", "Terracotta": "#E2725B",
    "Brick Red": "#CB4154", "Powder Blue": "#B0E0E6", "Blush Pink": "#FFB6C1",
    "Lilac": "#C8A2C8", "Mint Green": "#98FF98", "Peach": "#FFCBA4",
    "Red": "#FF0000", "Electric Blue": "#7DF9FF", "Hot Pink": "#FF69B4",
    "Neon Green": "#39FF14", "Yellow": "#FFFF00", "Forest Green": "#228B22",
    "Sage": "#BCB88A", "Emerald": "#50C878", "Moss Green": "#8A9A5B",
    "Teal": "#008080", "Pink": "#FFC0CB", "Rose": "#FF007F",
    "Mauve": "#E0B0FF", "Cobalt": "#0047AB",
}

# What occasions go together
OCCASION_GROUPS = {
    "formal":  {"office", "smart_casual", "luxury"},
    "casual":  {"casual", "weekend", "travel", "minimal"},
    "evening": {"date_night", "festive", "luxury"},
    "active":  {"gym", "travel", "casual"},
}

# Category formality levels (1=casual, 5=formal)
FORMALITY = {
    "tshirt": 1, "sneakers": 1, "shorts": 1, "accessory": 2,
    "jeans": 2, "casual_shirt": 2, "watch": 3, "belt": 3,
    "shirt": 3, "loafers": 3, "pants": 3,
    "formal_shirt": 4, "shoes": 4,
    "jacket": 4,
}

# Good base pairings (category → compatible categories)
GOOD_PAIRS = {
    "formal_shirt": {"pants", "jeans", "shoes", "loafers", "belt", "watch", "jacket"},
    "shirt":        {"pants", "jeans", "shorts", "shoes", "sneakers", "loafers", "belt", "watch"},
    "tshirt":       {"jeans", "shorts", "pants", "sneakers", "belt", "accessory"},
    "jeans":        {"shirt", "tshirt", "formal_shirt", "sneakers", "loafers", "shoes", "belt", "jacket"},
    "pants":        {"shirt", "formal_shirt", "shoes", "loafers", "belt", "watch", "jacket"},
    "shorts":       {"tshirt", "shirt", "sneakers", "belt"},
    "jacket":       {"formal_shirt", "shirt", "tshirt", "pants", "jeans", "shoes", "loafers"},
}

BAD_PAIRS = {
    ("formal_shirt", "shorts"),
    ("tshirt", "shoes"),     # dress shoes with tshirt
    ("tshirt", "loafers"),   # too mismatched
    ("shorts", "shoes"),     # dress shoes with shorts
    ("shorts", "jacket"),    # shorts with formal jacket
}


# ── Colour compatibility ───────────────────────────────────────────────────────

def colour_family(colour: str) -> str | None:
    for family, colours in COLOUR_FAMILIES.items():
        if colour in colours:
            return family
    return None


def colour_compatibility_score(colours: list[str]) -> tuple[int, list[str]]:
    """Return (score_adjustment, reasons). Positive = better, negative = worse."""
    if len(colours) < 2:
        return 0, []

    families = [colour_family(c) for c in colours]
    reasons  = []
    score    = 0

    # All neutrals → very safe
    neutral_count = sum(1 for f in families if f == "neutrals")
    if neutral_count == len(colours):
        score += 15
        reasons.append("All-neutral palette is effortlessly polished")

    # Neutrals + one accent → classic
    non_neutral = [f for f in families if f and f != "neutrals"]
    if neutral_count >= len(colours) - 1 and len(non_neutral) == 1:
        score += 12
        reasons.append(f"Neutral base with a single {non_neutral[0]} accent — clean contrast")

    # Same family (monochromatic)
    non_none = [f for f in families if f]
    if len(set(non_none)) == 1 and non_none:
        score += 8
        reasons.append(f"Monochromatic {non_none[0]} palette — cohesive and intentional")

    # Brights clash
    bright_count = sum(1 for f in families if f == "brights")
    if bright_count >= 2:
        score -= 15
        reasons.append("Multiple bright/saturated colours clash with each other")

    # Earthy + neutral — great combo
    earthy_count = sum(1 for f in families if f == "earthy")
    if earthy_count >= 1 and neutral_count >= 1:
        score += 10
        reasons.append("Earthy tones pair naturally with neutrals")

    # Navy + earthy — menswear classic
    navy_count = sum(1 for f in families if f == "navys")
    if navy_count >= 1 and earthy_count >= 1:
        score += 12
        reasons.append("Navy and earthy tones — a timeless menswear combination")

    # Pastels + brights — clash
    pastel_count = sum(1 for f in families if f == "pastels")
    if pastel_count >= 1 and bright_count >= 1:
        score -= 10
        reasons.append("Mixing pastels with brights creates tonal imbalance")

    # Too many different families
    unique_families = len(set(f for f in families if f))
    if unique_families >= 4:
        score -= 12
        reasons.append("Too many competing colour families — outfit lacks cohesion")

    return score, reasons


# ── Outfit building ────────────────────────────────────────────────────────────

def build_outfit(rng: random.Random, quality: str) -> dict[str, Any]:
    """
    quality: 'high' | 'mid' | 'low'
    Returns a dict with items + expected score range.
    """
    items = []

    if quality == "high":
        # Well-matched classic outfits
        template = rng.choice([
            # Smart casual
            {"cats": ["formal_shirt", "pants", "shoes"],        "occ": "smart_casual"},
            {"cats": ["formal_shirt", "pants", "loafers", "watch"], "occ": "office"},
            {"cats": ["shirt", "jeans", "sneakers"],            "occ": "casual"},
            {"cats": ["shirt", "jeans", "loafers"],             "occ": "weekend"},
            {"cats": ["jacket", "formal_shirt", "pants", "shoes"], "occ": "date_night"},
            {"cats": ["tshirt", "jeans", "sneakers"],           "occ": "casual"},
            {"cats": ["shirt", "pants", "loafers", "belt"],     "occ": "smart_casual"},
            {"cats": ["jacket", "tshirt", "jeans", "sneakers"], "occ": "casual"},
        ])
        # Choose harmonious colours
        colour_pool = rng.choice([
            ["White", "Navy Blue", "Black"],
            ["Light Grey", "Charcoal", "Black"],
            ["Beige", "Brown", "White"],
            ["Navy Blue", "Khaki", "White"],
            ["White", "Olive", "Tan"],
            ["Charcoal", "White", "Burgundy"],
            ["Camel", "White", "Dark Brown"],
            ["Navy Blue", "White", "Tan"],
            ["Black", "White", "Grey"],
            ["Olive", "Beige", "Brown"],
        ])

    elif quality == "mid":
        template = rng.choice([
            {"cats": ["shirt", "shorts", "sneakers"],           "occ": "casual"},
            {"cats": ["tshirt", "pants", "loafers"],            "occ": "casual"},
            {"cats": ["formal_shirt", "jeans", "sneakers"],     "occ": "smart_casual"},
            {"cats": ["shirt", "jeans", "shoes"],               "occ": "date_night"},
            {"cats": ["tshirt", "jeans", "belt", "sneakers"],   "occ": "casual"},
        ])
        colour_pool = rng.choice([
            ["Sky Blue", "Denim Blue", "White"],
            ["Olive", "Khaki", "Brown"],
            ["Navy Blue", "Burgundy", "Grey"],
            ["Sage", "Beige", "White"],
            ["Teal", "White", "Jeans Blue"],
        ])

    else:  # low
        template = rng.choice([
            {"cats": ["formal_shirt", "shorts", "sneakers"],    "occ": "office"},
            {"cats": ["tshirt", "shoes", "pants"],              "occ": "smart_casual"},
            {"cats": ["jacket", "shorts", "shoes"],             "occ": "office"},
            {"cats": ["formal_shirt", "shorts"],                "occ": "date_night"},
            {"cats": ["tshirt", "loafers", "shorts"],           "occ": "office"},
        ])
        colour_pool = rng.choice([
            ["Neon Green", "Hot Pink", "Red"],
            ["Electric Blue", "Yellow", "Hot Pink"],
            ["Red", "Burgundy", "Rust"],   # tone-on-tone clash
            ["Neon Green", "Cobalt Blue", "Yellow"],
            ["Hot Pink", "Orange", "Lime"],
        ])

    # Assign colours to categories
    cats = template["cats"]
    colours_used = []
    for i, cat in enumerate(cats):
        col = colour_pool[i % len(colour_pool)]
        colours_used.append(col)
        items.append({
            "category":   cat,
            "color_name": col,
            "color_hex":  COLOUR_HEX.get(col, "#888888"),
            "tags":       [template["occ"]],
        })

    return {"items": items, "target_occasion": template["occ"], "colours": colours_used}


def score_outfit(outfit: dict[str, Any], rng: random.Random) -> tuple[int, str, list[str], list[str]]:
    """
    Return (score 0-100, verdict, reasons[], suggestions[])
    """
    items    = outfit["items"]
    cats     = [it["category"] for it in items]
    colours  = [it["color_name"] for it in items]
    occasion = outfit["target_occasion"]

    base_score = 50
    reasons    = []
    suggestions= []

    # ── Category pair checks ──────────────────────────────────────────────────
    bad_pair_count = 0
    for i, c1 in enumerate(cats):
        for j, c2 in enumerate(cats):
            if i >= j: continue
            pair = tuple(sorted([c1, c2]))
            if pair in {tuple(sorted(p)) for p in BAD_PAIRS}:
                bad_pair_count += 1
                base_score -= 20
                reasons.append(f"{c1.replace('_',' ').title()} with {c2.replace('_',' ').title()} is a formality mismatch")
                suggestions.append(f"Replace {c2.replace('_',' ')} with something that matches the formality of {c1.replace('_',' ')}")

    # ── Good pair checks ──────────────────────────────────────────────────────
    good_pair_count = 0
    for c1 in cats:
        if c1 in GOOD_PAIRS:
            matched = set(cats) & GOOD_PAIRS[c1] - {c1}
            if matched:
                good_pair_count += 1

    if good_pair_count >= 2:
        base_score += 15
        reasons.append("Core items pair well together stylistically")
    elif good_pair_count >= 1:
        base_score += 8

    # ── Colour compatibility ──────────────────────────────────────────────────
    col_adj, col_reasons = colour_compatibility_score(colours)
    base_score += col_adj
    reasons.extend(col_reasons)

    # ── Occasion coherence ────────────────────────────────────────────────────
    occ_group = None
    for grp, occs in OCCASION_GROUPS.items():
        if occasion in occs:
            occ_group = grp
            break

    formality_vals = [FORMALITY.get(c, 3) for c in cats]
    avg_formality  = sum(formality_vals) / len(formality_vals)
    formality_spread = max(formality_vals) - min(formality_vals)

    if occ_group == "formal" and avg_formality < 2.5:
        base_score -= 18
        reasons.append(f"Too casual for a {occasion.replace('_',' ')} setting")
        suggestions.append("Swap the casual pieces for more polished alternatives")
    elif occ_group == "casual" and avg_formality > 4:
        base_score -= 10
        reasons.append("Over-dressed for this casual occasion")
    elif occ_group == "formal" and avg_formality >= 3.5:
        base_score += 12
        reasons.append(f"Formality level suits the {occasion.replace('_',' ')} occasion")
    elif occ_group == "casual" and avg_formality <= 2.5:
        base_score += 10
        reasons.append(f"Relaxed pieces are appropriate for {occasion.replace('_',' ')}")

    if formality_spread >= 3:
        base_score -= 12
        reasons.append("Large formality gap between items — outfit feels disjointed")
        suggestions.append("Aim for items within 1-2 formality levels of each other")

    # ── Count check ───────────────────────────────────────────────────────────
    if len(items) < 2:
        base_score -= 20
        reasons.append("An outfit needs at least 2 items to evaluate")
    elif len(items) >= 4:
        base_score += 5
        reasons.append("Complete look with multiple coordinated pieces")

    # ── Clamp ─────────────────────────────────────────────────────────────────
    score = max(0, min(100, base_score + rng.randint(-5, 5)))

    # ── Verdict ───────────────────────────────────────────────────────────────
    if score >= 80:
        verdict = "Strong match — this outfit works well together"
    elif score >= 65:
        verdict = "Good combination with minor room for improvement"
    elif score >= 50:
        verdict = "Decent outfit — a few adjustments would elevate it"
    elif score >= 35:
        verdict = "Needs work — there are noticeable compatibility issues"
    else:
        verdict = "Poor match — key elements clash or are mismatched"

    if not suggestions:
        if score >= 80:
            suggestions.append("Consider adding a watch or belt to complete the look")
        elif score >= 50:
            suggestions.append("Swap one item for a neutral to improve cohesion")
        else:
            suggestions.append("Rebuild around a neutral base (white shirt or dark trousers)")

    return score, verdict, reasons[:4], suggestions[:3]


# ── Prompt formatting ──────────────────────────────────────────────────────────

SYSTEM = """You are Wearly's outfit compatibility expert, trained to evaluate how well clothing items work together.

For every outfit, return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "verdict": "<one sentence summary>",
  "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "suggestions": ["<improvement 1>", "<improvement 2>"]
}

Score guide: 0-34 poor, 35-49 needs work, 50-64 decent, 65-79 good, 80-100 excellent."""

USER_TEMPLATE = """Rate this outfit for the '{occasion}' occasion:

{items_block}

Return ONLY valid JSON."""


def format_items_block(items: list[dict]) -> str:
    lines = []
    for i, it in enumerate(items, 1):
        cat  = it["category"].replace("_", " ").title()
        col  = it["color_name"]
        tags = ", ".join(it.get("tags", []))
        lines.append(f"{i}. {col} {cat} [{tags}]")
    return "\n".join(lines)


def make_record(outfit: dict, score: int, verdict: str,
                reasons: list[str], suggestions: list[str]) -> dict:
    user_msg = USER_TEMPLATE.format(
        occasion    = outfit["target_occasion"].replace("_", " "),
        items_block = format_items_block(outfit["items"]),
    )
    response = json.dumps({
        "score":       score,
        "verdict":     verdict,
        "reasons":     reasons,
        "suggestions": suggestions,
    }, ensure_ascii=False)

    return {
        "messages": [
            {"role": "system",    "content": SYSTEM},
            {"role": "user",      "content": user_msg},
            {"role": "assistant", "content": response},
        ]
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def generate(n_total: int = 2400, val_fraction: float = 0.12, seed: int = 42) -> None:
    out_dir = Path(__file__).parent
    out_dir.mkdir(parents=True, exist_ok=True)

    rng = random.Random(seed)
    records = []

    # Distribution: 40% high, 35% mid, 25% low
    for i in range(n_total):
        roll = rng.random()
        if roll < 0.40:
            q = "high"
        elif roll < 0.75:
            q = "mid"
        else:
            q = "low"

        outfit = build_outfit(rng, q)
        score, verdict, reasons, suggestions = score_outfit(outfit, rng)
        records.append(make_record(outfit, score, verdict, reasons, suggestions))

    rng.shuffle(records)

    n_val   = int(len(records) * val_fraction)
    val_recs = records[:n_val]
    trn_recs = records[n_val:]

    train_path = out_dir / "outfit_train.jsonl"
    val_path   = out_dir / "outfit_val.jsonl"

    with open(train_path, "w", encoding="utf-8") as f:
        for r in trn_recs:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    with open(val_path, "w", encoding="utf-8") as f:
        for r in val_recs:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"Generated {len(trn_recs):,} train + {len(val_recs):,} val records")
    print(f"  → {train_path}")
    print(f"  → {val_path}")

    # Score distribution
    all_scores = []
    for r in records:
        resp = json.loads(r["messages"][2]["content"])
        all_scores.append(resp["score"])
    avg = sum(all_scores) / len(all_scores)
    low = sum(1 for s in all_scores if s < 35)
    mid = sum(1 for s in all_scores if 35 <= s < 65)
    hi  = sum(1 for s in all_scores if s >= 65)
    print(f"\nScore distribution (avg={avg:.1f}):")
    print(f"  Poor  (0-34) : {low:>5} ({100*low/len(all_scores):.1f}%)")
    print(f"  Mid  (35-64) : {mid:>5} ({100*mid/len(all_scores):.1f}%)")
    print(f"  Good (65-100): {hi:>5}  ({100*hi/len(all_scores):.1f}%)")


if __name__ == "__main__":
    generate()
