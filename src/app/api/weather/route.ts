import { NextRequest, NextResponse } from 'next/server';

export interface WeatherData {
  temperature: number;
  feels_like: number;
  description: string;
  humidity: number;
  wind_speed: number;
  city: string;
  condition: 'hot' | 'warm' | 'mild' | 'cool' | 'cold' | 'rainy' | 'cloudy';
  uv_index?: number;
  visibility?: number;
}

function classifyCondition(temp: number, desc: string): WeatherData['condition'] {
  const d = desc.toLowerCase();
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower') || d.includes('thunder')) return 'rainy';
  if (d.includes('cloud') || d.includes('overcast') || d.includes('fog') || d.includes('mist')) return 'cloudy';
  if (temp >= 33) return 'hot';
  if (temp >= 28) return 'warm';
  if (temp >= 22) return 'mild';
  if (temp >= 15) return 'cool';
  return 'cold';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') ?? 'Singapore';

  // Try wttr.in first — free, no API key needed
  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { next: { revalidate: 1800 }, signal: AbortSignal.timeout(4000) }
    );

    if (res.ok) {
      const data = await res.json();
      const cur  = data.current_condition?.[0];
      if (cur) {
        const temp  = parseInt(cur.temp_C);
        const desc  = cur.weatherDesc?.[0]?.value ?? 'Clear';
        const weather: WeatherData = {
          temperature: temp,
          feels_like:  parseInt(cur.FeelsLikeC),
          description: desc,
          humidity:    parseInt(cur.humidity),
          wind_speed:  Math.round(parseInt(cur.windspeedKmph)),
          city,
          condition:   classifyCondition(temp, desc),
          uv_index:    parseInt(cur.uvIndex ?? '0'),
          visibility:  parseInt(cur.visibility ?? '10'),
        };
        return NextResponse.json(weather);
      }
    }
  } catch { /* fallthrough to OpenWeather or mock */ }

  // Try OpenWeather if key is set
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
        { next: { revalidate: 1800 } }
      );
      if (res.ok) {
        const d = await res.json();
        const temp = Math.round(d.main.temp);
        const desc = d.weather[0].description;
        const weather: WeatherData = {
          temperature: temp,
          feels_like:  Math.round(d.main.feels_like),
          description: desc,
          humidity:    d.main.humidity,
          wind_speed:  Math.round(d.wind.speed * 3.6),
          city:        d.name,
          condition:   classifyCondition(temp, desc),
        };
        return NextResponse.json(weather);
      }
    } catch { /* fallthrough to mock */ }
  }

  // Singapore climate defaults
  const hour = new Date().getUTCHours() + 8; // SGT = UTC+8
  const isAfternoon = hour >= 12 && hour <= 18;
  const mock: WeatherData = {
    temperature: isAfternoon ? 33 : 29,
    feels_like:  isAfternoon ? 38 : 33,
    description: isAfternoon ? 'Partly cloudy with afternoon showers' : 'Warm and humid',
    humidity:    84,
    wind_speed:  12,
    city,
    condition:   isAfternoon ? 'warm' : 'hot',
    uv_index:    isAfternoon ? 8 : 5,
  };
  return NextResponse.json(mock);
}
