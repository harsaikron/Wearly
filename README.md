# Wearly — AI Wardrobe Stylist

> **Kaggle Gemma Hackathon Submission** — Special Technology Track  
> Ollama Prize Track · Cactus Prize Track

Wearly is a **local-first, privacy-preserving AI wardrobe stylist** that runs Gemma 4 entirely on your own machine via [Ollama](https://ollama.com). Your wardrobe photos, outfit history, and personal style data never leave your device. When Ollama is unavailable (e.g. deployed to Vercel), the app intelligently routes requests to Groq cloud as a transparent fallback — demonstrating smart edge-to-cloud model routing.

**Live demo:** https://wearly-dusky.vercel.app  
**Source code:** https://github.com/harsaikron/Wearly

---

## What Wearly Does — Ideal Scenarios

Wearly is designed around the real moments where fashion decisions happen. Here are the core flows:

### Morning — Outfit of the Day
You wake up, open Wearly on your phone. The app checks live weather, local events, and your calendar — then Gemma 4 picks the perfect outfit from your own wardrobe. A voice announcement reads it aloud so you can get ready hands-free. No decisions to make. No scrolling. Just get dressed.

### Getting Dressed — Smart Mirror
Your Android phone is mounted inside your wardrobe (small, front-facing camera, always on). You tap Mirror. The camera activates immediately, Gemma 4 analyses what you're wearing, and the screen shows matching bottoms and accessories — instantly. The screen stays on automatically via Wake Lock so you never have to touch it mid-outfit.

### Adding a New Item — Smart Camera Detection
You photograph a new jacket. Gemma 4 recognises it — category, colour, occasion tags — and asks via voice: *"I spotted a navy blazer. This doesn't seem to be in your wardrobe yet. Would you like me to add it?"* Tap yes, it's catalogued. Done in seconds.

### Planning a Trip — AI Travel Stylist
You have a Bangkok trip in Google Calendar. Wearly reads it and builds a day-by-day outfit plan: specific places, activity types, complete outfits from your existing wardrobe — with green highlights for what you already own and suggestions for what to buy or rent for what you don't.

### Building Good Habits — Wardrobe Health
You haven't worn your camel coat in 70 days. Wearly notices. The Health tab gives your wardrobe a score, surfaces unused items, flags duplicate colours, and suggests outfit combos using clothes you've been ignoring. It's a nudge to wear more of what you already have.

### Selling — Marketplace Listing
You want to sell that blazer. Upload a photo, and Gemma 4 writes the listing title, description, and pricing suggestion for you. One tap to list it in the community marketplace.

### Building the App Itself — AI Evolution
Describe a feature in plain English. Gemma 4 reads the codebase, writes the implementation, and opens a GitHub Pull Request. This is how Wearly improves itself.

---

## How Smart Is Gemma 4 at Fashion?

Gemma 4 (`gemma4:e4b`) runs all AI inference locally. Here's what the model understands:

**Garment Recognition**
- Identifies 50+ clothing categories: blazers, kurtas, saris, palazzo trousers, cheongsams, abayas, and more — including culturally specific garments
- Returns structured output: category, colour (hex + descriptive name), occasion tags, and a suggested product name
- Works from photos taken in poor lighting, cluttered backgrounds, or from partial angles

**Colour and Styling Intelligence**
- Understands colour theory: complementary, analogous, monochromatic pairings
- Knows that navy + white = nautical chic, terracotta + sage = earthy warmth, blush + burgundy = romantic contrast
- Adjusts for skin tone (warm/cool/neutral undertones) and occasion formality

**Local and Cultural Context**
- Built-in knowledge of Singapore's climate (tropical, 28–34°C year-round)
- Aware of key cultural occasions: Hari Raya (baju kurung, baju melayu), CNY (qipao, mandarin collar), Deepavali (saree, kurta), National Day (red/white palette)
- Understands dress codes: business formal, smart casual, resort wear, streetwear, athleisure

**Sustainability Reasoning**
- Knows typical garment lifespans by category and material
- Estimates CO₂ impact per item type
- Can tell you that a polyester T-shirt worn 5 times has a higher per-wear carbon cost than a linen shirt worn 40 times

**Outfit Compatibility Scoring**
- Rates outfit combinations on colour harmony, formality consistency, seasonal appropriateness, and occasion fit
- Explains the reasoning in plain English: *"The chunky sole sneakers clash with the slim trousers — try a low-profile white trainer instead"*

**Fine-Tuned Specialisation (when available)**
The system supports three optional fine-tuned modules on top of the base Gemma 4 model:
- `wearly-fashion-v1` — clothing vision classifier (higher accuracy on category + colour naming)
- `wearly-outfit-v1` — outfit compatibility scorer
- `wearly-makeup-v1` — beauty and grooming advisor (trained on YouMakeup + FFHQ datasets)

When these fine-tuned models are present in Ollama, they are used automatically. If not, the base `gemma4:e4b` handles all tasks.

---

## Accessibility — Designed for Everyone

Wearly is built to be usable regardless of visual ability, motor dexterity, or tech comfort.

### Voice-First Interface
Every key action in Wearly speaks aloud:
- Morning OOTD announcement: *"Good morning! Today's outfit is the Coastal Casual. You'll be wearing a white linen shirt, navy chinos, and tan loafers. The light fabric keeps you cool in today's 31°C heat."*
- Camera detection prompt: *"I spotted a caramel trench coat. This doesn't seem to be in your wardrobe yet. Would you like me to add it?"*
- All voice output uses the Web Speech API — no third-party service, no internet required, works offline

### Blind-Friendly and Low-Vision
- All clothing items are stored with full descriptive metadata: colour name (not just hex), material, occasion tags
- AI responses are written in conversational language, not visual jargon — *"warm earthy terracotta"* not *"#C57B57"*
- Screen reader compatible: semantic HTML, proper ARIA labels, no information conveyed by colour alone
- Color Blind Mode: toggle in the profile page to switch to a high-contrast, colour-safe palette

### Android — Accessibility Hardware
The app is specifically optimised for Android devices running Google Chrome. This matters because many accessibility users rely on affordable, widely available devices:
- No backdrop-filter effects (GPU-safe across mid-range Android hardware)
- Solid-colour navigation bar (always visible, no transparency tricks)
- 64px minimum tap targets (exceeds WCAG 2.1 AA 44×44px requirement)
- `touch-action: manipulation` globally (eliminates tap delay on Android Chrome)
- Wake Lock API keeps the screen on when the phone is mounted as a wardrobe mirror

### Physical and Motor Accessibility
- Large circular "Start Mirror" button (160px diameter) for easy one-finger tap when phone is mounted
- All critical actions reachable with one hand from the bottom navigation
- PWA installed to home screen removes all browser chrome — pure full-screen app
- No hover-dependent interactions — everything works by tap

### Language and Literacy
- Voice output rate is slightly slowed (0.93×) for easier comprehension
- AI responses use plain English — no fashion jargon without explanation
- Category labels use both text and icons throughout

---

## Features

### Home — Daily Intelligence
- Live weather widget with animated icons
- Outfit of the Day: AI-generated outfit based on weather, calendar, and wardrobe
- Voice playback button — hear your outfit described aloud
- Singapore cultural events calendar

### Wardrobe — Closet · Health · Plan

**Closet**
- Add items by photo or upload — Gemma 4 auto-detects name, category, colour, and occasion tags
- Smart camera detection — voice prompt when a new item is spotted that isn't in your wardrobe
- Full-text search and category filters
- Item detail: wear tracking, carbon footprint, AI style pairings, mark-worn, favourite, sell/rent CTA

**Health**
- Wardrobe score (0–100) with grade (A–F)
- Flags unused items (>60 days), overused items, colour duplicates, missing essentials
- Lifecycle predictions: keep, sell, donate, seasonal peak
- AI outfit combos from existing wardrobe only

**Plan**
- Monthly outfit calendar
- Google Calendar OAuth — detects upcoming travel events
- Day-by-day AI trip agenda with per-day places, activities, and outfit recommendations
- Green highlight: items you already own vs items to buy/rent

### Smart Mirror
- Designed for an Android phone mounted inside a wardrobe
- Camera activates on tap (browser user-gesture requirement)
- Gemma 4 identifies what you're holding — top, bottom, accessory, shoes
- Suggests matching bottoms and accessories instantly
- Wake Lock keeps screen on automatically

### Stylist — AI Stylist · Eco Mode

**Stylist**
- Conversational AI with context from weather, events, and your wardrobe
- Pick occasion → complete outfit with colour rationale
- 7-day outfit planner

**Eco Mode**
- Outfits exclusively from what you already own
- CO₂ stats and weekly re-wear challenges
- Links to Singapore resale: Carousell, Refash, Style Theory

### Marketplace — Buy · Rent · Mine
- AI-generated listing from a photo: title, description, fair price suggestion
- Community listings with category and condition filters
- Sell or rent your own items

### Evolve — AI Feature Builder
- Describe a feature in plain English
- Gemma 4 reads the codebase and writes the implementation
- Automatically opens a GitHub Pull Request

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
     └── NO ──► Clear error message to user
```

All AI endpoints share a single `aiChat()` / `aiChatWithImage()` client in `src/lib/ai-client.ts`. Feature code never needs to know which backend is active.

### AI API Endpoints

| Route | Task | Input |
|---|---|---|
| `POST /api/analyze-clothing` | Vision — classify garment | Base64 image |
| `POST /api/ootd` | Outfit of the day | Weather + wardrobe |
| `POST /api/stylist` | Conversational stylist | Chat history + wardrobe |
| `POST /api/closet-health` | Wardrobe audit | Full wardrobe metadata |
| `POST /api/ai-listing` | Marketplace listing writer | Item details + condition |
| `POST /api/pair-suggestions` | Outfit pairings per item | Single item + wardrobe |
| `POST /api/trip-planner` | Day-by-day trip agenda | Destination + wardrobe |
| `POST /api/sustainable` | Eco outfit builder | Occasion + wardrobe |
| `POST /api/mirror-voice` | Smart mirror analysis | Base64 image |
| `POST /api/evolve` | Code generation + GitHub PR | Feature description |
| `GET  /api/ai-status` | Backend detection | — |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI (local)** | Gemma 4 `gemma4:e4b` via [Ollama](https://ollama.com) |
| **AI (cloud fallback)** | LLaMA 3.3 70B / LLaMA 4 Scout via Groq |
| **Framework** | Next.js 15 · App Router · TypeScript |
| **Styling** | Tailwind CSS v4 · CSS custom properties |
| **State** | Zustand with `localStorage` persistence (no database required) |
| **Voice** | Web Speech API — offline, no third-party |
| **Calendar** | Google Identity Services OAuth (read-only) |
| **PWA** | Web App Manifest + apple-mobile-web-app-capable |
| **Deployment** | Vercel |

---

## Privacy by Design

| Data | Where it lives | Who sees it |
|---|---|---|
| Wardrobe photos | Browser `localStorage` | You only |
| Item metadata | Browser `localStorage` | You only |
| AI prompts (Ollama mode) | `localhost:11434` | Local process only |
| AI prompts (Groq fallback) | Groq servers | Subject to Groq's privacy policy |
| Wear history | Browser `localStorage` | You only |

No account required. No analytics. No tracking. No cookies.

---

## Sustainability Mission

Wearly is built around one principle: **the most sustainable garment is the one you already own.**

| Feature | Sustainability impact |
|---|---|
| Wear tracking + 30-wear goal | Reduces per-wear CO₂; 30 wears = ~65% lower carbon vs 5 wears |
| Closet health score | Surfaces unused items before you buy more |
| Eco Mode | Complete outfits from existing wardrobe only — zero new purchases |
| Marketplace | Extends garment life through peer-to-peer resale and rental |
| Trip Planner | Maximises wardrobe reuse before buying travel-specific clothes |
| Carbon estimates | Visualises real environmental cost per garment category |

---

## Competition Submission Details

| Field | Value |
|---|---|
| Competition | Gemma Hackathon on Kaggle |
| Prize tracks | Ollama · Cactus |
| Model | Gemma 4 (`gemma4:e4b`) via Ollama |
| Framework | Next.js 15, TypeScript, Tailwind CSS v4 |
| License | **CC-BY 4.0** (as required by competition rules) |
| Source code | https://github.com/harsaikron/Wearly |
| Live demo | https://wearly-dusky.vercel.app |

---

## License

Licensed under **Creative Commons Attribution 4.0 International (CC-BY 4.0)** as required by the Kaggle competition rules.

See [LICENSE](./LICENSE) for the full text.

---

*Built for the Kaggle Gemma Hackathon · Submission deadline: May 18, 2026*
