# Wearly — Local-First AI Wardrobe Stylist

> **Kaggle Gemma Hackathon Submission** — Special Technology Track  
> 🥇 **Ollama Prize** ($10,000) · 🥇 **Cactus Prize** ($10,000)

Wearly is a **local-first, privacy-preserving AI wardrobe stylist** that runs Gemma 4 entirely on your own machine via [Ollama](https://ollama.com). Your wardrobe photos, outfit history, and personal style data never leave your device. When Ollama is unavailable (e.g. deployed on Vercel), the app intelligently routes requests to Groq cloud as a transparent fallback — demonstrating smart edge-to-cloud model routing.

**Live demo:** https://wearly-dusky.vercel.app  
**Source code:** https://github.com/harsaikron/Wearly

---

## Why Wearly qualifies for the Special Technology Track

| Prize | Qualification |
|---|---|
| **Ollama — $10,000** | Every AI feature (garment vision, outfit generation, wardrobe health, trip planner, eco styling) runs on **Gemma 4 (`gemma4:e4b`) via Ollama** locally. No cloud required when Ollama is running. |
| **Cactus — $10,000** | Wearly is a **local-first mobile-ready progressive web app** with **intelligent task routing between models**: Gemma 4 / Ollama (on-device, private) → LLaMA / Groq (cloud fallback). Routing is automatic and transparent to the user. |

---

## Features

### 🧥 Wardrobe — Closet · Health · Plan

**Closet**
- Photograph or upload any clothing item
- Gemma 4 vision auto-detects: name, category, colour (hex + name), and occasion tags
- Full-text search and category filter across your wardrobe
- Item detail page: wear tracking, carbon footprint, AI style pairings with real product images, mark-worn today/tomorrow, favourite toggle, sell/rent CTAs, personal notes

**Health Score**
- AI-generated closet audit powered by Gemma 4
- Overall score (0–100) with grade (A–F)
- Highlights overused items, unused items (>60 days), duplicate colours, missing essentials
- Lifecycle predictions per item: keep, sell, seasonal peak, donate
- AI-generated outfit combos from existing wardrobe

**Plan**
- Monthly outfit calendar with drag-assign
- Google Calendar OAuth integration — auto-detects upcoming travel events
- **Day-by-day AI trip agenda**: specific place per day, activity type (beach / temple / city / night_market / hiking…), full outfit recommendation, items you already own (highlighted green) vs items to buy or rent, eco tip, shopping links

### ✨ Stylist — AI Stylist · Eco Mode

**Stylist**
- Conversational AI stylist with context from Singapore weather, upcoming cultural events (CNY, Hari Raya, Deepavali, National Day…), and your wardrobe
- Pick occasion and get a complete outfit with colour pairing rationale
- Day-of-week planner with 7-day outfit scheduling

**Eco Mode**
- Generates outfits exclusively from clothes you already own
- Shows CO₂ carbon impact stats (92M tonnes textile waste/year)
- AI weekly re-wear challenge
- Links to Singapore second-hand platforms: Carousell, Refash, Style Theory

### 🛍 Marketplace — Buy · Rent · Mine
- AI-powered listing generator: upload a photo → Gemma 4 writes the title, description, and suggests a fair price
- Browse community listings with distance, condition, and category filters
- Sell or rent out your own items

### ⚡ Evolve — AI Feature Builder
- Describe a new feature in plain English
- Gemma 4 generates the implementation plan and code
- Automatically creates a GitHub Pull Request
- Fully agentic: reads the codebase, writes production code, opens the PR

---

## AI Architecture — Intelligent Edge-to-Cloud Routing

```
User Request
     │
     ▼
 detectBackend()
     │
     ├── Ollama reachable + gemma4:e4b loaded?
     │         YES ──► Gemma 4 via Ollama  ◄── local, private, zero-cost
     │
     ├── GROQ_API_KEY set?
     │         YES ──► LLaMA 3.3 70B via Groq  ◄── cloud fallback
     │
     └── NO ──► Error: AI offline (clear user message)
```

All 9 AI endpoints share a single `aiChat()` / `aiChatWithImage()` client in `src/lib/ai-client.ts`. Feature code never needs to know which backend is active — the router handles it transparently.

### AI API Endpoints

| Route | Gemma 4 task | Input |
|---|---|---|
| `POST /api/analyze-clothing` | Multimodal vision — classify garment | Base64 image |
| `POST /api/ootd` | Text — outfit of the day | Weather + wardrobe |
| `POST /api/stylist` | Text — conversational stylist | Chat history + wardrobe |
| `POST /api/closet-health` | Text — wardrobe audit (JSON) | Full wardrobe metadata |
| `POST /api/ai-listing` | Text — marketplace listing | Item details + condition |
| `POST /api/pair-suggestions` | Text — outfit pairings | Single item + wardrobe |
| `POST /api/trip-planner` | Text — day-by-day trip agenda | Destination + wardrobe |
| `POST /api/sustainable` | Text — eco outfit builder | Occasion + wardrobe |
| `POST /api/evolve` | Code generation + Git | Feature description |
| `GET  /api/health` | Backend detection | — |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI (local)** | Gemma 4 `gemma4:e4b` via [Ollama](https://ollama.com) |
| **AI (cloud fallback)** | LLaMA 3.3 70B / LLaMA 4 Scout via Groq |
| **Framework** | Next.js 15 · App Router · TypeScript |
| **Styling** | Tailwind CSS v4 · CSS custom properties · 14 micro-interaction keyframes |
| **State** | Zustand with `localStorage` persistence (no database required) |
| **Calendar** | Google Identity Services OAuth (read-only scope) |
| **Deployment** | Vercel (production) |

---

## Local Development

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| [Ollama](https://ollama.com/download) | latest | Local AI inference |
| Gemma 4 model | `gemma4:e4b` | The model |

### Quick Start

```bash
# 1. Pull Gemma 4 via Ollama (one-time, ~5 GB download)
ollama pull gemma4:e4b

# 2. Clone the repo
git clone https://github.com/harsaikron/Wearly.git
cd Wearly

# 3. Install dependencies
npm install

# 4. (Optional) configure environment
cp .env.example .env.local
# Edit .env.local with your keys (see table below)

# 5. Run
npm run dev
```

Open http://localhost:3000 — the app auto-detects Ollama and routes all AI requests to Gemma 4 locally.

### Environment Variables

Create `.env.local` in the project root:

```bash
# Cloud fallback (optional) — enables Groq when Ollama is unreachable
GROQ_API_KEY=gsk_...

# Ollama host (optional) — default: http://localhost:11434
OLLAMA_HOST=http://localhost:11434

# Default city for weather (optional)
NEXT_PUBLIC_DEFAULT_CITY=Singapore

# Evolve feature — creates real GitHub PRs (optional)
GITHUB_TOKEN=ghp_...
GITHUB_REPO=harsaikron/Wearly
```

None of these are required to run the app locally with Ollama.

### Vercel Production Deployment

```bash
# Deploy
npx vercel --prod

# Required env vars on Vercel (Ollama not available in serverless):
# GROQ_API_KEY — enables cloud AI for production
# GITHUB_TOKEN — enables Evolve PR creation
```

---

## Project Structure

```
wearly/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Home — weather, OOTD, Singapore events
│   │   ├── wardrobe/
│   │   │   ├── page.tsx                # Closet / Health / Plan (3 tabs)
│   │   │   └── [id]/page.tsx           # Item detail — stats, pairings, carbon
│   │   ├── stylist/page.tsx            # AI Stylist / Eco Mode (2 tabs)
│   │   ├── marketplace/
│   │   │   ├── page.tsx                # Buy / Rent / Mine (3 tabs)
│   │   │   └── [id]/page.tsx           # Listing detail + contact
│   │   ├── evolve/page.tsx             # AI feature builder → GitHub PR
│   │   └── api/
│   │       ├── analyze-clothing/       # Vision: garment classifier
│   │       ├── ootd/                   # Outfit of the day
│   │       ├── stylist/                # Conversational stylist
│   │       ├── closet-health/          # Wardrobe health audit
│   │       ├── ai-listing/             # Marketplace listing generator
│   │       ├── pair-suggestions/       # Per-item outfit pairings
│   │       ├── trip-planner/           # Day-by-day trip agenda
│   │       ├── sustainable/            # Eco outfit builder
│   │       ├── evolve/                 # Feature generator + GitHub PR
│   │       └── health/                 # Backend detection (Ollama / Groq / none)
│   ├── components/
│   │   ├── Navbar.tsx                  # Top nav + mobile bottom tab bar
│   │   ├── Camera.tsx                  # In-browser camera capture
│   │   ├── UploadZone.tsx              # Drag-and-drop image upload
│   │   └── WeatherWidget.tsx           # Real-time weather card
│   ├── lib/
│   │   ├── ai-client.ts                # ⭐ Smart Ollama → Groq router
│   │   ├── singapore-events.ts         # Local events + cultural calendar
│   │   └── image-utils.ts              # Image compression (client-side)
│   ├── store/
│   │   ├── wardrobe.ts                 # Zustand: items, outfits, history
│   │   └── listings.ts                 # Zustand: marketplace listings
│   └── types/index.ts                  # ClothingItem, Outfit, Listing types
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

---

## How Gemma 4 Powers Each Feature

### Garment Vision Analysis
Gemma 4's multimodal capability processes a photo of any clothing item and returns structured JSON:

```typescript
// Single call — identifies category, colour, and occasion tags
const res = await ollama.chat({
  model: 'gemma4:e4b',
  messages: [{ role: 'user', content: prompt, images: [imageBase64] }],
  format: 'json',
  options: { temperature: 0.3 },
});
// Returns: { suggested_name, category, color_hex, color_name, tags }
```

### Wardrobe Health Score
Analyses the full wardrobe (names, categories, colours, wear counts, last-worn dates) and returns a structured audit with score, grade, overused items, unused items, colour duplicates, missing essentials, lifecycle predictions, and outfit combos.

### Day-by-Day Trip Planner
Reads a Google Calendar travel event, then builds a realistic day-by-day itinerary:

```json
{
  "destination": "Bangkok, Thailand",
  "climate": "Hot & humid, 33–36°C",
  "days": [
    {
      "day": 1,
      "title": "Arrival & Street Food Night",
      "place": "Khao San Road, Bangkok",
      "activity_type": "night_market",
      "outfit_name": "Casual Cool",
      "items": ["White T-Shirt", "Dark Chinos", "White Sneakers"],
      "from_wardrobe": ["White T-Shirt", "Dark Chinos"],
      "need_to_buy": ["White Sneakers"],
      "styling_note": "Light layers for the heat — the chinos are smarter than shorts for night markets",
      "eco_tip": "Pack a reusable bag for street market shopping",
      "buy_query": "white sneakers casual lightweight men",
      "can_rent": false
    }
  ],
  "packing_essentials": ["Sunscreen SPF50+", "Compact umbrella", ...]
}
```

### AI Style Pairings
For every wardrobe item, Gemma 4 suggests 4–6 complementary pieces, checking which ones the user already owns and providing shopping links for the rest.

---

## Privacy by Design

| Data | Where it lives | Who sees it |
|---|---|---|
| Wardrobe photos | Browser `localStorage` | You only |
| Item metadata | Browser `localStorage` | You only |
| AI prompts (Ollama mode) | `localhost:11434` | Local process only |
| AI prompts (Groq fallback) | Groq servers | Subject to Groq's privacy policy |
| Wear history | Browser `localStorage` | You only |

No account required. No analytics. No tracking.

---

## Sustainability Mission

Wearly is built around one principle: **the most sustainable garment is the one you already own.**

| Feature | Sustainability impact |
|---|---|
| Wear tracking + 30-wear goal | Reduces per-wear CO₂ cost; 30 wears = ~65% lower carbon vs 5 wears |
| Closet health score | Surfaces unused items before you buy more |
| Eco Mode | Styles complete outfits from existing wardrobe, zero new purchases |
| Marketplace | Extends garment life through peer-to-peer resale and rental |
| Trip Planner | Maximises wardrobe reuse before buying travel-specific clothes |
| Carbon estimates | Visualises real environmental cost per garment category |

---

## Competition Submission Details

| Field | Value |
|---|---|
| Competition | Gemma Hackathon on Kaggle |
| Prize tracks | Ollama ($10,000) · Cactus ($10,000) |
| Model | Gemma 4 (`gemma4:e4b`) via Ollama |
| Framework | Next.js 15, TypeScript, Tailwind CSS v4 |
| License | **CC-BY 4.0** (as required by competition rules) |
| Source code | https://github.com/harsaikron/Wearly |
| Live demo | https://wearly-dusky.vercel.app |

---

## License

This project is licensed under the **Creative Commons Attribution 4.0 International (CC-BY 4.0)** license, as required by the Kaggle competition rules.

You are free to share, copy, redistribute, adapt, and build upon this work for any purpose (including commercial use), provided you give appropriate credit to the original author.

See [LICENSE](./LICENSE) for the full text.

---

*Built for the Kaggle Gemma Hackathon · Submission deadline: May 18, 2026*
