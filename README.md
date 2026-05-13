# Wearly — AI-Powered Sustainable Fashion Stylist

> **Gemma 4 Good Hackathon Submission** · Track: Global Resilience + Digital Equity

**Wearly** uses Gemma 4 to help people dress well while consuming less — reducing fast-fashion waste through intelligent wardrobe reuse, multicultural dress education, and privacy-first local AI.

---

## The Problem

- Fashion produces **~10% of global CO₂ emissions** — more than aviation and shipping combined
- The average person wears only **20% of their wardrobe** regularly
- Singapore's multicultural calendar (12 major festivals/year) drives high **impulse clothing purchases**
- AI styling tools are expensive, cloud-dependent, and inaccessible to many

## The Solution

Wearly puts **Gemma 4 on your device** to:

1. **Mindful Wardrobe** — AI generates outfits from clothes you already own, with carbon savings estimates
2. **Cultural Dress Education** — Teaches appropriate attire for 12 Singapore festivals (CNY, Hari Raya, Deepavali, etc.) to reduce occasion-driven impulse buying
3. **Second-Hand First** — Recommends Carousell SG, Refash, and Style Theory before fast-fashion retailers
4. **Weather-Aware Styling** — Reduces "wrong outfit" purchases by accounting for Singapore's tropical weather

---

## How Gemma 4 is Used

| Feature | Gemma 4 Capability |
|---|---|
| Wardrobe analysis | Multimodal vision — identifies clothing items from photos |
| Outfit generation | Text reasoning — creates cohesive outfits from wardrobe inventory |
| Sustainable styling | Instruction following — prioritizes re-wear over new purchases |
| Cultural guidance | Knowledge — explains multicultural dress traditions with context |
| Evolve / feature requests | Code generation — users can request app features via chat |

**Model:** `gemma4:e4b` via Ollama (local inference)
**Fallback:** Groq cloud (llama-3.3-70b) for demo environments without Ollama

---

## Social Good Impact

### Global Resilience Track
- Each re-worn outfit saves ~2–5 kg CO₂ vs. buying new
- Educates users on the true environmental cost of fast fashion
- Promotes circular fashion: second-hand marketplaces integrated directly

### Digital Equity Track
- Runs **entirely on-device** via Ollama — no subscription, no cloud cost
- Works on any laptop with 8GB RAM — accessible to everyone
- Privacy-first: no user data leaves the device

### Education Track
- Documents dress traditions for Singapore's 6 ethnic communities
- Teaches colors, fabrics, and cultural significance for every major festival
- Helps new residents and tourists dress respectfully and appropriately

---

## Features

### Home — Season & Events Dashboard
- Live Singapore cultural event calendar (2026 public holidays + festivals)
- Current season fashion trends
- Weather-aware outfit tips (wttr.in API)
- Trending outfit inspiration photos (Pexels API)

### Wardrobe — AI Clothing Catalog
- Photo upload or camera capture
- Gemma 4 vision analyzes each item: category, color, occasion tags
- Filter and search your full wardrobe
- Track times worn (to surface forgotten items)

### Stylist — AI Personal Stylist
- Pick day (Mon–Sun), occasion, and upcoming festival
- Gemma 4 creates a complete outfit from your wardrobe
- Shopping deep-links: Carousell → Zalora → Shopee (second-hand first)
- Live outfit recommendations with cultural context

### Sustain — Mindful Wardrobe (AI for Good)
- AI generates 2–3 complete outfits from existing wardrobe items
- Carbon saved estimate (kg CO₂) per outfit vs. buying new
- Wardrobe sustainability score + weekly re-wear challenge
- Second-hand marketplace links (Carousell SG, Refash, Style Theory)

### Evolve — AI Feature Builder
- Users submit feature requests or feedback via chat
- Gemma 4 generates implementation plan + creates GitHub PR
- Fully agentic: reads codebase, writes code, opens PR

---

## Tech Stack

- **AI:** Gemma 4 (`gemma4:e4b`) via Ollama · Groq fallback
- **Framework:** Next.js 16 (App Router) · TypeScript · Tailwind CSS
- **Storage:** Zustand + localStorage (no database required for demo)
- **APIs:** wttr.in (weather) · Pexels (photos) · GitHub REST API (Evolve)
- **Icons:** Custom SVG components + Lucide React (no emoji)

---

## Setup & Run

### Prerequisites
- Node.js 18+
- [Ollama](https://ollama.com) installed

### Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/wearly.git
cd wearly

# 2. Install dependencies
npm install

# 3. Pull Gemma 4
ollama pull gemma4:e4b

# 4. Start Ollama
ollama serve

# 5. Start Wearly
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional Environment Variables

```bash
# .env.local
GROQ_API_KEY=your_groq_key          # Cloud fallback when Ollama unavailable
PEXELS_API_KEY=your_pexels_key      # Outfit inspiration photos
GITHUB_TOKEN=your_github_token      # Evolve -> creates real PRs
```

Without any env vars, Wearly runs fully offline with Gemma 4 via Ollama.

---

## Demo Flow

1. **Add clothes** to Wardrobe (upload photo → Gemma 4 analyzes it)
2. **Go to Sustain** → select occasion → click "Style from what I own"
3. **See AI outfits** built from your existing wardrobe with carbon savings
4. **Go to Stylist** → pick Saturday, Date Night, Valentine's Day
5. **Get a complete outfit** with cultural context and shopping links
6. **Go to Home** → see upcoming Singapore events and trending styles

---

## Judging Criteria Alignment

| Criterion | Wearly |
|---|---|
| **Vision** | Clear mission: AI for sustainable fashion in multicultural Singapore |
| **Technical Execution** | Gemma 4 multimodal (vision + text), local inference, full-stack Next.js app |
| **Impact** | Reduces fashion waste, educates on cultural traditions, second-hand first |
| **Reproducibility** | 4-step setup, runs on any laptop with Ollama, MIT licensed |

---

## License

MIT — open source, fork and adapt freely.

---

*Built for the [Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon) · Submission deadline: May 18, 2026*
