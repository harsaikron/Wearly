import { NextRequest, NextResponse } from 'next/server';
import { WeatherData } from '@/types';

function classifyCondition(temp: number, weatherId: number): WeatherData['condition'] {
  if (weatherId >= 200 && weatherId < 600) return 'rainy';
  if (weatherId >= 600 && weatherId < 700) return 'cold';
  if (weatherId >= 700 && weatherId < 800) return 'cloudy';
  if (weatherId === 800 || weatherId === 801) {
    if (temp >= 35) return 'hot';
    if (temp >= 28) return 'warm';
    if (temp >= 20) return 'mild';
    if (temp >= 12) return 'cool';
    return 'cold';
  }
  if (temp >= 35) return 'hot';
  if (temp >= 28) return 'warm';
  if (temp >= 20) return 'mild';
  if (temp >= 12) return 'cool';
  return 'cold';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') ?? 'Singapore';
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    const mock: WeatherData = {
      temperature: 31,
      feels_like: 36,
      description: 'Humid and sunny',
      humidity: 84,
      wind_speed: 12,
      city,
      icon: '01d',
      condition: 'hot',
    };
    return NextResponse.json(mock);
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 1800 } }
    );

    if (!res.ok) throw new Error(`OpenWeather API error ${res.status}`);
    const data = await res.json();

    const weather: WeatherData = {
      temperature: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed * 3.6),
      city: data.name,
      icon: data.weather[0].icon,
      condition: classifyCondition(data.main.temp, data.weather[0].id),
    };

    return NextResponse.json(weather);
  } catch (err) {
    console.error('Weather fetch failed:', err);
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
}
