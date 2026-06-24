import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { PATH_CONFIG, resolvePath } from '@/app/components/profile/pathConfig';

export const runtime = 'nodejs';

// The brand star mark (public/brand/logo.svg), as an inline element we can recolor.
const LOGO_PATH =
  'M248.244 0L249.567 0.534218C253.772 5.33588 268.237 51.6617 271.697 60.619C284.721 62.5024 301.944 69.6949 312.074 78.5385C334.862 70.9857 439.759 43.3727 459.298 46.3637C461.484 46.6985 462.317 47.3396 463.571 49.0776C465.702 60.2407 418.051 96.8812 407.934 104.568C398.897 111.44 364.575 134.502 361.352 143.426C360.265 146.449 361.346 149.374 363.035 151.895C367.19 158.093 376.047 165.05 381.599 170.415C393.226 181.651 464.838 248.37 466.894 253.53C467.503 255.059 467.372 255.385 466.745 256.79C464.751 257.837 462.31 257.453 460.273 256.646C447.845 251.725 434.926 245.672 422.753 240.223L344.023 204.894C333.831 200.33 316.223 191.852 306.099 189.27C293.771 205.447 277.044 216.059 259.418 225.553C262.722 206.006 266.939 198.44 280.616 183.724C253.176 201.589 251.517 218.376 246.822 248.511L240.052 290.743C239.381 294.816 238.307 307.771 233.965 308.234C229.102 305.491 216.287 266.833 213.231 258.28C211.027 251.366 208.603 244.524 205.962 237.765C190.337 237.905 177.772 234.302 163.662 228.192C150.793 231.326 138.046 235.939 125.301 239.61C107.921 244.617 22.5531 267.918 11.5262 261.181C10.399 260.492 9.91204 259.752 9.6754 258.429C7.76243 247.734 60.1691 206.796 70.5041 198.825C79.5652 191.839 97.6129 180.372 103.89 171.683C106.356 168.27 107.214 164.968 105.426 161.031C101.754 152.946 89.7704 143.608 83.1539 137.198L35.7116 91.749C29.2976 85.7031 1.00058 60.5289 0 54.5035C1.84713 51.5213 5.91839 52.8537 8.69903 54.0432C54.5271 73.6443 99.6694 95.0959 145.538 114.571C166.759 87.3145 183.573 75.3569 217.473 64.2429C220.258 63.3298 224.912 61.8744 227.492 63.2291C227.084 64.5845 226.105 66.0362 224.718 66.4996C205.103 73.0791 184.079 82.0028 170.459 98.2129C162.061 108.208 164.898 116.703 177.611 118.819C188.237 120.588 193.362 118.159 203.182 116.633L203.824 117.256L203.017 119.542L203.641 119.496L203.042 119.552L203.057 119.215L204.14 119.187C218.667 109.653 225.494 99.9361 231.642 83.452C237.108 68.8023 241.375 9.82322 247.915 0.464021L248.244 0ZM127.123 170.093C115.992 179.188 104.264 188.198 95.9739 199.982C93.7969 202.864 91.6573 205.924 92.3212 209.741C92.6628 211.705 93.7932 213.388 95.449 214.493C105.763 221.372 141.135 213.987 152.546 211.191C177.85 204.991 202.285 196.759 226.506 187.192C264.368 172.237 351.352 131.884 371.972 97.5477C373.482 95.0332 374.438 92.2019 375.419 89.4482C369.854 79.3243 362.37 81.1984 352.097 81.3823C343.178 81.6637 327.813 85.1615 318.664 87.0356C321.999 94.7953 331.85 115.583 328.968 124.298C327.819 127.766 315.478 134.659 311.602 136.988C269.119 162.33 223.691 182.369 176.333 196.657C164.044 200.304 149.084 203.651 136.324 203.945C129.054 187.856 129.113 187.892 127.123 170.093ZM135.125 166.47C140.35 159.41 159.48 132.169 152.141 124.272C150.467 123.501 150.138 123.303 148.314 123.174C138.823 130.001 128.168 155.269 132.383 166.421L133.306 167.331C134.698 167.072 134.124 167.376 135.125 166.47ZM295.857 79.5722C295.137 73.4058 279.032 67.3009 273.833 65.3511C278.374 76.6608 282.609 81.8463 295.857 79.5722Z';

function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size * (309 / 468)} viewBox="0 0 468 309" fill="none">
      <path d={LOGO_PATH} fill="#e4fe52" />
    </svg>
  );
}

