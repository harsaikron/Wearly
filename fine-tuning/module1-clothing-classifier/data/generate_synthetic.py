"""
Step 0 — Synthetic Dataset Generator
=====================================
Generates a high-quality JSONL training dataset for the Wearly clothing
classifier without requiring a paid API. Uses:
  1. Rule-based generation from clothing taxonomy (fast, zero cost)
  2. Optional: Ollama base model to enrich descriptions

Output: data/synthetic_train.jsonl  (~2,000 examples)
        data/synthetic_val.jsonl    (~200 examples)

Each record:
{
  "messages": [
    {"role": "user",      "content": "<prompt>"},
    {"role": "assistant", "content": "<valid JSON string>"}
  ]
}
"""

import json
import random
import hashlib
from pathlib import Path
from typing import Optional

# ── Taxonomy ──────────────────────────────────────────────────────────────────

CATEGORIES = {
    "tshirt": {
        "names": [
            "Crew-Neck T-Shirt", "Graphic Tee", "Plain T-Shirt",
            "Oversized Tee", "Striped T-Shirt", "Pocket Tee", "Ringer Tee",
            "Longline T-Shirt", "V-Neck Tee", "Henley T-Shirt",
        ],
        "occasions": [["casual"], ["casual", "weekend"], ["weekend"], ["gym", "casual"]],
        "fabrics": ["cotton", "jersey", "bamboo", "polyester blend"],
        "fit": ["slim fit", "regular fit", "oversized", "relaxed fit"],
    },
    "shirt": {
        "names": [
            "Oxford Shirt", "Linen Shirt", "Flannel Shirt", "Chambray Shirt",
            "Camp Collar Shirt", "Button-Down Shirt", "Poplin Shirt",
            "Denim Shirt", "Plaid Shirt", "Casual Button-Up",
        ],
        "occasions": [["casual", "weekend"], ["smart_casual"], ["casual"], ["travel", "casual"]],
        "fabrics": ["linen", "cotton", "chambray", "flannel", "poplin"],
        "fit": ["slim fit", "regular fit", "relaxed fit", "tailored"],
    },
    "formal_shirt": {
        "names": [
            "Dress Shirt", "White Formal Shirt", "Business Shirt",
            "Spread Collar Shirt", "Pinstripe Shirt", "French Cuff Shirt",
            "Wing Collar Shirt", "Cutaway Collar Shirt",
        ],
        "occasions": [["office"], ["office", "smart_casual"], ["office", "luxury"], ["date_night", "office"]],
        "fabrics": ["cotton twill", "broadcloth", "satin", "herringbone"],
        "fit": ["slim fit", "tailored", "regular fit"],
    },
    "pants": {
        "names": [
            "Chinos", "Cargo Pants", "Trousers", "Linen Trousers",
            "Slim Trousers", "Wide-Leg Pants", "Jogger Pants",
            "Pleated Trousers", "Cropped Trousers",
        ],
        "occasions": [["casual", "smart_casual"], ["office", "smart_casual"], ["casual"], ["travel"]],
        "fabrics": ["chino", "linen", "wool blend", "cotton twill"],
        "fit": ["slim fit", "tapered", "wide leg", "straight leg"],
    },
    "jeans": {
        "names": [
            "Slim Fit Jeans", "Straight Leg Jeans", "Skinny Jeans",
            "Raw Denim Jeans", "Distressed Jeans", "Bootcut Jeans",
            "Wide Leg Jeans", "Tapered Jeans", "Relaxed Fit Jeans",
        ],
        "occasions": [["casual"], ["casual", "weekend"], ["date_night", "casual"], ["casual", "smart_casual"]],
        "fabrics": ["denim", "stretch denim", "raw denim"],
        "fit": ["slim fit", "straight", "skinny", "relaxed", "wide leg"],
    },
    "shorts": {
        "names": [
            "Chino Shorts", "Cargo Shorts", "Athletic Shorts",
            "Board Shorts", "Linen Shorts", "Denim Shorts",
            "Bermuda Shorts", "Running Shorts",
        ],
        "occasions": [["casual", "weekend"], ["gym", "casual"], ["travel", "casual"], ["beach", "casual"]],
        "fabrics": ["cotton", "linen", "nylon", "denim"],
        "fit": ["regular fit", "slim fit", "relaxed"],
    },
    "jacket": {
        "names": [
            "Bomber Jacket", "Denim Jacket", "Leather Jacket",
            "Harrington Jacket", "Field Jacket", "Coach Jacket",
            "Track Jacket", "Windbreaker", "Blazer", "Sport Coat",
        ],
        "occasions": [["casual", "smart_casual"], ["date_night"], ["smart_casual", "office"], ["casual"]],
        "fabrics": ["denim", "leather", "nylon", "cotton twill", "wool"],
        "fit": ["slim fit", "regular fit", "oversized"],
    },
    "shoes": {
        "names": [
            "Oxford Shoes", "Derby Shoes", "Loafers", "Chelsea Boots",
            "Desert Boots", "Brogues", "Monk Strap Shoes",
        ],
        "occasions": [["office", "smart_casual"], ["date_night", "smart_casual"], ["smart_casual"], ["luxury", "office"]],
        "fabrics": ["leather", "suede", "patent leather"],
        "fit": [],
    },
    "sneakers": {
        "names": [
            "Chunky Sneakers", "Low-Top Sneakers", "High-Top Sneakers",
            "Running Shoes", "Court Sneakers", "Slip-On Sneakers",
            "Retro Sneakers", "Minimalist Sneakers",
        ],
        "occasions": [["casual"], ["casual", "weekend"], ["gym", "casual"], ["casual", "smart_casual"]],
        "fabrics": ["canvas", "leather", "mesh", "knit"],
        "fit": [],
    },
    "loafers": {
        "names": [
            "Penny Loafers", "Tassel Loafers", "Horsebit Loafers",
            "Driving Loafers", "Suede Loafers",
        ],
        "occasions": [["smart_casual"], ["casual", "smart_casual"], ["office", "smart_casual"], ["date_night"]],
        "fabrics": ["leather", "suede", "velvet"],
        "fit": [],
    },
    "watch": {
        "names": [
            "Dress Watch", "Field Watch", "Dive Watch", "Pilot Watch",
            "Minimalist Watch", "Chronograph Watch", "Digital Watch",
        ],
        "occasions": [["office", "smart_casual"], ["casual"], ["luxury"], ["smart_casual", "date_night"]],
        "fabrics": ["stainless steel", "leather strap", "NATO strap", "ceramic"],
        "fit": [],
    },
    "belt": {
        "names": [
            "Leather Belt", "Woven Belt", "Canvas Belt",
            "Braided Belt", "Reversible Belt",
        ],
        "occasions": [["office"], ["casual", "smart_casual"], ["smart_casual"], ["casual"]],
        "fabrics": ["leather", "canvas", "suede"],
        "fit": [],
    },
    "accessory": {
        "names": [
            "Scarf", "Cap", "Beanie", "Sunglasses", "Tote Bag",
            "Backpack", "Wallet", "Tie", "Pocket Square", "Socks",
        ],
        "occasions": [["casual"], ["smart_casual"], ["office"], ["weekend", "casual"]],
        "fabrics": ["cotton", "wool", "leather", "polyester"],
        "fit": [],
    },
}

