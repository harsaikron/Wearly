"""
Step 3 — Export fine-tuned model to GGUF + register with Ollama
================================================================
Merges LoRA weights into base model → quantises to Q4_K_M GGUF
→ writes Modelfile → optionally runs `ollama create wearly-outfit-v1`.

Usage:
  python 3_export.py
  python 3_export.py --model checkpoints/wearly-gemma4-outfit-YYYYMMDD/final
  python 3_export.py --ollama            # also register with Ollama
  python 3_export.py --quant q8_0       # larger/higher quality export
"""

import argparse
import subprocess
import sys
from pathlib import Path
from datetime import datetime


EXPORT_DIR   = Path("gguf_exports")
OLLAMA_NAME  = "wearly-outfit-v1"
DEFAULT_QUANT = "q4_k_m"


def find_latest_checkpoint(output_dir: str = "checkpoints") -> str | None:
    ckpts = sorted(Path(output_dir).glob("wearly-gemma4-outfit-*"))
    for ckpt in reversed(ckpts):
        final = ckpt / "final"
        if final.exists():
            return str(final)
    return None


def export(model_path: str, quant: str = DEFAULT_QUANT, register_ollama: bool = False) -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n[1/4] Loading fine-tuned model from: {model_path}")
    try:
        from unsloth import FastLanguageModel
    except ImportError:
        print("✗ Unsloth not installed. Run: pip install -r requirements.txt")
        sys.exit(1)

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name     = model_path,
        max_seq_length = 768,
        load_in_4bit   = True,
        dtype          = None,
    )

    # ── Merge LoRA ────────────────────────────────────────────────────────────
    print("[2/4] Merging LoRA adapters into base weights…")
    merged_dir = EXPORT_DIR / "merged"
    model.save_pretrained_merged(
        str(merged_dir),
        tokenizer,
        save_method="merged_16bit",
    )

    # ── Export GGUF ───────────────────────────────────────────────────────────
    stamp     = datetime.now().strftime("%Y%m%d")
    gguf_name = f"wearly-gemma4-outfit-{quant}-{stamp}.gguf"
    gguf_path = EXPORT_DIR / gguf_name

    print(f"[3/4] Exporting GGUF ({quant.upper()}) → {gguf_path}")
    model.save_pretrained_gguf(
        str(EXPORT_DIR / f"wearly-gemma4-outfit-{stamp}"),
        tokenizer,
        quantization_method=quant,
    )

    # Rename the exported file to our convention
    generated = list(EXPORT_DIR.glob(f"*{stamp}*.gguf"))
    if generated:
        generated[0].rename(gguf_path)
        print(f"  ✓ GGUF saved: {gguf_path}  ({gguf_path.stat().st_size / 1e9:.1f} GB)")
    else:
        # Unsloth may use a different naming scheme
        generated = list(EXPORT_DIR.glob("*.gguf"))
        if generated:
            gguf_path = sorted(generated)[-1]
            print(f"  ✓ GGUF found: {gguf_path}")

    # ── Write Modelfile ───────────────────────────────────────────────────────
    print("[4/4] Writing Modelfile…")
    modelfile_content = f"""# Wearly Outfit Compatibility Scorer — Gemma 4 fine-tuned with Unsloth
# ====================================================================
# Run: ollama create {OLLAMA_NAME} -f Modelfile

FROM ./{gguf_path.name}

SYSTEM \"\"\"You are Wearly's outfit compatibility expert.
For every outfit, return ONLY valid JSON with exactly these fields:
- score: integer 0-100 (0-34 poor, 35-49 needs work, 50-64 decent, 65-79 good, 80-100 excellent)
- verdict: one sentence summary of the outfit compatibility
- reasons: array of 2-4 specific reasons why items work or clash
- suggestions: array of 1-3 concrete improvements

Return ONLY the JSON object. No markdown fences. No explanation. No preamble.\"\"\"

# Balanced temperature — still creative with explanations but consistent with scores
PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_predict 400
PARAMETER stop "<end_of_turn>"
PARAMETER stop "<eos>"
PARAMETER stop "```"
"""
    modelfile_path = EXPORT_DIR / "Modelfile"
    modelfile_path.write_text(modelfile_content)
    print(f"  ✓ Modelfile written: {modelfile_path}")

    # Copy to module root for convenience
    root_modelfile = Path("Modelfile")
    root_modelfile.write_text(modelfile_content)

    # ── Register with Ollama ──────────────────────────────────────────────────
    if register_ollama:
        _register_with_ollama(gguf_path, modelfile_path)

    print(f"""
✓ Export complete!

Files:
  GGUF      : {gguf_path}
  Modelfile : {modelfile_path}

To register manually with Ollama:
  ollama create {OLLAMA_NAME} -f {modelfile_path}

Then verify:
  ollama run {OLLAMA_NAME} "Rate this outfit for casual occasion: 1. White Tshirt 2. Blue Jeans 3. White Sneakers"
""")


def _register_with_ollama(gguf_path: Path, modelfile_path: Path) -> None:
    print("\nRegistering with Ollama…")
    try:
        # Check Ollama is running
        import urllib.request
        urllib.request.urlopen("http://localhost:11434/api/tags", timeout=2)
    except Exception:
        print("  ⚠ Ollama is not running. Start it with: ollama serve")
        print(f"  Then run manually: ollama create {OLLAMA_NAME} -f {modelfile_path}")
        return

    try:
        result = subprocess.run(
            ["ollama", "create", OLLAMA_NAME, "-f", str(modelfile_path)],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode == 0:
            print(f"  ✓ Registered as '{OLLAMA_NAME}' in Ollama")
            print(f"  Test: ollama run {OLLAMA_NAME}")
        else:
            print(f"  ✗ Ollama create failed:\n{result.stderr}")
    except FileNotFoundError:
        print("  ✗ `ollama` command not found. Install from https://ollama.com")
    except subprocess.TimeoutExpired:
        print("  ⚠ Ollama create timed out — model may be too large. Check: ollama list")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export outfit compatibility model to GGUF")
    parser.add_argument("--model",  type=str, default=None,          help="Path to fine-tuned model (auto-detects latest)")
    parser.add_argument("--quant",  type=str, default=DEFAULT_QUANT, help="Quantisation method (q4_k_m, q8_0, f16)")
    parser.add_argument("--ollama", action="store_true",             help="Register model with Ollama after export")
    args = parser.parse_args()

    model_path = args.model or find_latest_checkpoint()
    if not model_path:
        print("No fine-tuned model found. Run: python 2_train.py")
        sys.exit(1)

    export(model_path, args.quant, args.ollama)
