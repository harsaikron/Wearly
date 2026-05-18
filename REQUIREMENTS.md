# Wearly — Competition Requirements

**Kaggle Gemma Hackathon — Special Technology Track**

---

## Competition Tracks

### Ollama Prize Track
**Requirement:** The submission must use Gemma running via Ollama as a core part of the application.

**How Wearly qualifies:**
- Every AI feature runs on `gemma4:e4b` via Ollama by default
- Gemma 4 performs garment vision analysis, outfit generation, wardrobe health auditing, trip planning, eco styling, conversational styling, marketplace listing writing, and feature code generation
- No cloud required when Ollama is running — fully air-gapped operation possible
- The Ollama integration is in `src/lib/ai-client.ts` — all 11 AI API routes route through it
- The app exposes `/api/ai-status` which reports the active backend (ollama / groq / none)

### Cactus Prize Track
**Requirement:** Intelligent task routing between models.

**How Wearly qualifies:**
- `detectBackend()` in `src/lib/ai-client.ts` checks Ollama availability with a 1.5s timeout
- If Ollama is reachable and `gemma4:e4b` is loaded → all requests go to Ollama (local, private)
- If Ollama is unavailable and `GROQ_API_KEY` is set → requests route to LLaMA 3.3 70B / LLaMA 4 Scout via Groq (cloud)
- Routing is transparent — feature code calls `aiChat()` or `aiChatWithImage()` without knowing which backend is active
- Three optional fine-tuned modules (`wearly-fashion-v1`, `wearly-outfit-v1`, `wearly-makeup-v1`) are automatically used when present in Ollama, with graceful fallback to the base model

---

## Functional Requirements

### Core AI Requirements
- [x] Gemma 4 (`gemma4:e4b`) via Ollama as primary AI backend
- [x] Automatic fallback to Groq when Ollama unavailable
- [x] Multimodal: image + text inputs for garment analysis
- [x] Structured JSON output from all AI endpoints
- [x] Fine-tuned model support with graceful base-model fallback

### Application Requirements
- [x] Wardrobe management (add, view, edit, delete items)
- [x] AI-powered garment recognition from photo
- [x] Outfit of the Day generation
- [x] Wardrobe health analysis
- [x] Conversational AI stylist
- [x] Marketplace (buy / rent / sell)
- [x] Trip planner with Google Calendar integration
- [x] Sustainable fashion mode
- [x] AI feature evolution with GitHub PR creation

### Accessibility Requirements
- [x] Voice-first interface (Web Speech API)
- [x] Screen reader compatible HTML
- [x] Color Blind Mode
- [x] 44px minimum tap targets (WCAG 2.1 AA)
- [x] No information conveyed by colour alone
- [x] No hover-dependent interactions

### Mobile Requirements
- [x] Responsive layout (mobile-first)
- [x] Android phone / Chrome optimised
- [x] PWA: Add to Home Screen (full-screen)
- [x] Wake Lock (screen stays on when mounted as mirror)
- [x] touch-action: manipulation (eliminates 300ms iOS tap delay)
- [x] Bottom navigation visible and tappable on iOS Chrome

### Privacy Requirements
- [x] No account required
- [x] No analytics or tracking
- [x] Wardrobe data stored in browser localStorage only
- [x] AI prompts stay local when Ollama is running

---

## Non-Functional Requirements

### Performance
- AI response time target: under 3 seconds on Ollama (local), under 5 seconds on Groq (cloud)
- Image compression before upload: max 800px width, 85% JPEG quality
- Backend detection timeout: 1500ms (fast failure, doesn't block UI)
- No continuous animations on mobile (A10 chip GPU budget respected)

### Security
- No hardcoded secrets in source code or vercel.json
- All environment variables documented in `.env.example`
- No user data transmitted without explicit user action

### Compatibility
- Browsers: Chrome 125+ (primary), Safari 17+ (secondary)
- Mobile: iPhone 7+ (iOS 15+), Android 10+
- Desktop: macOS, Windows, Linux
- Node.js: 20+
- Ollama: any version supporting `gemma4:e4b`

---

## License

**CC-BY 4.0** as required by the Kaggle Gemma Hackathon rules.

Free to share, copy, redistribute, adapt, and build upon for any purpose with attribution.

---

## Submission Checklist

- [x] Uses Gemma via Ollama as core AI
- [x] Intelligent model routing (Ollama → Groq)
- [x] Public GitHub repository with CC-BY 4.0 license
- [x] Live demo deployed
- [x] README with setup instructions
- [x] No API keys or secrets committed
- [x] Hardcoded URLs removed from deployment config
- [x] Unused dependencies removed