COLORS = [
    ("#FFFFFF", "White"),
    ("#F5F5F5", "Off White"),
    ("#F0EAD6", "Cream"),
    ("#000000", "Black"),
    ("#1C1C1C", "Charcoal Black"),
    ("#212121", "Jet Black"),
    ("#808080", "Grey"),
    ("#A9A9A9", "Light Grey"),
    ("#696969", "Dark Grey"),
    ("#C0C0C0", "Silver Grey"),
    ("#1A237E", "Navy Blue"),
    ("#0D47A1", "Dark Blue"),
    ("#1565C0", "Royal Blue"),
    ("#42A5F5", "Sky Blue"),
    ("#90CAF9", "Baby Blue"),
    ("#01579B", "Denim Blue"),
    ("#1B5E20", "Forest Green"),
    ("#2E7D32", "Dark Green"),
    ("#4CAF50", "Green"),
    ("#A5D6A7", "Mint Green"),
    ("#B71C1C", "Dark Red"),
    ("#C62828", "Crimson Red"),
    ("#EF5350", "Red"),
    ("#FFCDD2", "Blush Pink"),
    ("#880E4F", "Burgundy"),
    ("#E91E63", "Pink"),
    ("#F57F17", "Amber"),
    ("#FF8F00", "Orange"),
    ("#FF6F00", "Deep Orange"),
    ("#F9A825", "Golden Yellow"),
    ("#FFEE58", "Yellow"),
    ("#4E342E", "Dark Brown"),
    ("#6D4C41", "Brown"),
    ("#A1887F", "Tan"),
    ("#D7CCC8", "Beige"),
    ("#795548", "Caramel"),
    ("#4A148C", "Dark Purple"),
    ("#6A1B9A", "Purple"),
    ("#9C27B0", "Violet"),
    ("#CE93D8", "Lavender"),
    ("#006064", "Teal"),
    ("#00838F", "Dark Teal"),
    ("#26C6DA", "Cyan"),
    ("#3E2723", "Espresso"),
    ("#BF360C", "Rust"),
    ("#827717", "Olive"),
    ("#558B2F", "Olive Green"),
    ("#F3E5F5", "Lilac"),
    ("#FFF9C4", "Pale Yellow"),
    ("#E0F2F1", "Pale Mint"),
]

