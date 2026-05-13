"""
Step 2 — Fine-tune Gemma 4 for outfit compatibility scoring with Unsloth
=========================================================================
Uses QLoRA (4-bit) + RS-LoRA for memory-efficient training.

The model learns to:
  - Score outfit combinations 0–100
  - Explain WHY items work or clash (colour theory, formality gaps, occasion fit)
  - Suggest specific improvements

This is a regression-over-generation task — the model generates structured JSON
rather than a single number, giving explainable scores instead of black-box ratings.

Hardware:
  Minimum : 16 GB VRAM
  Recommended: A100 40GB (Google Colab Pro / RunPod)

Time:
  2,400 examples on A100  → ~10 minutes
  2,400 examples on T4    → ~55 minutes

Usage:
  python 2_train.py
  python 2_train.py --epochs 2 --batch-size 4
  python 2_train.py --dry-run
  python 2_train.py --resume checkpoints/wearly-gemma4-outfit-YYYYMMDD/checkpoint-400
"""

import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────

BASE_MODEL     = "unsloth/gemma-4-8b-it"
MAX_SEQ_LEN    = 768          # outfit JSON prompts are shorter than clothing classification
LORA_R         = 16
LORA_ALPHA     = 32
LORA_DROPOUT   = 0.05
TARGET_MODULES = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
]
BATCH_SIZE     = 2
GRAD_ACCUM     = 8            # effective batch = 16
WARMUP_STEPS   = 40
MAX_STEPS      = 600          # ~1 epoch on 2.4k dataset + slight oversampling
LR             = 2e-4
WEIGHT_DECAY   = 0.01
OUTPUT_DIR     = "checkpoints"
LOG_STEPS      = 10
SAVE_STEPS     = 100
EVAL_STEPS     = 100
SEED           = 42


# ── Dry-run ───────────────────────────────────────────────────────────────────

def dry_run(data_dir: str = "data") -> None:
    print("=" * 60)
    print("DRY RUN — Module 2 Outfit Compatibility Scorer")
    print("=" * 60)
    print(f"Base model     : {BASE_MODEL}")
    print(f"Task           : Score outfit combos 0-100 + explain reasons")
    print(f"Output schema  : {{score, verdict, reasons[], suggestions[]}}")
    print(f"LoRA rank      : {LORA_R}  alpha={LORA_ALPHA}  RS-LoRA=True")
    print(f"Max seq len    : {MAX_SEQ_LEN}")
    print(f"Effective batch: {BATCH_SIZE} × {GRAD_ACCUM} = {BATCH_SIZE * GRAD_ACCUM}")
    print(f"Max steps      : {MAX_STEPS}")
    print()

    for fname in ["outfit_train.jsonl", "outfit_compat_train"]:
        p = Path(data_dir) / fname
        if p.exists():
            if p.is_file():
                records = [json.loads(l) for l in open(p)][:3]
            else:
                # Arrow dataset — show JSONL
                jsonl = Path(data_dir) / "outfit_train.jsonl"
                records = [json.loads(l) for l in open(jsonl)][:3] if jsonl.exists() else []

            print(f"Sample training records from {p}:")
            for i, r in enumerate(records[:2]):
                print(f"\n--- Record {i+1} ---")
                for msg in r["messages"]:
                    role    = msg["role"].upper()
                    content = msg["content"][:250] + "…" if len(msg["content"]) > 250 else msg["content"]
                    print(f"[{role}] {content}")
            break
    else:
        print("No dataset found. Run: python 1_prepare_dataset.py")


# ── Training ──────────────────────────────────────────────────────────────────

