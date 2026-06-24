import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { PATH_CONFIG, resolvePath } from '@/app/components/profile/pathConfig';

export const runtime = 'nodejs';

// GET /api/profile/<username>/card — a 1080×1350 shareable "Topia card" PNG:
// avatar, name, handle, path badge, role tags + TOPIA branding. The profile
// share sheet downloads this so users can post their card to socials.
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const [u] = await db
    .select({
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
      roleTags: users.roleTags,
      path: users.path,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
    .limit(1);

  if (!u) return new Response('Not found', { status: 404 });

  const roleTags = (u.roleTags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const path = resolvePath(u.path, roleTags, false);
  const cfg = PATH_CONFIG[path];
  const accent = cfg.hex;
  const onAccent = path === 'worldbuilder' ? '#0a0a0a' : '#f5f0e8';
  const issued = u.createdAt ? new Date(u.createdAt).getFullYear() : new Date().getFullYear();
  const roleLine = roleTags.slice(0, 4).map((r) => r.replace(/-/g, ' ')).join('   ·   ').toUpperCase();
  const initial = (u.name || u.username || '?')[0]?.toUpperCase() ?? '?';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#0a0a0a', padding: 72 }}>
        {/* path-tinted glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1350px', display: 'flex', background: `radial-gradient(circle at 50% 32%, ${accent}33 0%, rgba(10,10,10,0) 55%)` }} />

        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#f5f0e8', fontSize: 40, fontWeight: 800, letterSpacing: 8 }}>
            TOPIA<span style={{ color: accent }}>.</span>
          </span>
          <span style={{ color: 'rgba(245,240,232,0.4)', fontSize: 22, letterSpacing: 4 }}>TOPIA://IDENTITY</span>
        </div>

        {/* Center identity */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ display: 'flex', width: 300, height: 300, borderRadius: 300, border: `6px solid ${accent}`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#161616' }}>
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatarUrl} alt="" width={300} height={300} style={{ width: 300, height: 300, objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'rgba(245,240,232,0.5)', fontSize: 130, fontWeight: 800 }}>{initial}</span>
            )}
          </div>

          <div style={{ display: 'flex', color: '#f5f0e8', fontSize: 88, fontWeight: 800, marginTop: 48, textAlign: 'center', lineHeight: 1.05 }}>
            {u.name || u.username || 'Unnamed'}
          </div>
          <div style={{ display: 'flex', color: 'rgba(245,240,232,0.55)', fontSize: 36, marginTop: 8 }}>@{u.username}</div>

          <div style={{ display: 'flex', marginTop: 36, backgroundColor: accent, color: onAccent, fontSize: 28, fontWeight: 700, letterSpacing: 6, padding: '12px 28px', borderRadius: 8 }}>
            {cfg.label}
          </div>

          {roleLine ? (
            <div style={{ display: 'flex', color: 'rgba(245,240,232,0.45)', fontSize: 26, letterSpacing: 3, marginTop: 36, textAlign: 'center' }}>
              {roleLine}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(245,240,232,0.4)', fontSize: 24, letterSpacing: 3 }}>
          <span style={{ display: 'flex' }}>ISSUED {issued}</span>
          <span style={{ display: 'flex' }}>TOPIA.VISION</span>
        </div>

        {/* accent bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '1080px', height: 10, display: 'flex', backgroundColor: accent }} />
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
