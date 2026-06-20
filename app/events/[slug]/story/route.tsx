import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

// GET /events/<slug>/story — a 1080×1920 Instagram-story graphic for an event:
// the event's cover full-bleed, darkened toward the bottom, with the title,
// date/time/city, and TOPIA branding. The share sheet downloads this so users
// can post it to their story with the link sticker.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const rows = await db
    .select({
      eventName: events.eventName,
      date: events.date,
      startTime: events.startTime,
      city: events.city,
      imageUrl: events.imageUrl,
    })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);

  const ev = rows[0];
  if (!ev) return new Response('Not found', { status: 404 });

  const meta = [ev.date, ev.startTime, ev.city].filter(Boolean).join('   ·   ');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: '#0a0a0a' }}>
        {ev.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ev.imageUrl}
            alt=""
            width={1080}
            height={1920}
            style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', objectFit: 'cover' }}
          />
        ) : null}

        {/* Flat darken so the busy cover recedes behind the text. Satori needs
            explicit dimensions here (it ignores the `inset` shorthand). */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', display: 'flex', backgroundColor: 'rgba(0,0,0,0.5)' }} />
        {/* Extra gradient anchoring the brand (top) and title block (bottom) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1080px',
            height: '1920px',
            display: 'flex',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 38%, rgba(0,0,0,0.92) 100%)',
          }}
        />

        {/* Brand */}
        <div style={{ position: 'absolute', top: 72, left: 72, display: 'flex' }}>
          <span style={{ color: '#e4fe52', fontSize: 44, fontWeight: 700, letterSpacing: 6 }}>TOPIA</span>
        </div>

        {/* Bottom block */}
        <div style={{ position: 'absolute', left: 72, right: 72, bottom: 110, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignSelf: 'flex-start', backgroundColor: '#e4fe52', color: '#0a0a0a', padding: '10px 22px', fontSize: 28, fontWeight: 700, letterSpacing: 4, marginBottom: 30 }}>
            EVENT
          </div>
          <div style={{ display: 'flex', color: '#ffffff', fontSize: 92, fontWeight: 800, lineHeight: 1.02 }}>
            {ev.eventName}
          </div>
          {meta ? (
            <div style={{ display: 'flex', color: 'rgba(255,255,255,0.88)', fontSize: 38, marginTop: 30 }}>{meta}</div>
          ) : null}
          <div style={{ display: 'flex', color: '#e4fe52', fontSize: 30, marginTop: 44, letterSpacing: 3 }}>
            OPEN ON TOPIA.VISION
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
