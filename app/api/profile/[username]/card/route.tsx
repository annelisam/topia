import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { users, worldMembers, worlds } from '@/lib/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { PATH_CONFIG, resolvePath } from '@/app/components/profile/pathConfig';

export const runtime = 'nodejs';

// The brand star mark (public/brand/logo.svg), as an inline element we can recolor.
const LOGO_PATH =
  'M248.244 0L249.567 0.534218C253.772 5.33588 268.237 51.6617 271.697 60.619C284.721 62.5024 301.944 69.6949 312.074 78.5385C334.862 70.9857 439.759 43.3727 459.298 46.3637C461.484 46.6985 462.317 47.3396 463.571 49.0776C465.702 60.2407 418.051 96.8812 407.934 104.568C398.897 111.44 364.575 134.502 361.352 143.426C360.265 146.449 361.346 149.374 363.035 151.895C367.19 158.093 376.047 165.05 381.599 170.415C393.226 181.651 464.838 248.37 466.894 253.53C467.503 255.059 467.372 255.385 466.745 256.79C464.751 257.837 462.31 257.453 460.273 256.646C447.845 251.725 434.926 245.672 422.753 240.223L344.023 204.894C333.831 200.33 316.223 191.852 306.099 189.27C293.771 205.447 277.044 216.059 259.418 225.553C262.722 206.006 266.939 198.44 280.616 183.724C253.176 201.589 251.517 218.376 246.822 248.511L240.052 290.743C239.381 294.816 238.307 307.771 233.965 308.234C229.102 305.491 216.287 266.833 213.231 258.28C211.027 251.366 208.603 244.524 205.962 237.765C190.337 237.905 177.772 234.302 163.662 228.192C150.793 231.326 138.046 235.939 125.301 239.61C107.921 244.617 22.5531 267.918 11.5262 261.181C10.399 260.492 9.91204 259.752 9.6754 258.429C7.76243 247.734 60.1691 206.796 70.5041 198.825C79.5652 191.839 97.6129 180.372 103.89 171.683C106.356 168.27 107.214 164.968 105.426 161.031C101.754 152.946 89.7704 143.608 83.1539 137.198L35.7116 91.749C29.2976 85.7031 1.00058 60.5289 0 54.5035C1.84713 51.5213 5.91839 52.8537 8.69903 54.0432C54.5271 73.6443 99.6694 95.0959 145.538 114.571C166.759 87.3145 183.573 75.3569 217.473 64.2429C220.258 63.3298 224.912 61.8744 227.492 63.2291C227.084 64.5845 226.105 66.0362 224.718 66.4996C205.103 73.0791 184.079 82.0028 170.459 98.2129C162.061 108.208 164.898 116.703 177.611 118.819C188.237 120.588 193.362 118.159 203.182 116.633L203.824 117.256L203.017 119.542L203.641 119.496L203.042 119.552L203.057 119.215L204.14 119.187C218.667 109.653 225.494 99.9361 231.642 83.452C237.108 68.8023 241.375 9.82322 247.915 0.464021L248.244 0ZM127.123 170.093C115.992 179.188 104.264 188.198 95.9739 199.982C93.7969 202.864 91.6573 205.924 92.3212 209.741C92.6628 211.705 93.7932 213.388 95.449 214.493C105.763 221.372 141.135 213.987 152.546 211.191C177.85 204.991 202.285 196.759 226.506 187.192C264.368 172.237 351.352 131.884 371.972 97.5477C373.482 95.0332 374.438 92.2019 375.419 89.4482C369.854 79.3243 362.37 81.1984 352.097 81.3823C343.178 81.6637 327.813 85.1615 318.664 87.0356C321.999 94.7953 331.85 115.583 328.968 124.298C327.819 127.766 315.478 134.659 311.602 136.988C269.119 162.33 223.691 182.369 176.333 196.657C164.044 200.304 149.084 203.651 136.324 203.945C129.054 187.856 129.113 187.892 127.123 170.093ZM135.125 166.47C140.35 159.41 159.48 132.169 152.141 124.272C150.467 123.501 150.138 123.303 148.314 123.174C138.823 130.001 128.168 155.269 132.383 166.421L133.306 167.331C134.698 167.072 134.124 167.376 135.125 166.47ZM295.857 79.5722C295.137 73.4058 279.032 67.3009 273.833 65.3511C278.374 76.6608 282.609 81.8463 295.857 79.5722Z';