SCENE_DESCRIPTIONS = [
    "photographed on a white background",
    "laid flat on a wooden surface",
    "on a clothes hanger against a light wall",
    "folded neatly on a table",
    "worn on a mannequin",
    "product shot on plain background",
    "photographed in natural daylight",
    "shot against a grey backdrop",
]

CONDITION_DESCRIPTIONS = [
    "brand new with tags", "like new", "gently worn", "good condition",
    "shows some wear", "preloved", "barely worn",
]

# ── Prompt templates ──────────────────────────────────────────────────────────

USER_PROMPTS = [
    "Analyze this clothing item and return JSON with category, color_hex, color_name, suggested_name, and tags.",
    "Classify this garment. Reply only with valid JSON: category, color_hex, color_name, suggested_name, tags.",
    "What clothing item is this? Return structured JSON with: suggested_name, category, color_hex, color_name, tags.",
    "Identify this clothing item and output JSON fields: category, color_hex, color_name, suggested_name, tags.",
    "Examine this garment and return classification JSON with category, color_hex, color_name, suggested_name, and occasion tags.",
]

# ── Generator ─────────────────────────────────────────────────────────────────

def generate_example(seed: int) -> dict:
    rng = random.Random(seed)

    category = rng.choice(list(CATEGORIES.keys()))
    cat_data = CATEGORIES[category]

    name_base  = rng.choice(cat_data["names"])
    color_hex, color_name = rng.choice(COLORS)
    occasions  = rng.choice(cat_data["occasions"])
    fabric     = rng.choice(cat_data["fabrics"]) if cat_data["fabrics"] else ""
    fit        = rng.choice(cat_data["fit"])      if cat_data["fit"]     else ""
    scene      = rng.choice(SCENE_DESCRIPTIONS)
    condition  = rng.choice(CONDITION_DESCRIPTIONS)

    # Build a rich item name
    name_parts = [color_name, fit, name_base] if fit else [color_name, name_base]
    suggested_name = " ".join(p for p in name_parts if p).strip()

    # Build user message (simulate what analyze-clothing route sends)
    prompt = rng.choice(USER_PROMPTS)
    user_content = f"{prompt}\n\n[Image: {color_name} {name_base} — {scene}, {condition}. Fabric: {fabric}]"

    # Build ground-truth assistant response
    output = {
        "suggested_name": suggested_name,
        "category": category,
        "color_hex": color_hex,
        "color_name": color_name,
        "tags": occasions,
    }

    return {
        "messages": [
            {"role": "user",      "content": user_content},
            {"role": "assistant", "content": json.dumps(output)},
        ],
        "_meta": {
            "category": category,
            "color": color_name,
            "seed": seed,
        },
    }


