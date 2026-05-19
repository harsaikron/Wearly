# Wearly — Private AI Wardrobe Stylist Powered by Gemma 4

**Kaggle Gemma Hackathon Submission Writeup**

*Author: Harsai | GitHub: https://github.com/harsaikron/Wearly | Live: https://wearly-dusky.vercel.app*

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Gemma 4 Integration — The Core Intelligence](#3-gemma-4-integration)
4. [Key Features Deep Dive](#4-key-features-deep-dive)
5. [Technical Architecture](#5-technical-architecture)
6. [Fashion Knowledge Base](#6-fashion-knowledge-base)
7. [Android App — Native TWA](#7-android-app)
8. [Privacy & Sustainability Design](#8-privacy--sustainability-design)
9. [Challenges & Solutions](#9-challenges--solutions)
10. [Results & Demo](#10-results--demo)
11. [What's Next](#11-whats-next)

---

## 1. Problem Statement

**Most people wear only 20% of their wardrobe.**

Not because they lack clothes — because they can't see what they own, can't match what they have, and can't remember what they've worn. The average person spends 17 minutes every morning deciding what to wear, often defaulting to the same familiar 20% while the other 80% hangs untouched.

Existing solutions fail in three ways:

| Problem | Existing Apps | Wearly |
|---|---|---|
| Privacy | Upload photos to cloud servers | All data stays on device |
| Intelligence | Basic tagging, no vision AI | Gemma 4 multimodal analysis |
| Cost | Subscription models ($5–20/month) | Free, runs on your hardware |
| Cultural awareness | Western-centric only | 20+ global garment types |
| Platform | Web only | Web + Native Android APK |

Wearly solves all five gaps with a single local-first AI application powered entirely by Gemma 4.

---

## 2. Solution Overview

Wearly is a **local-first AI wardrobe assistant** that uses Gemma 4 as its central intelligence engine for:

- **Computer vision** — photographing and identifying garments with 5-step structured analysis
- **Outfit generation** — creating complete outfits from your actual wardrobe
- **Natural language styling** — conversational AI stylist with deep fashion knowledge
- **Self-modification** — writing and deploying new features from plain English descriptions
- **Voice interaction** — speaking results aloud with on-device Web Speech API

The system runs entirely on your own machine via Ollama (zero data leaves your device) with a transparent cloud fallback to Groq when Ollama isn't running.

### Why Gemma 4 Specifically

Gemma 4 (`gemma4:e4b` via Ollama) was chosen because:
- **Multimodal by default** — vision + language in a single model call
- **Efficient enough to run locally** — no GPU cluster required, works on a MacBook
- **Strong instruction following** — reliably produces structured JSON output from fashion prompts
- **Open weights** — aligns with Wearly's privacy-first philosophy

---

## 3. Gemma 4 Integration

### 3.1 Unified AI Client

All Gemma 4 calls go through a single abstraction layer in `src/lib/ai.ts`:

```typescript
// Transparent backend selection — feature code never knows which is active
async function detectBackend(): Promise<'ollama' | 'groq' | null> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    if (res.ok) return 'ollama';
  } catch {}
  if (process.env.GROQ_API_KEY) return 'groq';
  return null;
}

export async function aiChat(messages, options) {
  const backend = await detectBackend();
  if (backend === 'ollama') return ollamaChat(messages, options);
  if (backend === 'groq')   return groqChat(messages, options);
  throw new Error('No AI backend available');
}
```

### 3.2 Vision Analysis — 5-Step Fashion Intelligence

The centerpiece of Wearly is its Gemma 4 vision pipeline. When a user photographs a garment, the model runs a structured 5-step reasoning chain before producing output:

**Step 1 — Identify the item**
Isolate the garment from background, identify the primary category (shirt, trouser, dress, jacket, traditional wear, etc.)

**Step 2 — Detect the pattern**
Classify: solid, plaid, stripes, check, floral, graphic, houndstooth, tie-dye, brocade, batik, paisley, abstract, windowpane, or plain.

**Step 3 — Recognise the material**
Identify fabric from visual cues: flannel (brushed matte, soft texture), denim (diagonal twill weave, indigo), silk (high sheen, fluid drape), velvet (pile texture, depth shadows), linen (visible weave, slight wrinkle), boucle (loopy texture), chiffon (sheer, floaty), leather (smooth uniform surface).

**Step 4 — Analyse colour precisely**
Use 60+ named colour shades. Critical rule: for plaid/stripes, the background field colour wins — not the grid lines. For solid garments, distinguish navy vs midnight blue vs royal blue vs cobalt vs steel blue.

**Step 5 — Construct the name**
Formula: `[Color] [Pattern] [Material] [Category]`
Examples: "Dark Green Plaid Flannel Shirt", "Ivory Silk Midi Dress", "Slate Blue Linen Trousers"

**Output JSON structure:**
```json
{
  "name": "Dark Green Plaid Flannel Shirt",
  "category": "Top",
  "color_name": "Forest Green",
  "color_hex": "#2D5A27",
  "secondary_color": "Cream",
  "pattern": "plaid",
  "material": "flannel",
  "tags": ["casual", "layering", "autumn", "office-smart-casual"],
  "occasions": ["casual", "smart-casual", "weekend"],
  "season": ["autumn", "winter"],
  "care": "Machine wash cold, tumble dry low"
}
```

### 3.3 Eleven AI Endpoints

Wearly deploys Gemma 4 across 11 specialised API routes:

| Endpoint | Function | Gemma 4 Role |
|---|---|---|
| `/api/analyze-clothing` | Vision analysis | Multimodal image + text |
| `/api/chat` | Stylist conversation | Multi-turn dialogue |
| `/api/outfit` | Outfit generation | JSON outfit builder |
| `/api/sustainability` | Eco scoring | Analysis + recommendations |
| `/api/trip-planner` | Packing list | Context-aware planning |
| `/api/marketplace` | Listing generation | Copywriting |
| `/api/wardrobe-health` | Wardrobe audit | Data analysis |
| `/api/color-analysis` | Seasonal colour type | Personal analysis |
| `/api/smart-mirror` | Real-time mirror | Vision + wardrobe matching |
| `/api/feature-writer` | Self-modification | Code generation |
| `/api/style-advice` | Personalised tips | Contextual styling |

### 3.4 Smart Mirror — Real-Time Gemma Vision

The Smart Mirror feature is the most technically innovative Gemma 4 use case in Wearly. Users mount their Android phone inside their wardrobe door, open the Mirror, and Gemma 4 watches via the camera in real time.

When you hold up a garment, Gemma 4:
1. Identifies the item without requiring a photo tap
2. Searches your `localStorage` wardrobe for matching complementary pieces
3. Builds a complete outfit suggestion (top + bottom + shoes + accessories)
4. Optionally speaks the suggestion aloud: *"Try this with your Navy Slim Chinos and White Leather Sneakers"*
5. Detects if the item isn't in your wardrobe: *"I see a navy blazer that's not catalogued yet — add it?"*

Wake Lock API keeps the screen on so you never need to touch the phone while dressing.

### 3.5 Self-Evolving Code Generation

The most experimental Gemma 4 feature: describe a feature in plain English, and Gemma 4 writes it.

The system:
1. Reads the entire codebase structure and key files into context
2. Sends the user's feature description to Gemma 4
3. Gemma 4 produces a complete implementation (component + API route + types)
4. The app creates a GitHub Pull Request via the GitHub API
5. Vercel's GitHub integration auto-deploys
6. Wearly shows a live animated pipeline: `Received → Building → Deployed`

The app literally ships new features to itself using Gemma 4 as the developer.

---

## 4. Key Features Deep Dive

### 4.1 Wardrobe Catalogue

The core catalogue stores every garment as a structured object with all vision-extracted fields plus user metadata (wear count, last worn date, purchase price, estimated CO₂). The UI supports:

- Grid and list views with filtering by category, colour, pattern, occasion, season
- Bulk operations (select multiple → tag, archive, delete)
- Search by natural language ("show me everything that works for a job interview")
- Wear tracking (tap to mark as worn today)

### 4.2 Outfit Builder

Three modes of outfit generation:

**AI-Generated** — Gemma 4 reads your entire wardrobe JSON and constructs complete outfits applying colour theory (60/30/10 rule), occasion appropriateness, seasonal logic, and personal style profile.

**Smart Mirror** — real-time camera-based suggestions as you hold items up.

**Manual** — drag-and-drop outfit builder with AI validation (Gemma 4 rates the combination and suggests improvements).

### 4.3 Voice-First Interaction

Every meaningful action in Wearly speaks aloud using the Web Speech API — entirely on-device, no third-party TTS service.

Technical challenge solved: Desktop browsers (Chrome, Firefox, Safari) require a user gesture before `speechSynthesis` will fire. For deferred AI responses (which arrive asynchronously after the user has tapped), the standard approach fails.

**Wearly's two-phase unlock system:**

```typescript
// Phase 1: On mount, register capture-phase listeners
// (capture-phase fires before React's synthetic events)
document.addEventListener('click',       unlock, { capture: true });
document.addEventListener('keydown',     unlock, { capture: true });
document.addEventListener('touchstart',  unlock, { capture: true });
document.addEventListener('pointerdown', unlock, { capture: true });

// On first interaction, fire a zero-volume silent utterance
// This unlocks the Web Speech API for the entire browser session
function unlock() {
  const silent = new SpeechSynthesisUtterance('​'); // zero-width space
  silent.volume = 0;
  window.speechSynthesis.speak(silent);
  _unlocked = true;
  // Flush any queued speech that arrived before unlock
  if (_pending) setTimeout(() => _doSpeak(_pending.text, _pending.rate), 80);
}

// Phase 2: speak() queues if called before unlock, plays immediately after
export function speak(text: string, rate = 0.93) {
  if (!_unlocked) { _pending = { text, rate }; return; }
  _doSpeak(text, rate);
}
```

Voice selection prefers warm natural voices: Samantha, Karen, Victoria → en-SG → en-GB → en-AU → en-US.

### 4.4 Trip Planner

Input: destination, trip duration, activities (beach, business meetings, hiking, formal dinner). Gemma 4 reads your actual wardrobe and generates a packing list using only items you already own, applying:

- Weather-appropriate filtering
- Activity-based outfit count calculation
- Mix-and-match maximisation (fewer items, more combinations)
- Capsule wardrobe principles

### 4.5 Sustainability Tracker

Per-garment sustainability scoring:
- **Cost-per-wear** = purchase price ÷ wear count
- **CO₂ estimate** by fabric type (synthetic = higher, natural = lower)
- **Idle detection** — flags items not worn in 60+ days
- **Wardrobe score** (0–100) combining diversity, wear distribution, and eco metrics
- **Circular economy** — generates marketplace listings for items to sell/donate

### 4.6 Wardrobe Health Dashboard

Gemma 4 analyses your full wardrobe JSON and produces:
- Gap analysis ("You have 14 tops but only 3 bottoms — invest in trousers")
- Colour palette summary with dominant hues
- Occasion coverage gaps ("No formal wear detected")
- Redundancy detection ("7 white t-shirts — consider editing")
- Trend alignment (based on current fashion knowledge)

---

## 5. Technical Architecture

### 5.1 Stack

```
┌─────────────────────────────────────────────────────┐
│                   Client Browser                    │
│  Next.js 15 App Router · TypeScript · Tailwind v4  │
│  Zustand state · localStorage wardrobe data         │
│  Web Speech API · Camera API · Wake Lock API        │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / API Routes
┌─────────────────────▼───────────────────────────────┐
│              Next.js API Layer (Vercel)              │
│  11 AI endpoints · GitHub API · Image processing    │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
┌──────────▼──────────┐  ┌────────────▼──────────────┐
│   Ollama (local)    │  │      Groq Cloud API        │
│   Gemma 4 e4b       │  │   LLaMA 4 Scout fallback   │
│   Private · Free    │  │   When Ollama unavailable  │
└─────────────────────┘  └───────────────────────────┘
```

### 5.2 Data Architecture

All wardrobe data is stored in `localStorage` as structured JSON — no database, no backend, no account required.

```typescript
interface WardrobeItem {
  id: string;
  name: string;              // "Dark Green Plaid Flannel Shirt"
  category: ClothingCategory;
  color_name: string;
  color_hex: string;         // "#2D5A27"
  secondary_color?: string;
  pattern: PatternType;
  material: string;
  tags: string[];
  occasions: OccasionType[];
  season: Season[];
  wearCount: number;
  lastWorn?: string;         // ISO date
  purchasePrice?: number;
  co2Estimate?: number;      // kg CO₂e
  imageUrl?: string;         // base64 or object URL
  createdAt: string;
}
```

This design means Wearly works fully offline once the Next.js app is loaded. No internet connection required for wardrobe browsing, outfit building, or most features — only AI calls need connectivity.

### 5.3 AI Backend Detection

```typescript
// Called on every AI request — < 2 second timeout
async function detectBackend() {
  try {
    const r = await fetch('http://localhost:11434/api/tags',
      { signal: AbortSignal.timeout(2000) });
    if (r.ok) return 'ollama'; // Gemma 4 local
  } catch {}
  if (process.env.GROQ_API_KEY) return 'groq'; // Cloud fallback
  return null;
}
```

The UI shows a live backend status indicator so users always know whether their AI calls are private (Ollama) or cloud (Groq).

### 5.4 Component Architecture

```
src/
├── app/
│   ├── page.tsx              # Home — wardrobe grid + About card
│   ├── camera/               # Gemma 4 vision capture
│   ├── outfits/              # AI outfit builder
│   ├── mirror/               # Smart mirror (real-time Gemma vision)
│   ├── sustainability/       # Eco tracking dashboard
│   ├── trips/                # Trip packing planner
│   ├── chat/                 # AI stylist conversation
│   ├── health/               # Wardrobe health audit
│   └── api/                  # 11 Gemma 4 API routes
├── components/
│   ├── Navbar.tsx            # Bottom nav (mobile) / side nav (desktop)
│   ├── AudioInit.tsx         # Web Speech API unlock on mount
│   ├── ColorBlindProvider.tsx # Accessibility: 3 colour modes
│   └── SmartMirror.tsx       # Camera + Gemma real-time analysis
└── lib/
    ├── ai.ts                 # Unified Gemma 4 / Groq client
    ├── speak.ts              # Two-phase voice unlock system
    ├── fashion-knowledge.ts  # 150-line global fashion knowledge base
    └── store.ts              # Zustand wardrobe store
```

---

## 6. Fashion Knowledge Base

One of the most significant investments in Wearly is a carefully curated fashion knowledge base (`fashion-knowledge.ts`) injected into every Gemma 4 system prompt.

### 6.1 Global Garment Taxonomy

**Western Garments**
Tops: t-shirt, dress shirt, blouse, polo, henley, turtleneck, tank top, camisole
Bottoms: chinos, trousers, jeans, shorts, skirt (mini/midi/maxi), culottes
Outerwear: blazer, suit jacket, sport coat, overcoat, trench coat, puffer, denim jacket, leather jacket, cardigan, hoodie, windbreaker
Dresses: shift, wrap, A-line, bodycon, slip, shirt dress, maxi, midi, sundress
Footwear: oxford, derby, loafer, Chelsea boot, sneaker, sandal, pump, mule, ankle boot, knee boot

**Southeast Asian & South Asian Garments**
- **Baju Kurung** (Malaysia/Singapore) — long blouse + skirt ensemble; fitted or A-line; worn for Hari Raya, formal occasions
- **Baju Melayu** (Malay men) — loose shirt + trousers + sampin sarong; paired with songkok; formal traditional
- **Kebaya** (SEA women) — fitted lace/embroidered blouse; worn with batik or songket sarong
- **Batik** — hand-stamped or printed fabric with wax-resist patterns; classified by motif origin
- **Cheongsam / Qipao** (Chinese) — form-fitting one-piece with mandarin collar; silk or brocade; worn for CNY
- **Saree** (South Asian) — 5–9 yards draped fabric; silk, chiffon, georgette, cotton; worn with blouse + petticoat
- **Salwar Kameez / Kurta** (South Asian) — long tunic with trousers; cotton to silk; casual to formal
- **Ao Dai** (Vietnamese) — fitted silk tunic split at sides over wide trousers
- **Barong Tagalog** (Filipino) — sheer embroidered formal shirt; piña or jusi fabric
- **Abaya** (Gulf/Southeast Asian Muslims) — floor-length robe; plain or embroidered; often over Western clothes
- **Hanbok** (Korean) — jeogori jacket + chima skirt or baji trousers; worn for Chuseok, weddings
- **Yukata** (Japanese) — casual summer kimono; cotton; worn for festivals

### 6.2 Colour Disambiguation Rules

The knowledge base explicitly resolves common vision AI colour confusion:

| Colour Family | Named Variants in Wearly |
|---|---|
| Blue | Navy, Midnight Blue, Royal Blue, Cobalt, Steel Blue, Sky Blue, Baby Blue, Powder Blue, Denim Blue, Slate Blue, Cerulean, Indigo |
| Green | Forest Green, Olive, Sage, Mint, Emerald, Hunter Green, Moss, Lime, Chartreuse, Teal, Seafoam |
| Red | Crimson, Burgundy, Wine, Maroon, Scarlet, Tomato Red, Brick Red, Rust, Coral |
| Neutral | Off-White, Ivory, Cream, Ecru, Beige, Sand, Taupe, Mushroom, Greige, Stone, Warm Grey, Cool Grey, Charcoal, Slate |

### 6.3 Occasion-to-Garment Mapping

```
Business Formal:    Suit / Blazer + Dress Trousers + Oxford Shoes + Tie
Business Smart:     Blazer + Chinos + Button Shirt + Loafers (tie optional)
Smart Casual:       Polo / Henley + Chinos / Dark Jeans + Leather Sneakers
Casual:             T-shirt + Jeans / Shorts + Sneakers / Loafers
Black Tie:          Tuxedo / Evening Gown
Hari Raya:          Baju Melayu / Baju Kurung + Songkok + Sampin
Chinese New Year:   Cheongsam / Tang Suit (red or gold preferred)
Deepavali:          Saree / Kurta (jewel tones, gold accents)
Beach:              Swimwear + Cover-up + Sandals
Gym:                Performance fabric top + Shorts/Leggings + Athletic Shoes
```

### 6.4 Fabric Visual Cue Rules

Gemma 4 is guided to identify fabric from photographic texture alone:
- **Flannel** — brushed matte surface, slight nap, no sheen, warm colour depth
- **Denim** — diagonal twill weave visible, slight fading characteristic, indigo tones
- **Silk** — high specular highlight, fluid drape, smooth uniform surface
- **Velvet** — pile creates directional shadow, rich colour depth
- **Linen** — visible warp/weft texture, slight natural wrinkling
- **Boucle** — loopy or knobbly surface texture, irregular loops
- **Chiffon** — semi-transparent, floaty, smooth but sheer
- **Leather / Faux Leather** — uniform smooth surface, slight sheen, clean edges

---

## 7. Android App

### 7.1 Technology: Trusted Web Activity (TWA)

Rather than rebuilding Wearly in Kotlin/Java, the Android app uses Google's TWA technology — a native Android shell that loads the Vercel-hosted PWA full-screen, with:

- Native launcher icon and app name
- No browser chrome (no URL bar, no browser controls)
- Full access to Android APIs: camera, microphone, speech synthesis
- System-level integration (appears in Recent Apps, handles back gesture)
- Identical functionality to the web version

### 7.2 Build Process

Built programmatically using `@bubblewrap/core` Node.js API (not the CLI, which has a Node 26 incompatibility):

```javascript
// build.mjs — key excerpt
const manifest = new TwaManifest({
  packageId: 'com.wearly.app',
  host: 'wearly-dusky.vercel.app',
  name: 'Wearly AI',
  launcherName: 'Wearly',
  themeColor: '#2C4A1E',
  backgroundColor: '#080f06',
  startUrl: '/',
  signingKey: { path: './android.keystore', alias: 'wearly' },
  appVersionName: '1.0.0',
  appVersionCode: 1,
  minSdkVersion: 21,  // Android 5.0+
});

const gradleWrapper = new GradleWrapper(process, androidSdkTools);
await gradleWrapper.assembleRelease();
await androidSdkTools.apksigner(keystore, keystorePass, alias, keyPass, aligned, signed);
```

**Build environment:**
- Java 17 (OpenJDK via Homebrew)
- Android SDK cmdline-tools r12.0
- Gradle 8.x (auto-downloaded by wrapper)
- apksigner from build-tools/35.0.0

### 7.3 APK Details

| Property | Value |
|---|---|
| Package ID | `com.wearly.app` |
| Version | 1.0.0 (code: 1) |
| Size | 1.9 MB (signed) |
| Min Android | 5.0 (API 21) |
| Target Android | 14 (API 34) |
| Architecture | Universal (all ABIs) |
| Signing | RSA 2048, SHA-256 |

### 7.4 Installation

1. Enable "Install from Unknown Sources" in Android Settings → Security
2. Copy `Wearly-v1.0.apk` to the device
3. Tap the file → Install
4. Wearly appears on home screen with native icon

All features work identically to the web version: camera analysis, voice, Smart Mirror, offline wardrobe browsing.

---

## 8. Privacy & Sustainability Design

### 8.1 Privacy-First Architecture

Wearly was designed from the ground up to be privacy-preserving:

- **No account required** — the app works without signing up for anything
- **No database** — all wardrobe data lives in browser `localStorage`
- **No telemetry** — no analytics, no tracking, no usage data collected
- **Local AI default** — when Ollama is running, zero data leaves the device
- **Images stay local** — garment photos are stored as base64 in localStorage, never uploaded
- **Transparent fallback** — the UI explicitly shows whether Ollama or Groq is active

This is unusual in the AI app space. Most wardrobe AI apps upload your photos to their servers for analysis. Wearly inverts this: Gemma 4 comes to your data, not the other way around.

### 8.2 Sustainability Mission

Fashion is the second most polluting industry in the world. Wearly's sustainability features are not superficial — they're core to the product's purpose:

**Wear Count Tracking** — every time you mark a garment as worn, the cost-per-wear updates in real time. Seeing "£45 jacket worn 90 times = £0.50 per wear" changes buying behaviour.

**CO₂ Estimation** — approximate lifecycle carbon per garment category:
- Synthetic fast-fashion top: ~15 kg CO₂e
- Natural fibre quality piece: ~5–8 kg CO₂e
- Pre-owned garment: ~1–2 kg CO₂e (displaced production)

**60-Day Idle Detection** — Gemma 4 identifies items not worn in 60 days and asks: donate, sell, or re-discover?

**Circular Economy** — one-click generation of marketplace listings (title, description, condition, suggested price) for items to sell on Carousell, eBay, or Depop.

**Wardrobe Score** — a 0–100 holistic score combining:
- Wear distribution (are you using what you own?)
- Category balance (tops vs bottoms vs outerwear)
- Colour versatility (do pieces work together?)
- Eco profile (natural fibres, pre-owned ratio, cost-per-wear average)

---

## 9. Challenges & Solutions

### Challenge 1: bubblewrap CLI + Node 26 Incompatibility

**Problem:** The `bubblewrap` CLI uses `readline` and `inquirer` for interactive prompts, which crash in non-TTY environments (CI, scripted builds) under Node 26 due to breaking changes in readline's stream handling.

**Solution:** Bypassed the CLI entirely and used `@bubblewrap/core` programmatic API directly — importing `TwaManifest`, `TwaGenerator`, `GradleWrapper`, `AndroidSdkTools` as Node modules and orchestrating the build in `build.mjs`.

### Challenge 2: JAVA_HOME Resolution on macOS

**Problem:** Homebrew's OpenJDK 17 installs to `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk` but the standard macOS `JAVA_HOME` lookup uses `Contents/Home` sub-path which didn't exist.

**Solution:** Hardcoded the correct absolute path after manual filesystem inspection: `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk` passed directly to `Config` constructor, bypassing the broken auto-detection.

### Challenge 3: Android SDK Path Validation

**Problem:** `AndroidSdkTools.validatePath()` expected `tools/` or `bin/` subdirectories at the SDK root, but the downloaded cmdline-tools unzip creates a nested structure.

**Solution:** Created a symlink: `$ANDROID_SDK/tools → $ANDROID_SDK/cmdline-tools/latest/bin`, satisfying the validator while keeping the correct SDK structure for Gradle.

### Challenge 4: Build-Tools Version Mismatch

**Problem:** bubblewrap's internal `zipalign` wrapper hardcoded `build-tools/34.0.0` but Gradle auto-downloaded `35.0.0`.

**Solution:** Bypassed bubblewrap's zipalign wrapper and called the `build-tools/35.0.0/zipalign` binary directly via `execSync`, then used `apksigner` from the same version.

### Challenge 5: Web Speech API Desktop Unlock

**Problem:** Desktop browsers require a synchronous user gesture in the call stack before `speechSynthesis.speak()` is allowed. AI responses arrive asynchronously (after fetch), so they fail the gesture requirement even if the user tapped a button to trigger the fetch.

**Solution:** Two-phase unlock system (see §4.3). The key insight: a zero-volume silent utterance fired during the first user gesture unlocks the API for the entire browser session. Subsequent `speak()` calls work even from async callbacks.

### Challenge 6: Colour Precision in Vision Analysis

**Problem:** Early Gemma 4 prompts returned vague colours ("blue shirt", "green jacket") that made wardrobe filtering useless.

**Solution:** Added explicit colour disambiguation rules to the system prompt — 60+ named shades with definitions, specific rules for pattern/field-colour priority (plaid background dominates grid lines), and the name formula `[Color] [Pattern] [Material] [Category]`. Analysis quality improved dramatically.

---

## 10. Results & Demo

### 10.1 Live Application

- **Web:** https://wearly-dusky.vercel.app
- **Android APK:** `Wearly-v1.0.apk` (1.9 MB, included in submission files)
- **Source:** https://github.com/harsaikron/Wearly

### 10.2 Feature Coverage

| Feature | Status | AI Backend |
|---|---|---|
| Gemma 4 garment vision | Live | Gemma 4 multimodal |
| Outfit generation | Live | Gemma 4 text |
| AI Stylist chat | Live | Gemma 4 text |
| Smart Mirror | Live | Gemma 4 multimodal |
| Voice interaction | Live | Web Speech API (on-device) |
| Sustainability tracking | Live | Rule-based + Gemma 4 |
| Trip packing planner | Live | Gemma 4 text |
| Wardrobe health audit | Live | Gemma 4 text |
| Colour analysis (personal) | Live | Gemma 4 text |
| Self-evolving features | Live | Gemma 4 code generation |
| Native Android APK | Live | TWA + Gemma 4 |
| Cultural garment support | Live | Knowledge base + Gemma 4 |
| Colour blind modes | Live | CSS custom properties |
| Marketplace listing gen | Live | Gemma 4 text |

### 10.3 Technical Metrics

| Metric | Value |
|---|---|
| AI model | Gemma 4 (`gemma4:e4b`) |
| Vision analysis time | ~3–8 seconds (Ollama, M-series Mac) |
| APK size | 1.9 MB |
| Wardrobe items (demo data) | 30 items across 6 categories |
| Fashion knowledge base | ~150 lines, 20+ garment types, 60+ colour names |
| API routes | 11 Gemma 4 endpoints |
| Supported Android | API 21+ (Android 5.0, 2014+) |
| localStorage per item | ~2–5 KB (without image); ~50–200 KB (with base64 image) |

---

## 11. What's Next

### Short-term (1–3 months)
- **Gemma 4 fine-tuning** — fine-tune on fashion-specific image datasets for improved colour and material accuracy
- **Outfit history** — track which outfits were worn on which days; use Gemma 4 to find rotation patterns
- **Body proportion analysis** — Gemma 4 suggests cuts and silhouettes based on uploaded measurements
- **Shopping integration** — when Gemma 4 identifies a wardrobe gap, surface real shopping recommendations

### Medium-term (3–6 months)
- **Multi-user wardrobe sharing** — couples, families, or friends share items (with privacy controls)
- **Offline Gemma 4** — bundle a quantized Gemma 4 model in the Android app using MediaPipe for fully offline analysis
- **Seasonal rotation reminders** — proactive Gemma 4 suggestions as seasons change
- **Poshmark/Depop API integration** — one-tap listing to resale platforms

### Long-term Vision
- **Personal style graph** — Gemma 4 builds a semantic understanding of personal style preferences over time
- **AR try-on** — overlay outfit suggestions on camera feed using WebXR
- **Community wardrobe** — privacy-preserving style sharing where Gemma 4 generates outfit ideas inspired by community data without exposing individual wardrobes

---

## Closing Note

Wearly demonstrates that a genuinely useful, privacy-respecting consumer AI product can be built and shipped end-to-end using open models — no proprietary APIs, no data harvesting, no subscriptions required.

Gemma 4 is not just a component in Wearly — it is the product. Its vision capabilities make cataloguing effortless, its language capabilities make styling conversational, and its code generation capabilities make the product self-improving. Without Gemma 4, Wearly is a spreadsheet. With it, it's a personal stylist.

---

*Wearly — AI Wardrobe Stylist | Built for the Kaggle Gemma Hackathon 2025*
*https://wearly-dusky.vercel.app | https://github.com/harsaikron/Wearly*
