/**
 * POST /api/analyze-clothing
 *
 * World-class fashion AI with precise color detection.
 * Model priority (auto-detected):
 *  1. wearly-fashion-v1  — Unsloth fine-tuned Gemma 4 (highest accuracy)
 *  2. gemma4:e4b          — base Gemma 4 via Ollama
 *  3. llama-4-scout       — Groq vision cloud fallback
 *
 * After successful analysis → appends training example for self-learning.
 */
import { NextRequest, NextResponse } from 'next/server';
import { aiChatWithImage, safeParseJSON, detectFashionModel } from '@/lib/ai-client';
import { FASHION_KNOWLEDGE_COMPACT } from '@/lib/fashion-knowledge';

const SYSTEM = `You are Wearly's world-class fashion AI, expert in global fashion, color theory, and garment classification.

════════════════════════════════════════════════════
⚠️  CRITICAL: PRECISE COLOR DETECTION (95%+ accuracy)
════════════════════════════════════════════════════

STEP-BY-STEP COLOR ANALYSIS — execute this EVERY time:
  Step 1 — HUE: Does this garment have ANY color tint? Red? Orange? Yellow? Green? Blue? Purple? Pink?
  Step 2 — SATURATION: Is the color vivid/bright, muted/washed, or completely neutral (grey/white/black)?
  Step 3 — LIGHTNESS: Is it light (>70% brightness), medium (30-70%), or dark (<30%)?
  Step 4 — NAME IT: Use the table below for exact naming and hex.

ACCURATE COLOR REFERENCE TABLE:
  ┌─────────────────────────────────────────────────────────────┐
  │ WHITES & NEUTRALS                                           │
  │  Pure White        #FFFFFF   (zero tint — bright white)     │
  │  Off-White/Cream   #F5F0E6   (warm yellow undertone)        │
  │  Ivory             #FFFFF0   (very slight yellow)           │
  │  Pearl             #F0EEE8   (cool white with grey)        │
  │                                                             │
  │ GREYS (completely neutral — NO color hue)                   │
  │  Light Grey        #D0D0D0   (pale neutral grey)            │
  │  Medium Grey       #9A9A9A   (mid neutral grey)             │
  │  Charcoal Grey     #4A4A4A   (dark neutral grey)            │
  │  Graphite          #555555   (dark grey, near black)        │
  │                                                             │
  │ GREENS (ANY green tint → use these, never "grey/white")     │
  │  Mint Green        #A8D8B0   (light, fresh, cool green)     │
  │  Sage Green        #8FAF80   (muted, silvery green)         │
  │  Lime Green        #C4E06A   (bright yellow-green)          │
  │  Olive Green       #6B7C3A   (dark, earthy yellow-green)    │
  │  Khaki             #B8A878   (sandy light olive)            │
  │  Forest Green      #2C5530   (deep dark green)              │
  │  Emerald           #1A7A4A   (vivid mid green)              │
  │  Teal              #2A8C8C   (blue-green)                   │
  │  Army Green        #4A5C3A   (muted military green)         │
  │                                                             │
  │ BLUES                                                       │
  │  Powder Blue       #B0CCE4   (very light blue)              │
  │  Sky Blue          #87CEEB   (clear medium blue)            │
  │  Royal Blue        #2859C5   (vivid medium blue)            │
  │  Navy Blue         #1E2D5A   (dark blue, almost black)      │
  │  Slate Blue        #6A7FA8   (muted blue-grey)              │
  │  Cobalt Blue       #1A4DC8   (bright deep blue)             │
  │  Indigo            #3730A3   (blue-purple)                  │
  │  Denim Blue        #4A7AB5   (washed jeans blue)            │
  │                                                             │
  │ BROWNS & EARTHY                                             │
  │  Beige/Sand        #D4B896   (warm light tan)               │
  │  Camel/Tan         #C19A6B   (medium warm brown)            │
  │  Rust/Terracotta   #B05C3A   (red-orange brown)             │
  │  Chocolate Brown   #5C3318   (dark warm brown)              │
  │  Mocha             #7A5C48   (medium brown)                 │
  │  Cognac            #A0522D   (warm reddish-brown)           │
  │                                                             │
  │ REDS & PINKS                                                │
  │  Blush Pink        #F5C6D0   (very light pink)              │
  │  Rose Pink         #E88598   (medium pink)                  │
  │  Hot Pink/Fuchsia  #D4238A   (vivid pink)                   │
  │  Coral             #E8634A   (orange-red)                   │
  │  Red               #CC2222   (true red)                     │
  │  Burgundy/Wine     #7B1C2A   (dark red-purple)              │
  │  Maroon            #6B1515   (very dark red)                │
  │                                                             │
  │ YELLOWS & ORANGES                                           │
  │  Cream/Butter      #F5E8B0   (very light yellow)            │
  │  Yellow            #F5C800   (vivid yellow)                 │
  │  Mustard           #C8A020   (muted yellow-gold)            │
  │  Orange            #E87830   (vivid orange)                 │
  │  Peach             #F5C8A8   (light orange-pink)            │
  │                                                             │
  │ PURPLES                                                     │
  │  Lavender          #C8B8E0   (very light purple)            │
  │  Mauve             #C48DAA   (muted pink-purple)            │
  │  Purple            #7C3AED   (vivid purple)                 │
  │  Plum              #5B215B   (dark purple)                  │
  │                                                             │
  │ BLACKS                                                      │
  │  Black             #1A1A1A   (true black)                   │
  │  Near-Black        #222222   (very dark, slight tint)       │
  └─────────────────────────────────────────────────────────────┘

MOST COMMON MISTAKES (DO NOT MAKE THESE):
  ❌ Light green → "Grey" or "White"      ✅ "Sage Green" (#8FAF80) or "Mint Green"
  ❌ Off-white → "White"                  ✅ "Cream" or "Off-White" (#F5F0E6)
  ❌ Olive → "Green" or "Dark Yellow"     ✅ "Olive Green" (#6B7C3A)
  ❌ Khaki → "Beige" or "Light Brown"     ✅ "Khaki" (#B8A878)
  ❌ Denim → "Blue" (too vague)           ✅ "Denim Blue" (#4A7AB5)
  ❌ Charcoal → "Black"                   ✅ "Charcoal Grey" (#4A4A4A)
  ❌ Camel → "Beige" or "Tan"            ✅ "Camel" (#C19A6B)
  ❌ Navy → "Dark Blue" or "Black"        ✅ "Navy Blue" (#1E2D5A)

════════════════════════════════════════════════════
FASHION EXPERTISE — CATEGORY GUIDE
════════════════════════════════════════════════════
  shirt          = woven button-up shirts (Oxford, linen, flannel)
  formal_shirt   = dress shirts, French cuff, for business/formal
  tshirt         = crew-neck, V-neck, polo, graphic tees, Henleys
  pants          = chinos, trousers, joggers, tailored pants
  jeans          = denim jeans of any cut
  shorts         = any shorts (chino, basketball, swim, athletic)
  shoes          = leather shoes, dress shoes, loafers, boots
  sneakers       = athletic, casual, fashion sneakers
  loafers        = slip-on loafers, moccasins
  jacket         = all outerwear (blazer, bomber, denim jacket, windbreaker, hoodie)
  watch          = timepieces, smartwatches
  belt           = waist belts
  chain          = chains, necklaces, pendant chains
  bracelet       = bracelets, bangles, cuffs
  earring        = earrings, ear studs, ear cuffs
  sunglasses     = sunglasses, shades, tinted eyewear
  ring           = rings, finger rings, thumb rings
  bag            = bags, tote bags, backpacks, clutches, crossbody bags
  accessory      = other accessories (scarves, hats, ties, socks, pocket squares)
  skincare       = skincare products (moisturiser, sunscreen, serum, toner, cleanser)
  fragrance      = perfume, cologne, eau de toilette, body mist
  grooming       = grooming products (hair gel, face wash, shaving cream, deodorant)

════════════════════════════════════════════════════
OCCASION TAGGING — tag with ALL that apply
════════════════════════════════════════════════════
  office         = structured, professional, work-appropriate
  casual         = everyday relaxed wear
  date_night     = stylish, evening-suitable
  weekend        = relaxed daytime
  smart_casual   = elevated casual, no tie needed
  minimal        = clean lines, monochrome, understated
  luxury         = premium brands, fine materials
  travel         = comfortable, versatile, wrinkle-resistant
  festive        = celebrations, parties, events
  gym            = athletic, performance, activewear

Reply ONLY with valid JSON — no markdown fences, no extra text.`;