def train(
    epochs: int    = 1,
    batch_size: int = BATCH_SIZE,
    grad_accum: int = GRAD_ACCUM,
    max_steps: int  = MAX_STEPS,
    resume: str | None = None,
    data_dir: str   = "data",
    output_dir: str = OUTPUT_DIR,
) -> str:

    print("\nImporting Unsloth…")
    try:
        from unsloth import FastLanguageModel
        from unsloth.chat_templates import get_chat_template
    except ImportError:
        print("✗ Unsloth not installed. Run: pip install -r requirements.txt")
        sys.exit(1)

    try:
        from trl import SFTTrainer, SFTConfig
        from datasets import load_from_disk, Dataset
        import torch
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        sys.exit(1)

    # ── 1. Load base model ────────────────────────────────────────────────────
    print(f"\nLoading {BASE_MODEL} with 4-bit QLoRA…")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name     = resume or BASE_MODEL,
        max_seq_length = MAX_SEQ_LEN,
        load_in_4bit   = True,
        dtype          = None,
    )
    tokenizer = get_chat_template(tokenizer, chat_template="gemma-3")

    # ── 2. LoRA adapters ──────────────────────────────────────────────────────
    print("Attaching RS-LoRA adapters…")
    model = FastLanguageModel.get_peft_model(
        model,
        r                          = LORA_R,
        target_modules             = TARGET_MODULES,
        lora_alpha                 = LORA_ALPHA,
        lora_dropout               = LORA_DROPOUT,
        bias                       = "none",
        use_gradient_checkpointing = "unsloth",
        random_state               = SEED,
        use_rslora                 = True,   # RS-LoRA for better convergence on scoring tasks
        loftq_config               = None,
    )
    model.print_trainable_parameters()

    # ── 3. Dataset ────────────────────────────────────────────────────────────
    print("\nLoading dataset…")
    data = Path(data_dir)
    train_arrow = data / "outfit_compat_train"
    val_arrow   = data / "outfit_compat_val"

    if train_arrow.exists():
        train_ds = load_from_disk(str(train_arrow))
        val_ds   = load_from_disk(str(val_arrow))
    else:
        # JSONL fallback
        for fname in ["outfit_train_merged.jsonl", "outfit_train.jsonl"]:
            p = data / fname
            if p.exists():
                records = [json.loads(l) for l in open(p)]
                n_val   = max(50, len(records) // 10)
                train_ds = Dataset.from_list(records[n_val:])
                val_ds   = Dataset.from_list(records[:n_val])
                break
        else:
            print("No dataset found. Run: python 1_prepare_dataset.py")
            sys.exit(1)

    print(f"  Train: {len(train_ds):,}  Val: {len(val_ds):,}")

    # ── 4. Tokenise ───────────────────────────────────────────────────────────
    def format_messages(examples):
        texts = []
        for msgs in examples["messages"]:
            text = tokenizer.apply_chat_template(
                msgs, tokenize=False, add_generation_prompt=False,
            )
            texts.append(text)
        return {"text": texts}

    train_ds = train_ds.map(format_messages, batched=True, remove_columns=train_ds.column_names)
    val_ds   = val_ds.map(format_messages,   batched=True, remove_columns=val_ds.column_names)

    # ── 5. Trainer config ─────────────────────────────────────────────────────
    run_name = f"wearly-gemma4-outfit-{datetime.now().strftime('%Y%m%d-%H%M')}"
    out_path = Path(output_dir) / run_name

    sft_config = SFTConfig(
        output_dir                   = str(out_path),
        num_train_epochs             = epochs,
        max_steps                    = max_steps if max_steps > 0 else -1,
        per_device_train_batch_size  = batch_size,
        per_device_eval_batch_size   = batch_size,
        gradient_accumulation_steps  = grad_accum,
        warmup_steps                 = WARMUP_STEPS,
        learning_rate                = LR,
        weight_decay                 = WEIGHT_DECAY,
        lr_scheduler_type            = "cosine",
        optim                        = "adamw_8bit",
        fp16                         = not torch.cuda.is_bf16_supported(),
        bf16                         = torch.cuda.is_bf16_supported(),
        logging_steps                = LOG_STEPS,
        save_steps                   = SAVE_STEPS,
        eval_steps                   = EVAL_STEPS,
        eval_strategy                = "steps",
        save_total_limit             = 3,
        load_best_model_at_end       = True,
        metric_for_best_model        = "eval_loss",
        report_to                    = "none",
        run_name                     = run_name,
        seed                         = SEED,
        dataset_text_field           = "text",
        max_seq_length               = MAX_SEQ_LEN,
        packing                      = True,          # Unsloth sequence packing
    )

    trainer = SFTTrainer(
        model         = model,
        tokenizer     = tokenizer,
        train_dataset = train_ds,
        eval_dataset  = val_ds,
        args          = sft_config,
    )

    # ── 6. Train ──────────────────────────────────────────────────────────────
    print(f"\nStarting training → {out_path}")
    print(f"Task: outfit compatibility scoring (JSON output)")
    print(f"Steps: {max_steps}  |  Effective batch: {batch_size * grad_accum}\n")

    stats = trainer.train()

    # ── 7. Save ───────────────────────────────────────────────────────────────
    final = out_path / "final"
    model.save_pretrained(str(final))
    tokenizer.save_pretrained(str(final))

    print(f"\n✓ Training complete!")
    print(f"  Loss       : {stats.training_loss:.4f}")
    print(f"  Runtime    : {stats.metrics.get('train_runtime', 0):.0f}s")
    print(f"  Samples/sec: {stats.metrics.get('train_samples_per_second', 0):.1f}")
    print(f"  Saved to   : {final}")
    print(f"\nNext step: python 3_export.py --model {final} --ollama")

    return str(final)


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune Gemma 4 outfit compatibility scorer")
    parser.add_argument("--epochs",     type=int,  default=1,         help="Training epochs")
    parser.add_argument("--batch-size", type=int,  default=BATCH_SIZE)
    parser.add_argument("--grad-accum", type=int,  default=GRAD_ACCUM)
    parser.add_argument("--max-steps",  type=int,  default=MAX_STEPS)
    parser.add_argument("--resume",     type=str,  default=None)
    parser.add_argument("--data-dir",   type=str,  default="data")
    parser.add_argument("--output-dir", type=str,  default=OUTPUT_DIR)
    parser.add_argument("--dry-run",    action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        dry_run(args.data_dir)
    else:
        train(
            epochs     = args.epochs,
            batch_size = args.batch_size,
            grad_accum = args.grad_accum,
            max_steps  = args.max_steps,
            resume     = args.resume,
            data_dir   = args.data_dir,
            output_dir = args.output_dir,
        )
