import { NextResponse } from 'next/server';
import { getUpcomingEvents, getCurrentSeasonContext, getSocialTrends } from '@/lib/singapore-events';

export async function GET() {
  return NextResponse.json({
    upcoming: getUpcomingEvents(4),
    season:   getCurrentSeasonContext(),
    trends:   getSocialTrends(),
  });
}