// Faint dot texture (Satori renders <img> data URIs).
const TEXTURE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.05)"/></svg>`);

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const origin = new URL(req.url).origin;
  const format = new URL(req.url).searchParams.get('format'); // 'og' (link preview) | 'story' (IG story)

  const [u] = await db
    .select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl, roleTags: users.roleTags, path: users.path, createdAt: users.createdAt })
    .from(users)
    .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
    .limit(1);
  if (!u) return new Response('Not found', { status: 404 });

  // Worldbuilder when the user builds a published world (matches the profile
  // page) — the explicit path column alone misses this.
  const owned = await db
    .select({ id: worldMembers.id })
    .from(worldMembers)
    .innerJoin(worlds, eq(worldMembers.worldId, worlds.id))
    .where(and(eq(worldMembers.userId, u.id), eq(worldMembers.role, 'world_builder'), eq(worlds.published, true)))
    .limit(1);
  const hasOwnedWorlds = owned.length > 0;

  // The user's vanity short link, shown on the card. Hardcoded brand host so the
  // card always reads topia.vision regardless of which deployment renders it.
  const shortLink = `topia.vision/@${u.username}`;

  const [bold, regular, zalando] = await Promise.all([
    fetch(`${origin}/fonts/GTZirkon-Bold.otf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/GTZirkon-Regular.otf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/ZalandoSansExpanded-900.ttf`).then((r) => r.arrayBuffer()),
  ]);

  const roleTags = (u.roleTags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const path = resolvePath(u.path, roleTags, hasOwnedWorlds);
  const cfg = PATH_CONFIG[path];
  const accent = cfg.hex;
  const onAccent = path === 'worldbuilder' ? '#0a0a0a' : '#f5f0e8';
  const issued = u.createdAt ? new Date(u.createdAt).getFullYear() : new Date().getFullYear();
  const roleLine = roleTags.slice(0, 4).map((r) => r.replace(/-/g, ' ')).join('   ·   ').toUpperCase();
  const initial = (u.name || u.username || '?')[0]?.toUpperCase() ?? '?';
  const displayName = (u.name || u.username || 'Unnamed').toUpperCase();
  const cardBg = `radial-gradient(circle at 50% 16%, ${accent}26 0%, rgba(13,13,13,0) 60%), linear-gradient(160deg, #181818 0%, #0c0c0c 62%, #0a0a0a 100%)`;

  // Self-contained card sized by width — reused across formats.
  const Card = (w: number, extraStyle: React.CSSProperties = {}, footerRight: string = shortLink) => {
    const h = w * 1.25;
    const pad = w * 0.062;
    const av = w * 0.3;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: w, height: h, borderRadius: w * 0.045, border: `${Math.max(2, w * 0.0022)}px solid ${accent}66`, background: cardBg, padding: pad, position: 'relative', ...extraStyle }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <svg width={w * 0.075} height={w * 0.075 * (309 / 468)} viewBox="0 0 468 309" fill="none"><path d={LOGO_PATH} fill={accent} /></svg>
          <span style={{ color: 'rgba(245,240,232,0.4)', fontSize: w * 0.024, letterSpacing: 4 }}>TOPIA://IDENTITY</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', width: av, height: av, borderRadius: av, border: `${w * 0.006}px solid ${accent}`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#161616' }}>
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatarUrl} alt="" width={av} height={av} style={{ width: av, height: av, objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'rgba(245,240,232,0.5)', fontSize: av * 0.42, fontWeight: 700 }}>{initial}</span>
            )}
          </div>
          <div style={{ display: 'flex', color: '#f5f0e8', fontFamily: 'Zalando Expanded', fontSize: w * 0.082, fontWeight: 900, marginTop: w * 0.05, textAlign: 'center', lineHeight: 1.0 }}>{displayName}</div>
          <div style={{ display: 'flex', color: 'rgba(245,240,232,0.55)', fontSize: w * 0.036, marginTop: 8 }}>@{u.username}</div>
          <div style={{ display: 'flex', marginTop: w * 0.04, backgroundColor: accent, color: onAccent, fontSize: w * 0.028, fontWeight: 700, letterSpacing: 5, padding: `${w * 0.012}px ${w * 0.026}px`, borderRadius: 8 }}>{cfg.label}</div>
          {roleLine ? <div style={{ display: 'flex', color: 'rgba(245,240,232,0.45)', fontSize: w * 0.025, letterSpacing: 2, marginTop: w * 0.04, textAlign: 'center' }}>{roleLine}</div> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', color: 'rgba(245,240,232,0.4)', fontSize: w * 0.024, letterSpacing: 3 }}>
          <span style={{ display: 'flex' }}>ISSUED {issued}</span>
          <span style={{ display: 'flex', letterSpacing: 1 }}>{footerRight}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: '12%', width: '76%', height: w * 0.006, display: 'flex', backgroundColor: accent, borderRadius: 6 }} />
      </div>
    );
  };

  const fonts = [
    { name: 'GT Zirkon', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'GT Zirkon', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Zalando Expanded', data: zalando, weight: 900 as const, style: 'normal' as const },
  ];

  // ── Instagram Story: 1080×1920, dark textured bg, card floating tilted ──
  if (format === 'story') {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', backgroundColor: '#0a0a0a', fontFamily: 'GT Zirkon' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TEXTURE} alt="" width={1080} height={1920} style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920, opacity: 0.55 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920, display: 'flex', background: `radial-gradient(circle at 50% 42%, ${accent}26 0%, rgba(10,10,10,0) 55%)` }} />

          <div style={{ display: 'flex', marginTop: 150 }}>
            <svg width={72} height={72 * (309 / 468)} viewBox="0 0 468 309" fill="none"><path d={LOGO_PATH} fill={accent} /></svg>
          </div>

          {/* card centered, upright, with a soft cast shadow + accent glow */}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', display: 'flex' }}>
              <div style={{ position: 'absolute', top: 40, left: 0, width: 720, height: 900, borderRadius: 33, background: 'rgba(0,0,0,0.5)', boxShadow: '0 70px 130px 30px rgba(0,0,0,0.6)' }} />
              {Card(720, { boxShadow: `0 0 70px -8px ${accent}66` }, 'TOPIA.VISION')}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 150 }}>
            <span style={{ color: '#f5f0e8', fontSize: 38, fontWeight: 700, letterSpacing: 1 }}>{shortLink}</span>
            <span style={{ color: 'rgba(245,240,232,0.45)', fontSize: 26, letterSpacing: 4, marginTop: 12 }}>FIND ME ON TOPIA</span>
          </div>
        </div>
      ),
      { width: 1080, height: 1920, fonts },
    );
  }

  // ── Link preview: 1200×630 landscape ──
  if (format === 'og') {
    const av = 220;
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: '#0a0a0a', padding: 28, fontFamily: 'GT Zirkon' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TEXTURE} alt="" width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, opacity: 0.5 }} />
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', borderRadius: 36, border: `2px solid ${accent}66`, background: cardBg, padding: 56, justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <svg width={64} height={64 * (309 / 468)} viewBox="0 0 468 309" fill="none"><path d={LOGO_PATH} fill={accent} /></svg>
              <span style={{ color: 'rgba(245,240,232,0.4)', fontSize: 22, letterSpacing: 5 }}>TOPIA://IDENTITY</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', width: av, height: av, borderRadius: av, border: `6px solid ${accent}`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#161616' }}>
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt="" width={av} height={av} style={{ width: av, height: av, objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'rgba(245,240,232,0.5)', fontSize: av * 0.42, fontWeight: 700 }}>{initial}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 56 }}>
                <div style={{ display: 'flex', color: '#f5f0e8', fontFamily: 'Zalando Expanded', fontSize: 58, fontWeight: 900, lineHeight: 1.0 }}>{displayName}</div>
                <div style={{ display: 'flex', color: 'rgba(245,240,232,0.55)', fontSize: 30, marginTop: 8 }}>@{u.username}</div>
                <div style={{ display: 'flex', marginTop: 24, backgroundColor: accent, color: onAccent, fontSize: 24, fontWeight: 700, letterSpacing: 5, padding: '12px 26px', borderRadius: 8 }}>{cfg.label}</div>
                {roleLine ? <div style={{ display: 'flex', color: 'rgba(245,240,232,0.45)', fontSize: 22, letterSpacing: 2, marginTop: 22 }}>{roleLine}</div> : null}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', color: 'rgba(245,240,232,0.4)', fontSize: 20, letterSpacing: 3 }}>
              <span style={{ display: 'flex' }}>ISSUED {issued}</span>
              <span style={{ display: 'flex', letterSpacing: 1 }}>{shortLink}</span>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts },
    );
  }

  // ── Default: 1080×1350 portrait card, transparent background, glowing border ──
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'GT Zirkon' }}>
        {Card(984, { boxShadow: `0 0 90px -10px ${accent}66` })}
      </div>
    ),
    { width: 1080, height: 1350, fonts },
  );
}
