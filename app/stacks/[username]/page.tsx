import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { users, tools } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import PageShell from '../../components/PageShell';
import ShareButton from '../../components/ShareButton';
import { faviconUrl } from '../../resources/tools/favicon';
import { roleSlugToLabel } from '../../../lib/profile/roleTags';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ username: string }>;
}

// A user's kit (users.toolSlugs) rendered as a standalone, shareable page —
// "my stack" as an object you can link, unfurl, and browse, not just a tab on
// the profile. Server-rendered so crawlers and link previews get real content.

async function loadStack(username: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
      roleTags: users.roleTags,
      toolSlugs: users.toolSlugs,
      published: users.published,
    })
    .from(users)
    .where(and(sql`lower(${users.username}) = ${username.toLowerCase()}`, eq(users.published, true)))
    .limit(1);
  if (!user) return null;

  const slugs = (user.toolSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  let kit: { slug: string; name: string; category: string | null; url: string | null; pricing: string | null }[] = [];
  if (slugs.length > 0) {
    const rows = await db
      .select({ slug: tools.slug, name: tools.name, category: tools.category, url: tools.url, pricing: tools.pricing })
      .from(tools)
      .where(inArray(tools.slug, slugs));
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    kit = slugs.map((s) => bySlug.get(s)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  }
  return { user, kit };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  try {
    const stack = await loadStack(username);
    if (!stack) return { title: 'Stack not found · TOPIA' };
    const who = stack.user.name || `@${stack.user.username}`;
    const title = `${who}'s stack · TOPIA`;
    const names = stack.kit.slice(0, 6).map((t) => t.name).join(', ');
    const description = stack.kit.length
      ? `The ${stack.kit.length} tools powering ${who}'s practice: ${names}${stack.kit.length > 6 ? '…' : ''}`
      : `${who}'s toolkit on TOPIA.`;
    const card = `https://topia.vision/api/profile/${encodeURIComponent(stack.user.username!)}/card`;
    return {
      title,
      description,
      openGraph: { title, description, type: 'website', siteName: 'TOPIA', images: [{ url: card, alt: title }] },
      twitter: { card: 'summary_large_image', title, description, images: [card] },
    };
  } catch {
    return { title: 'TOPIA Stacks' };
  }
}

/* Deterministic decorative barcode, keyed off the username. */
function bars(seed: string) {
  return seed.split('').flatMap((ch, i) => {
    const code = ch.charCodeAt(0);
    return [
      { type: 'bar' as const, w: ((code * (i + 1)) % 4) + 1 },
      { type: 'gap' as const, w: ((code + i) % 3) + 1 },
    ];
  });
}

export default async function StackPage({ params }: PageProps) {
  const { username } = await params;
  const stack = await loadStack(username).catch(() => null);

  if (!stack) notFound();

  const { user, kit } = stack;
  const who = user.name || `@${user.username}`;
  const roleChips = (user.roleTags ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);

  // Group by each tool's first category token, preserving kit order.
  const groups = new Map<string, typeof kit>();
  for (const t of kit) {
    const cat = (t.category ?? '').split(',')[0]?.trim() || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(t);
  }

  const barcode = bars(user.username || 'topia');
  const mrz = `S<TOPIA<${(user.username || '').replace(/[^a-z0-9]/gi, '<').toUpperCase().padEnd(20, '<')}<<TOOLS<${String(kit.length).padStart(2, '0')}<<<<<<<<<`;

  return (
    <PageShell>
      <section className="min-h-screen bg-[var(--page-bg)] px-4 md:px-6 py-4 md:py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <Link href={`/profile/${user.username}`} className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40 hover:text-ink no-underline">
              ← {who}&apos;s passport
            </Link>
            <Link href="/resources/tools" className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40 hover:text-ink no-underline">
              all tools
            </Link>
          </div>

          <div className="border border-ink/[0.08] rounded-lg overflow-hidden">
            {/* Accent strip */}
            <div className="bg-lime px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/60">topia://stack</span>
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/60">{kit.length} tools</span>
            </div>

            {/* Owner header */}
            <div className="px-5 md:px-7 py-5 md:py-6 border-b border-ink/[0.06] flex flex-wrap items-center gap-4">
              <span className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-ink/5 shrink-0 flex items-center justify-center border border-ink/10">
                {user.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={user.avatarUrl} alt="" width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-basement text-xl text-ink/40">{who[0]?.toUpperCase()}</span>
                )}
              </span>
              <div className="min-w-0 flex-1 basis-52">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">stack of</span>
                <h1 className="font-basement font-black text-[clamp(22px,3vw,32px)] uppercase leading-[0.95] text-ink break-words">{who}</h1>
                {roleChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {roleChips.map((r) => (
                      <span key={r} className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-[var(--accent-ink)]/30 text-[var(--accent-ink)]/80 rounded-sm">
                        {roleSlugToLabel(r)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 ml-auto">
                <ShareButton
                  kind="stack"
                  path={`/stacks/${user.username}`}
                  title={`${who}'s stack`}
                  text={`The tools powering ${who}'s practice — on TOPIA`}
                  iconSize={11}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[2px] px-3 py-1.5 rounded-sm border border-ink/30 text-ink/70 hover:border-ink/70 hover:text-ink transition cursor-pointer bg-transparent"
                />
              </div>
            </div>

            {/* Kit, grouped by category */}
            <div className="px-5 md:px-7 py-5 md:py-6">
              {kit.length === 0 ? (
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink/25 py-8 text-center">
                  no tools declared yet
                </p>
              ) : (
                <div className="space-y-6">
                  {[...groups.entries()].map(([cat, items]) => (
                    <div key={cat}>
                      <span className="font-mono text-[10px] uppercase tracking-[2px] text-ink/30 block mb-3">{cat}</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map((t) => {
                          const icon = faviconUrl(t.url, 64);
                          return (
                            <Link
                              key={t.slug}
                              href={`/resources/tools/${t.slug}`}
                              className="flex items-center gap-3 border border-ink/10 hover:border-[var(--accent-ink)]/40 px-3 py-2.5 rounded-sm transition no-underline"
                            >
                              <span className="w-9 h-9 shrink-0 rounded-sm border border-ink/10 bg-ink/[0.04] overflow-hidden flex items-center justify-center">
                                {icon ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={icon} alt="" width={36} height={36} loading="lazy" className="w-full h-full object-contain" />
                                ) : (
                                  <span className="font-basement text-sm text-ink/30">{t.name[0]?.toUpperCase()}</span>
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="font-mono text-[12px] uppercase font-bold text-ink truncate">{t.name}</div>
                                {t.pricing && <div className="font-mono text-[10px] text-ink/30 truncate">{t.pricing}</div>}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MRZ footer strip */}
            <div className="px-5 md:px-7 py-3 border-t border-ink/[0.04] flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-end gap-0 h-4 mb-1">
                  {barcode.map((b, i) => (
                    <div key={i} className={b.type === 'bar' ? 'bg-ink/10' : ''} style={{ width: `${b.w}px`, height: b.type === 'bar' ? `${10 + b.w * 2}px` : '0px', marginRight: b.type === 'gap' ? `${b.w}px` : '0px' }} />
                  ))}
                </div>
                <span className="font-mono text-[9px] tracking-[2px] text-ink/15 uppercase truncate block" aria-hidden="true">{mrz}</span>
              </div>
              <span className="font-mono text-[8px] text-ink/10 uppercase ml-4 shrink-0" aria-hidden="true">S1</span>
            </div>
          </div>

          <p className="font-mono text-[11px] text-ink/40 mt-4 text-center">
            build your own — add tools to your kit from the{' '}
            <Link href="/resources/tools" className="underline text-ink/60 hover:text-ink">tools directory</Link>
          </p>
        </div>
      </section>
    </PageShell>
  );
}