// Faint dot texture as a tiny SVG data URI (Satori renders <img> data URIs).
const TEXTURE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.05)"/></svg>`,
  );

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const origin = new URL(req.url).origin;
  const format = new URL(req.url).searchParams.get('format'); // 'og' → 1200×630 link preview

  const [u] = await db
    .select({
      name: users.name, username: users.username, avatarUrl: users.avatarUrl,
      roleTags: users.roleTags, path: users.path, createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
    .limit(1);

  if (!u) return new Response('Not found', { status: 404 });

  const [bold, regular] = await Promise.all([
    fetch(`${origin}/fonts/GTZirkon-Bold.otf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/GTZirkon-Regular.otf`).then((r) => r.arrayBuffer()),
  ]);

  const roleTags = (u.roleTags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const path = resolvePath(u.path, roleTags, false);
  const cfg = PATH_CONFIG[path];
  const accent = cfg.hex;
  const onAccent = path === 'worldbuilder' ? '#0a0a0a' : '#f5f0e8';
  const issued = u.createdAt ? new Date(u.createdAt).getFullYear() : new Date().getFullYear();
  const roleLine = roleTags.slice(0, 4).map((r) => r.replace(/-/g, ' ')).join('   ·   ').toUpperCase();
  const initial = (u.name || u.username || '?')[0]?.toUpperCase() ?? '?';
  const isOg = format === 'og';

  const W = isOg ? 1200 : 1080;
  const H = isOg ? 630 : 1350;
  const inset = isOg ? 28 : 44;
  const avatar = isOg ? 220 : 300;
  const nameSize = isOg ? 70 : 88;

  const cardBg = `radial-gradient(circle at 50% 18%, ${accent}26 0%, rgba(13,13,13,0) 60%), linear-gradient(160deg, #161616 0%, #0c0c0c 60%, #0a0a0a 100%)`;

  const Brand = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <Logo size={isOg ? 64 : 76} />
      <span style={{ color: 'rgba(245,240,232,0.4)', fontSize: isOg ? 22 : 26, letterSpacing: 5, fontFamily: 'GT Zirkon' }}>TOPIA://IDENTITY</span>
    </div>
  );

  const Avatar = (
    <div style={{ display: 'flex', width: avatar, height: avatar, borderRadius: avatar, border: `6px solid ${accent}`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#161616' }}>
      {u.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={u.avatarUrl} alt="" width={avatar} height={avatar} style={{ width: avatar, height: avatar, objectFit: 'cover' }} />
      ) : (
        <span style={{ color: 'rgba(245,240,232,0.5)', fontSize: avatar * 0.42, fontWeight: 700, fontFamily: 'GT Zirkon' }}>{initial}</span>
      )}
    </div>
  );

  const Identity = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOg ? 'flex-start' : 'center' }}>
      <div style={{ display: 'flex', color: '#f5f0e8', fontSize: nameSize, fontWeight: 700, fontFamily: 'GT Zirkon', lineHeight: 1.02, textAlign: isOg ? 'left' : 'center' }}>
        {u.name || u.username || 'Unnamed'}
      </div>
      <div style={{ display: 'flex', color: 'rgba(245,240,232,0.55)', fontSize: isOg ? 30 : 36, marginTop: 8, fontFamily: 'GT Zirkon' }}>@{u.username}</div>
      <div style={{ display: 'flex', marginTop: isOg ? 24 : 36, backgroundColor: accent, color: onAccent, fontSize: isOg ? 24 : 28, fontWeight: 700, letterSpacing: 5, padding: '12px 26px', borderRadius: 8, fontFamily: 'GT Zirkon' }}>
        {cfg.label}
      </div>
      {roleLine ? (
        <div style={{ display: 'flex', color: 'rgba(245,240,232,0.45)', fontSize: isOg ? 22 : 26, letterSpacing: 3, marginTop: isOg ? 22 : 36, fontFamily: 'GT Zirkon', textAlign: isOg ? 'left' : 'center' }}>{roleLine}</div>
      ) : null}
    </div>
  );

  const Footer = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', color: 'rgba(245,240,232,0.4)', fontSize: isOg ? 20 : 24, letterSpacing: 3, fontFamily: 'GT Zirkon' }}>
      <span style={{ display: 'flex' }}>ISSUED {issued}</span>
      <span style={{ display: 'flex' }}>TOPIA.VISION</span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: '#0a0a0a', padding: inset, fontFamily: 'GT Zirkon' }}>
        {/* faint background texture */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={TEXTURE} alt="" width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, opacity: 0.5 }} />

        {/* the rounded, bordered card */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', borderRadius: 40, border: `2px solid ${accent}66`, background: cardBg, padding: isOg ? 56 : 64, position: 'relative' }}>
          {isOg ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between' }}>
              {Brand}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {Avatar}
                <div style={{ display: 'flex', marginLeft: 56 }}>{Identity}</div>
              </div>
              {Footer}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
              {Brand}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -20 }}>
                {Avatar}
                <div style={{ display: 'flex', marginTop: 44 }}>{Identity}</div>
              </div>
              {Footer}
            </div>
          )}

          {/* accent bar pinned to the card's rounded bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: '12%', width: '76%', height: 6, display: 'flex', backgroundColor: accent, borderRadius: 6 }} />
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: 'GT Zirkon', data: bold, weight: 700, style: 'normal' },
        { name: 'GT Zirkon', data: regular, weight: 400, style: 'normal' },
      ],
    },
  );
}