def generate_hard_negatives(n: int = 200, start_seed: int = 50000) -> list[dict]:
    """
    Generate tricky edge cases:
    - Dark navy items (often misclassified as black)
    - Formal shirts vs regular shirts
    - Loafers vs shoes
    - Accessories with unusual colour names
    """
    hard_cases = [
        # Navy vs black confusion
        {
            "messages": [
                {"role": "user", "content": "Analyze this clothing item and return JSON with category, color_hex, color_name, suggested_name, and tags.\n\n[Image: very dark blue dress shirt — product shot on plain background, like new. Fabric: cotton twill]"},
                {"role": "assistant", "content": json.dumps({"suggested_name": "Navy Blue Dress Shirt", "category": "formal_shirt", "color_hex": "#1A237E", "color_name": "Navy Blue", "tags": ["office", "smart_casual"]})},
            ]
        },
        # Olive vs green confusion
        {
            "messages": [
                {"role": "user", "content": "Classify this garment. Reply only with valid JSON.\n\n[Image: muted earthy green cargo pants — laid flat on wooden surface, gently worn. Fabric: cotton twill]"},
                {"role": "assistant", "content": json.dumps({"suggested_name": "Olive Cargo Pants", "category": "pants", "color_hex": "#827717", "color_name": "Olive", "tags": ["casual", "travel"]})},
            ]
        },
        # Blazer vs jacket
        {
            "messages": [
                {"role": "user", "content": "What clothing item is this? Return structured JSON.\n\n[Image: structured navy blazer with gold buttons — on mannequin, like new. Fabric: wool blend]"},
                {"role": "assistant", "content": json.dumps({"suggested_name": "Navy Double-Button Blazer", "category": "jacket", "color_hex": "#1A237E", "color_name": "Navy Blue", "tags": ["office", "smart_casual", "date_night"]})},
            ]
        },
        # Off-white vs white
        {
            "messages": [
                {"role": "user", "content": "Identify this clothing item and output JSON.\n\n[Image: slightly warm-toned white linen shirt — photographed in natural daylight, like new. Fabric: linen]"},
                {"role": "assistant", "content": json.dumps({"suggested_name": "Cream Linen Shirt", "category": "shirt", "color_hex": "#F0EAD6", "color_name": "Cream", "tags": ["casual", "travel", "weekend"]})},
            ]
        },
        # Watch edge case
        {
            "messages": [
                {"role": "user", "content": "Examine this garment and return classification JSON.\n\n[Image: silver minimalist watch with black leather strap — product shot, brand new with tags]"},
                {"role": "assistant", "content": json.dumps({"suggested_name": "Silver Minimalist Watch", "category": "watch", "color_hex": "#C0C0C0", "color_name": "Silver Grey", "tags": ["office", "smart_casual", "casual"]})},
            ]
        },
    ]

    # Extend with programmatic hard negatives
    rng = random.Random(start_seed)
    for i in range(n - len(hard_cases)):
        # Pick two similar categories and generate examples for both
        similar_pairs = [
            ("shirt", "formal_shirt"),
            ("shoes", "loafers"),
            ("sneakers", "shoes"),
            ("pants", "jeans"),
            ("jacket", "shirt"),
        ]
        cat_a, cat_b = rng.choice(similar_pairs)
        cat = rng.choice([cat_a, cat_b])
        hard_cases.append(generate_example(start_seed + i))

    return hard_cases


def build_dataset(
    n_train: int = 2000,
    n_val: int = 200,
    output_dir: str = "data",
) -> None:
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    print(f"Generating {n_train} training examples…")
    train_examples = [generate_example(i) for i in range(n_train)]
    hard_negatives = generate_hard_negatives(200)
    train_examples.extend(hard_negatives)
    random.shuffle(train_examples)

    print(f"Generating {n_val} validation examples…")
    val_examples = [generate_example(i + 100000) for i in range(n_val)]

    train_path = out / "synthetic_train.jsonl"
    val_path   = out / "synthetic_val.jsonl"

    with open(train_path, "w") as f:
        for ex in train_examples:
            f.write(json.dumps(ex) + "\n")

    with open(val_path, "w") as f:
        for ex in val_examples:
            f.write(json.dumps(ex) + "\n")

    print(f"✓ Train: {len(train_examples)} examples → {train_path}")
    print(f"✓ Val:   {len(val_examples)} examples → {val_path}")

    # Print distribution
    from collections import Counter
    cats = Counter(ex["_meta"]["category"] for ex in train_examples if "_meta" in ex)
    print("\nCategory distribution (train):")
    for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
        bar = "█" * (count // 10)
        print(f"  {cat:20s} {count:4d}  {bar}")


if __name__ == "__main__":
    random.seed(42)
    build_dataset(n_train=2000, n_val=200, output_dir="data")
    print("\nDone. Run: python 1_prepare_dataset.py")
