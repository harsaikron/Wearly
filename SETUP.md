# Setting Up Wearly

This guide gets you from zero to a running Wearly instance in under 10 minutes.

---

## What You Need

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 or later | [nodejs.org](https://nodejs.org) |
| [Ollama](https://ollama.com/download) | Latest | Local AI runtime |
| A terminal | — | Terminal / iTerm / Windows Terminal |

Everything else (Groq API key, GitHub token, etc.) is optional. The app runs fully offline with just Ollama.

---

## Step 1 — Install Ollama and Pull Gemma 4

```bash
# macOS / Linux — install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Windows — download the installer from https://ollama.com/download/windows

# Pull Gemma 4 (one-time, ~5 GB download)
ollama pull gemma4:e4b

# Verify it's working
ollama run gemma4:e4b "Hello"
```

Keep the Ollama process running in the background. It starts automatically on macOS and Windows after installation.

---

## Step 2 — Clone and Install

```bash
git clone https://github.com/harsaikron/Wearly.git
cd Wearly
npm install
```

---

## Step 3 — Configure Environment

```bash
cp .env.example .env.local
```

Open `.env.local`. The only changes you need for local use:

```bash
# Already set — no change needed for local Ollama
OLLAMA_HOST=http://localhost:11434
NEXT_PUBLIC_DEFAULT_CITY=Singapore   # Change to your city if you like
```

Everything else is optional. See the [Optional Integrations](#optional-integrations) section below for Groq, Google Calendar, and GitHub.

---

## Step 4 — Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The green indicator in the top-right shows "Ollama · gemma4:e4b" when Gemma 4 is connected. If it shows "Groq" or "AI offline", see [Troubleshooting](#troubleshooting).

---

## Running on iPhone 7 (Wardrobe Mirror Mode)

Wearly is optimised for an iPhone 7 mounted inside a wardrobe as a smart mirror.

**Install as a PWA (removes browser chrome):**
1. Open Wearly in Google Chrome on your iPhone 7
2. Tap the share icon → **Add to Home Screen**
3. Tap **Add**
4. Open Wearly from the home screen — it now runs full-screen

**Wardrobe mirror setup:**
1. Mount iPhone 7 inside the wardrobe with the front camera facing into the wardrobe
2. Open Wearly → navigate to **Wardrobe** → scroll to the **Mirror** section
3. Tap the large circular button to start the camera
4. The screen stays on automatically (Wake Lock)
5. Hold a garment up to the camera — Wearly identifies it and shows matching suggestions

The app is specifically optimised for Chrome 125 on iPhone 7 (A10 chip): no backdrop-filter effects, solid navigation bar, 64px tap targets, and `touch-action: manipulation` to eliminate iOS 300ms tap delay.

---

## Optional Integrations

### Groq (Cloud AI Fallback)

When Ollama is not running (e.g. deployed on Vercel), Wearly falls back to Groq automatically.

1. Create a free account at [console.groq.com](https://console.groq.com)
2. Create an API key
3. Add to `.env.local`:
   ```bash
   GROQ_API_KEY=gsk_your_key_here
   ```

### Google Calendar (Trip Planner)

The trip planner reads your Google Calendar to detect upcoming travel events.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → enable Google Calendar API
3. Create OAuth 2.0 credentials (Web application)
4. Add your client ID to `.env.local`:
   ```bash
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   ```

### GitHub (Evolve Feature — AI PR Creation)

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate a fine-grained token with **Contents** (Read & Write) and **Pull requests** (Read & Write) permissions on your fork
3. Add to `.env.local`:
   ```bash
   GITHUB_TOKEN=ghp_your_token
   GITHUB_REPO=your_username/Wearly
   ```

### OpenWeather (Live Weather)

Without this, the weather widget uses estimated data based on city averages.

1. Create a free account at [openweathermap.org](https://openweathermap.org)
2. Copy your API key
3. Add to `.env.local`:
   ```bash
   OPENWEATHER_API_KEY=your_key
   ```

---

## Deploying to Vercel

```bash
npx vercel --prod
```

Set these environment variables in Vercel → Project Settings → Environment Variables:

| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Yes (for production) | Cloud AI when Ollama unavailable |
| `GITHUB_TOKEN` | Optional | Evolve PR creation |
| `GITHUB_REPO` | Optional | Target repo for PRs |
| `NEXT_PUBLIC_DEFAULT_CITY` | Optional | Default city for weather |
| `OPENWEATHER_API_KEY` | Optional | Live weather data |

Ollama cannot run in a serverless environment — Groq is the production AI backend.

---

## Troubleshooting

**"AI offline" in the status indicator**
- Make sure Ollama is running: `ollama serve`
- Make sure the model is pulled: `ollama list` should show `gemma4:e4b`
- Check OLLAMA_HOST in `.env.local` matches where Ollama is running

**Camera not working on iPhone 7**
- Wearly requires camera access — tap the big circular button (this is required on iOS for the camera permission to trigger correctly)
- If denied, go to Chrome Settings → Site Settings → Camera → allow Wearly
- The camera will not auto-start — this is intentional (iOS Safari/Chrome requires a user gesture)

**Bottom navigation not visible on iPhone 7**
- Install Wearly as a PWA (Add to Home Screen) — this fixes safe-area inset handling
- Make sure you're using Google Chrome, not Safari

**Buttons not responding on iPhone 7**
- Hard reload the page (pull down in Chrome → release)
- If on Safari, switch to Chrome — the app is optimised for Chrome on iOS

**Build errors**
```bash
npm run build
```
TypeScript errors will be printed. All environment variables are optional at build time — the build should succeed with zero `.env.local` changes.
