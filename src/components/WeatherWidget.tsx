'use client';

import { WeatherData } from '@/types';
import { Droplets, Wind, Thermometer } from 'lucide-react';
import { WeatherConditionIcon } from '@/components/icons/SgIcons';

interface Props {
  weather: WeatherData;
}

export default function WeatherWidget({ weather }: Props) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            {weather.city} · Today
          </p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-light">{weather.temperature}°</span>
            <WeatherConditionIcon condition={weather.condition} size={24} color={weather.condition === 'rainy' ? '#6b9fd4' : weather.condition === 'cloudy' ? '#94a3b8' : '#f59e0b'} />
          </div>
          <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--muted)' }}>
            {weather.description} · Feels {weather.feels_like}°C
          </p>
        </div>
      </div>

      <div className="flex gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
        <div className="flex items-center gap-1.5">
          <Droplets size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{weather.wind_speed} km/h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Thermometer size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Warm</span>
        </div>
      </div>
    </div>
  );
}
