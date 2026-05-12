import { NextRequest, NextResponse } from 'next/server';

export interface InspirationImage {
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  credit_url: string;
  source: 'pexels' | 'pixabay';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? 'men outfit casual';

  // ── Try Pexels (free API key at pexels.com/api) ──
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=3&orientation=portrait&size=medium`,
        { headers: { Authorization: pexelsKey }, next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json() as {
          photos: { src: { medium: string; small: string }; alt: string; photographer: string; url: string }[];
        };
        const images: InspirationImage[] = data.photos.map((p) => ({
          url:        p.src.medium,
          thumb:      p.src.small,
          alt:        p.alt || q,
          credit:     p.photographer,
          credit_url: p.url,
          source:     'pexels',
        }));
        if (images.length > 0) return NextResponse.json({ images, provider: 'pexels' });
      }
    } catch { /* fall through */ }
  }

  // ── Try Pixabay (free API key at pixabay.com/api/docs) ──
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const res = await fetch(
        `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(q)}&image_type=photo&orientation=vertical&category=fashion&per_page=3&safesearch=true`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json() as {
          hits: { webformatURL: string; previewURL: string; tags: string; pageURL: string; user: string }[];
        };
        const images: InspirationImage[] = data.hits.map((h) => ({
          url:        h.webformatURL,
          thumb:      h.previewURL,
          alt:        h.tags,
          credit:     h.user,
          credit_url: h.pageURL,
          source:     'pixabay',
        }));
        if (images.length > 0) return NextResponse.json({ images, provider: 'pixabay' });
      }
    } catch { /* fall through */ }
  }

  // ── No API key: return empty so client shows color palette ──
  return NextResponse.json({ images: [], provider: 'none' });
}
