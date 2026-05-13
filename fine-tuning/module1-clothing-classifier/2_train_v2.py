"""
Module 1 v2 — Fine-tune Gemma 4 on world-class fashion knowledge
=================================================================
Improvements over v1:
  • 5,000+ examples (was 2,400) — male + female garments
  • 50+ precise colors (was ~20)
  • Fabric, fit, occasion awareness embedded in training
  • Higher LoRA rank (r=32) for better color discrimination
  • Self-learning examples merged from live uploads
  • Runs 900 steps (was 600) for deeper color understanding

Usage:
  python 2_train_v2.py           # full training
  python 2_train_v2.py --dry-run # 10-step smoke test
"""
import argparse, json, os, subprocess, sys, urllib.request

# ── Config ─────────────────────────────────────────────────────────
BASE_MODEL    = 'unsloth/gemma-4-8b-it'
DATASET_PATH  = './data/train_v2.jsonl'
OUTPUT_DIR    = './checkpoints_v2'
MAX_SEQ_LEN   = 1024
LORA_R        = 32       # higher rank for better color discrimination
LORA_ALPHA    = 64
LORA_DROPOUT  = 0.05
MAX_STEPS     = 900
BATCH_SIZE    = 2
GRAD_ACCUM    = 8        # effective batch 16
LR            = 2e-4
WARMUP_RATIO  = 0.05
SCHEDULER     = 'cosine'

def check_gpu():
    try:
        import torch
        if not torch.cuda.is_available():
            print('⚠️  No GPU detected — training will be very slow on CPU. Use a GPU runtime.')
            return False
        gpu = torch.cuda.get_device_name(0)
        mem = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(f'✓ GPU: {gpu} ({mem:.1f} GB)')
        return True
    except ImportError:
        print('⚠️  PyTorch not installed.')
        return False

def check_dataset():
    if not os.path.exists(DATASET_PATH):
        print(f'⚠️  Dataset not found: {DATASET_PATH}')
        print('   Run: python generate_v2_dataset.py')
        sys.exit(1)
    with open(DATASET_PATH) as f:
        count = sum(1 for line in f if line.strip())
    print(f'✓ Dataset: {count} examples ({DATASET_PATH})')
    return count

def train(dry_run: bool = False):
    print('\n═══════════════════════════════════════')
    print(' Wearly Fashion AI — Module 1 v2 Train')
    print('═══════════════════════════════════════\n')
    check_gpu()
    count = check_dataset()
    steps = 10 if dry_run else MAX_STEPS
    print(f'  Mode: {"DRY-RUN (10 steps)" if dry_run else f"FULL ({steps} steps)"}')
    print(f'  Examples: {count}')
    print(f'  LoRA rank: {LORA_R} (enhanced color discrimination)\n')

    try:
        from unsloth import FastLanguageModel
        from unsloth.chat_templates import get_chat_template
        from trl import SFTTrainer, SFTConfig
        from datasets import Dataset
    except ImportError as e:
        print(f'Missing dependency: {e}')
        print('Install: pip install unsloth trl datasets')
        sys.exit(1)

    # Load base model
    print('Loading base model…')
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=BASE_MODEL,
        max_seq_length=MAX_SEQ_LEN,
        dtype=None,
        load_in_4bit=True,
    )
    tokenizer = get_chat_template(tokenizer, chat_template='gemma-3')

    # Apply LoRA
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        target_modules=['q_proj', 'k_proj', 'v_proj', 'o_proj',
                        'gate_proj', 'up_proj', 'down_proj'],
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        bias='none',
        use_gradient_checkpointing='unsloth',
        random_state=42,
        use_rslora=True,
        loftq_config=None,
    )

    # Load dataset
    rows = []
    with open(DATASET_PATH) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    if dry_run:
        rows = rows[:200]

    def format_row(row):
        text = tokenizer.apply_chat_template(
            row['messages'], tokenize=False, add_generation_prompt=False
        )
        return {'text': text}

    dataset = Dataset.from_list(rows).map(format_row, remove_columns=['messages'])
    print(f'✓ Loaded {len(dataset)} formatted examples')

    # Train
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=SFTConfig(
            output_dir=OUTPUT_DIR,
            dataset_text_field='text',
            max_seq_length=MAX_SEQ_LEN,
            per_device_train_batch_size=BATCH_SIZE,
            gradient_accumulation_steps=GRAD_ACCUM,
            max_steps=steps,
            learning_rate=LR,
            fp16=False,
            bf16=True,
            logging_steps=25,
            save_steps=300,
            warmup_ratio=WARMUP_RATIO,
            lr_scheduler_type=SCHEDULER,
            optim='adamw_8bit',
            packing=True,
            seed=42,
            report_to='none',
        ),
    )

    print(f'\nStarting training ({steps} steps)…')
    trainer.train()

    if not dry_run:
        model.save_pretrained(f'{OUTPUT_DIR}/lora_adapters')
        tokenizer.save_pretrained(f'{OUTPUT_DIR}/lora_adapters')
        print(f'\n✓ LoRA adapters saved → {OUTPUT_DIR}/lora_adapters')
        print('   Next: python 3_export_v2.py')
    else:
        print('\n✓ Dry-run complete — no adapters saved')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    train(dry_run=args.dry_run)
