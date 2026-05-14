"""
Wearly AI — Makeup Dataset Downloader
Downloads and prepares all six makeup datasets for fine-tuning Gemma 4.

Usage:
  pip install -r requirements.txt
  python download_datasets.py --datasets all
  python download_datasets.py --datasets youmakeup ffhq ladn
"""

import os, json, argparse, requests, zipfile, tarfile, shutil
from pathlib import Path
from tqdm import tqdm

ROOT = Path(__file__).parent.parent / "datasets"
ROOT.mkdir(exist_ok=True)

# ── Dataset registry ──────────────────────────────────────────────────────────
DATASETS = {

    "youmakeup": {
        "name": "YouMakeup",
        "description": "2,800 YouTube makeup tutorial videos with step annotations",
        "hf_repo": "AIM3-RUC/YouMakeup",
        "type": "huggingface",
        "splits": ["train", "validation", "test"],
        "size_hint": "~8 GB",
        "license": "CC BY 4.0",
    },

    "ffhq_makeup": {
        "name": "FFHQ-Makeup",
        "description": "90,000 paired makeup/no-makeup portrait images",
        "hf_repo": "RoyalGentleman/FFHQ-Makeup",
        "type": "huggingface",
        "size_hint": "~42 GB",
        "license": "CC BY-NC 4.0",
    },

    "beautybank": {
        "name": "BeautyBank",
        "description": "Latent makeup encoding + similarity dataset",
        "hf_repo": "BUAADreamer/BeautyBank",
        "type": "huggingface",
        "size_hint": "~2 GB",
        "license": "Apache 2.0",
    },

    "ladn": {
        "name": "LADN Dataset",
        "description": "Paired before/after + facial landmarks + style transfer",
        "hf_repo": "andrewbonney/LADN-Makeup",
        "type": "huggingface",
        "size_hint": "~4 GB",
        "license": "MIT",
    },

    "cpm": {
        "name": "CPM – Color Pattern Makeup",
        "description": "Lipstick colors, texture, pattern segmentation",
        "hf_repo": "Qbeast/CPM-Makeup-Dataset",
        "type": "huggingface",
        "size_hint": "~1.5 GB",
        "license": "CC BY 4.0",
    },

    "flux_hqmt": {
        "name": "FLUX-Makeup HQMT",
        "description": "50,000+ quality-controlled makeup transfer samples",
        "hf_repo": "xiaoming040504/FLUX-Makeup",
        "type": "huggingface",
        "size_hint": "~22 GB",
        "license": "CC BY-NC 4.0",
    },
}


def download_hf_dataset(key: str, cfg: dict, token: str | None):
    from datasets import load_dataset
    dest = ROOT / key
    dest.mkdir(exist_ok=True)
    print(f"\n📥 Downloading {cfg['name']} ({cfg['size_hint']}) from HuggingFace …")
    try:
        ds = load_dataset(cfg["hf_repo"], token=token, cache_dir=str(dest))
        print(f"  ✅ {cfg['name']} ready at {dest}")
        return ds
    except Exception as e:
        print(f"  ⚠️  Could not auto-download {cfg['name']}: {e}")
        print(f"  👉  Manual: huggingface-cli download {cfg['hf_repo']} --local-dir {dest}")
        return None


def convert_youmakeup(ds) -> list[dict]:
    """Convert YouMakeup to Wearly instruction format."""
    rows = []
    for split in ds:
        for item in ds[split]:
            steps = item.get("steps") or item.get("annotations") or []
            if not steps:
                continue
            step_text = "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps))
            rows.append({
                "instruction": "Describe the makeup steps shown in this tutorial.",
                "input": item.get("title", ""),
                "output": step_text,
                "source": "youmakeup",
                "tags": ["makeup_tutorial", "step_annotation"],
            })
    return rows


def convert_ffhq_makeup(ds) -> list[dict]:
    """Convert FFHQ pairs to before/after understanding format."""
    rows = []
    for split in ds:
        for item in ds[split]:
            style = item.get("makeup_style") or item.get("style_label", "unknown")
            rows.append({
                "instruction": "Describe the makeup look in this image and suggest products that recreate it.",
                "input": f"Style: {style}",
                "output": f"This is a {style} makeup look. The face shows {item.get('description', 'professional makeup application')}.",
                "source": "ffhq_makeup",
                "tags": ["before_after", "style_recognition"],
            })
    return rows


def convert_cpm(ds) -> list[dict]:
    """Convert CPM color/pattern data into lipstick colour matching format."""
    rows = []
    for split in ds:
        for item in ds[split]:
            color = item.get("lip_color") or item.get("color_name", "")
            hex_val = item.get("hex") or item.get("color_hex", "")
            outfit_color = item.get("outfit_color", "")
            rows.append({
                "instruction": "Suggest a lipstick color that pairs with this outfit.",
                "input": f"Outfit colour: {outfit_color}",
                "output": json.dumps({
                    "lips": {
                        "shade": color,
                        "hex": hex_val,
                        "why": f"{color} harmonises with {outfit_color} through contrast or analogous pairing.",
                    }
                }),
                "source": "cpm",
                "tags": ["lipstick_matching", "color_coordination"],
            })
    return rows


def convert_generic(ds, source_key: str) -> list[dict]:
    """Generic converter — wraps any HF dataset into instruction format."""
    rows = []
    for split in ds:
        for item in ds[split]:
            text_fields = {k: v for k, v in item.items() if isinstance(v, str) and v}
            if not text_fields:
                continue
            rows.append({
                "instruction": "Describe this makeup look and suggest how to recreate it.",
                "input": " | ".join(f"{k}: {v}" for k, v in list(text_fields.items())[:3]),
                "output": text_fields.get("description") or text_fields.get("caption") or list(text_fields.values())[0],
                "source": source_key,
                "tags": ["makeup_description"],
            })
    return rows


CONVERTERS = {
    "youmakeup":  convert_youmakeup,
    "ffhq_makeup": convert_ffhq_makeup,
    "cpm":        convert_cpm,
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--datasets", nargs="+", default=["all"],
                        help="Dataset keys to download (or 'all')")
    parser.add_argument("--token", default=os.getenv("HF_TOKEN"),
                        help="HuggingFace API token (for gated repos)")
    parser.add_argument("--convert", action="store_true",
                        help="Convert downloaded datasets to JSONL instruction format")
    args = parser.parse_args()

    keys = list(DATASETS.keys()) if "all" in args.datasets else args.datasets

    all_rows: list[dict] = []

    for key in keys:
        if key not in DATASETS:
            print(f"⚠️  Unknown dataset '{key}'. Available: {', '.join(DATASETS)}")
            continue

        cfg = DATASETS[key]
        ds = download_hf_dataset(key, cfg, args.token)

        if ds and args.convert:
            converter = CONVERTERS.get(key, lambda d: convert_generic(d, key))
            rows = converter(ds)
            all_rows.extend(rows)
            print(f"  ✅ Converted {len(rows):,} examples from {cfg['name']}")

    if args.convert and all_rows:
        out = ROOT / "wearly_makeup_train.jsonl"
        with open(out, "w") as f:
            for row in all_rows:
                f.write(json.dumps(row) + "\n")
        print(f"\n✅ Combined dataset saved → {out}")
        print(f"   Total examples: {len(all_rows):,}")


if __name__ == "__main__":
    main()
