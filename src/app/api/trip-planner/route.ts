import { NextRequest, NextResponse } from 'next/server';
import { aiChat, safeParseJSON } from '@/lib/ai-client';

interface WardrobeItem {
  name: string;
  category: string;
  color_name: string;
  tags: string[];
}

export async function POST(req: NextRequest) {
  const { destination, duration_days, wardrobe } = await req.json() as {
    destination: string;
    duration_days: number;
    wardrobe: WardrobeItem[];
  };

  const wardrobeList = wardrobe.length > 0
    ? wardrobe.map((i) => `- ${i.name} (${i.category}, ${i.color_name})`).join('\n')
    : '- No wardrobe items added yet';

  const system = `You are a travel fashion AI powered by Gemma 4.
Create a realistic day-by-day trip agenda with outfit recommendations tailored to the destination, climate, and activities.
Use the user's wardrobe items where possible. For missing items, recommend specific pieces to buy or rent.
Activity types MUST be one of: travel, beach, temple, city, night_market, hiking, fine_dining, water_sports, shopping, resort.
Reply ONLY with valid JSON, no markdown fences.`;

  const userMessage = `Trip details:
Destination: ${destination}
Duration: ${duration_days} day${duration_days > 1 ? 's' : ''}

My wardrobe:
${wardrobeList}

Create a realistic day-by-day itinerary for this trip with a specific outfit for each day based on likely activities at ${destination}.

Reply with JSON (exactly ${Math.min(duration_days, 7)} days):
{
  "destination": "${destination}",
  "climate": "one-line climate note for the destination",
  "days": [
    {
      "day": 1,
      "title": "short day title e.g. Arrival & City Walk",
      "place": "specific place/area being visited e.g. Chatuchak Market, Bangkok",
      "activity_type": "one of: travel|beach|temple|city|night_market|hiking|fine_dining|water_sports|shopping|resort",
      "weather_note": "expected weather e.g. Hot & humid, 33°C",
      "outfit_name": "catchy outfit name",
      "items": ["item 1", "item 2", "item 3"],
      "from_wardrobe": ["item names that match user wardrobe"],
      "need_to_buy": ["items not in wardrobe, suggest what to get"],
      "styling_note": "how to wear this outfit for this specific activity and climate",
      "eco_tip": "short sustainability tip for this day/activity",
      "buy_query": "search query for shopping sites e.g. linen shirt beach resort men",
      "can_rent": true or false (true for special occasion/formal/costume items only),
      "rent_query": "search query if can_rent is true"
    }
  ],
  "packing_essentials": ["item 1", "item 2", "item 3", "item 4", "item 5"]
}`;

  try {
    const { text, backend } = await aiChat(system, userMessage, { temperature: 0.7, maxTokens: 2000 });
    const parsed = safeParseJSON(text);
    return NextResponse.json({ ...(parsed as object), backend });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