const SYSTEM_FULL = SYSTEM + '\n\n' + FASHION_KNOWLEDGE_COMPACT;

const PROMPT = `Analyze this garment or product with expert precision. Follow ALL steps below.

════ STEP 1 — IDENTIFY WHAT YOU SEE ════
Look at the garment/item being worn or held. Ignore the background, skin, and accessories unless they ARE the item.

════ STEP 2 — PATTERN DETECTION ════
Identify the pattern exactly:
  solid       = single flat color, no pattern
  plaid       = criss-cross grid of multiple colors (flannel, tartan, check)
  stripes     = horizontal, vertical, or diagonal lines
  check       = small regular squares (gingham, windowpane)
  floral      = flower or botanical print
  graphic     = text, logo, or graphic artwork
  animal      = animal print (leopard, zebra, snake)
  geometric   = triangles, diamonds, abstract shapes
  textured    = ribbed, cable-knit, quilted (no distinct print)

For PLAID / CHECK / STRIPES → the dominant color is the BACKGROUND color that covers most area — not the lines.

════ STEP 3 — FABRIC/MATERIAL HINTS ════
Identify from visual texture:
  flannel = soft brushed woven, often plaid, matte surface
  denim   = diagonal twill weave, structured, indigo-range
  linen   = visible weave texture, slightly wrinkled
  cotton  = smooth woven, versatile
  leather = shiny or matte thick material
  wool    = textured knit or woven, heavier
  silk    = highly reflective, smooth, drapes softly
  knit    = ribbed or looped structure (sweaters, polos)
  synthetic = polyester, nylon — smooth and uniform sheen

════ STEP 4 — COLOR ANALYSIS (multi-color rule) ════
For solid items: use 4-step color analysis (hue → saturation → lightness → name).
For patterned items (plaid, stripes, check, floral):
  - color_hex and color_name = the DOMINANT background color (largest area)
  - secondary_color = second most visible color if significantly present

════ STEP 5 — BUILD THE NAME ════
Format: "[Color] [Pattern] [Material] [Category]"
Examples:
  Solid shirt      → "Navy Blue Slim Fit Oxford Shirt"
  Plaid flannel    → "Dark Green Plaid Flannel Shirt"
  Stripe tee       → "White and Navy Stripe Cotton Tee"
  Graphic tee      → "Black Graphic Print Tee"
  Plain sneakers   → "White Low-Top Canvas Sneakers"
  Chain necklace   → "Silver Box Chain Necklace"

Return ONLY valid JSON — no markdown, no extra text:
{
  "suggested_name": "descriptive name including color + pattern + material + category",
  "category": "one exact category from the guide",
  "color_hex": "dominant color hex from reference table",
  "color_name": "dominant color name from reference table",
  "secondary_color": "second color name if pattern has one — omit for solid",
  "pattern": "solid|plaid|stripes|check|floral|graphic|animal|geometric|textured",
  "material": "flannel|denim|linen|cotton|leather|wool|silk|knit|synthetic|unknown",
  "tags": ["all applicable occasion tags — [] for grooming/skincare"],
  "grooming_type": "ONLY for skincare/fragrance/grooming: sunscreen|moisturiser|serum|toner|cleanser|lip_balm|eye_cream|eau_de_parfum|eau_de_toilette|cologne|body_mist|hair_gel|face_wash|shaving|deodorant|body_lotion",
  "spf": "ONLY for sunscreen: SPF number as integer"
}`;

export async function POST(request: NextRequest) {
  try {
    const { image_base64 } = await request.json() as { image_base64: string };

    if (!image_base64 || image_base64.length < 100) {
      return NextResponse.json({ error: 'Invalid or missing image_base64' }, { status: 400 });
    }

    const isFinetuned = await detectFashionModel();
    const { text, backend } = await aiChatWithImage(SYSTEM_FULL, PROMPT, image_base64);
    const parsed = safeParseJSON(text) as Record<string, unknown>;

    // ── Self-learning: fire-and-forget to accumulate training data ──
    if (parsed && parsed.category && parsed.color_name) {
      fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clothing_analysis',
          input: 'Analyze this clothing item.',
          output: parsed,
          backend,
        }),
      }).catch(() => { /* non-blocking */ });
    }

    return NextResponse.json({
      ...parsed,
      _backend: backend,
      _model: isFinetuned ? 'wearly-fashion-v1 (fine-tuned)' : 'gemma4:e4b (base)',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    console.error('[analyze-clothing]', msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
