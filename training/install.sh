#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Wearly AI Training — Local Setup Script
# Run: bash training/install.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Wearly AI Training Environment Setup          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Python check ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 not found. Install from https://python.org"
  exit 1
fi

PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✅  Python $PY_VER found"

# ── Ollama check ──────────────────────────────────────────────────────────────
if command -v ollama &>/dev/null; then
  OLLAMA_VER=$(ollama --version 2>/dev/null | head -1 || echo "unknown")
  echo "✅  Ollama found: $OLLAMA_VER"
else
  echo "⚠️   Ollama not found. Install from https://ollama.com"
  echo "     brew install ollama   (macOS)"
fi

# ── Virtual environment ───────────────────────────────────────────────────────
VENV_DIR="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
  echo ""
  echo "📦  Creating virtual environment at training/.venv …"
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
echo "✅  Virtual environment active"

# ── Install dependencies ──────────────────────────────────────────────────────
echo ""
echo "📥  Installing Python dependencies …"
pip install -q --upgrade pip
pip install -q -r scripts/requirements.txt

echo "✅  All dependencies installed"

# ── Create dataset directories ────────────────────────────────────────────────
mkdir -p datasets

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "✅  Setup complete! Next steps:"
echo ""
echo "  STEP 1 — Download datasets locally (optional, for inspection):"
echo "    source training/.venv/bin/activate"
echo "    python training/scripts/download_datasets.py --datasets all --convert"
echo ""
echo "  STEP 2 — Train on Google Colab (requires GPU):"
echo "    Open one of these notebooks in Colab:"
echo "    • training/notebooks/wearly_fashion_finetune.ipynb   (Module 1)"
echo "    • training/notebooks/wearly_outfit_finetune.ipynb    (Module 2)"
echo "    • training/notebooks/wearly_makeup_finetune.ipynb    (Module 3)"
echo ""
echo "  STEP 3 — After training, download the .gguf file from Colab"
echo "    Then register with Ollama:"
echo ""
echo "    ollama create wearly-fashion-v1 -f training/modelfiles/Modelfile.fashion"
echo "    ollama create wearly-outfit-v1  -f training/modelfiles/Modelfile.outfit"
echo "    ollama create wearly-makeup-v1  -f training/modelfiles/Modelfile.makeup"
echo ""
echo "  STEP 4 — Verify Wearly detects the models:"
echo "    curl -s http://localhost:11434/api/tags | python3 -m json.tool"
echo ""
echo "  Then open /profile in Wearly and hit Refresh in the AI Brain section! 🧠"
echo ""
