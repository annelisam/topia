'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../../components/Navigation';
import LoadingBar from '../../components/LoadingBar';
import { SocialIcon } from '../../components/SocialIcons';

interface WorldMember {
  userId: string;
  role: string;
  userName: string | null;
  userUsername: string | null;
  userAvatarUrl: string | null;
}

interface SocialLinks {
  website?: string;
  twitter?: string;
  instagram?: string;
  soundcloud?: string;
  spotify?: string;
  linkedin?: string;
  substack?: string;
}

interface WorldDetail {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  headerImageUrl: string | null;
  country: string | null;
  tools: string | null;
  collaborators: string | null;
  socialLinks: SocialLinks | null;
  dateAdded: string | null;
  creatorName: string | null;
  creatorSlug: string | null;
  creatorWebsiteUrl: string | null;
  creatorCountry: string | null;
  members: WorldMember[];
}

const FLAG_MAP: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}', SE: '\u{1F1F8}\u{1F1EA}', DE: '\u{1F1E9}\u{1F1EA}', NL: '\u{1F1F3}\u{1F1F1}', GB: '\u{1F1EC}\u{1F1E7}',
  FR: '\u{1F1EB}\u{1F1F7}', JP: '\u{1F1EF}\u{1F1F5}', CA: '\u{1F1E8}\u{1F1E6}', AU: '\u{1F1E6}\u{1F1FA}', IT: '\u{1F1EE}\u{1F1F9}',
};

/* ── Member Card ──────────────────────────────────────────────── */

function MemberCard({ member }: { member: WorldMember }) {
  const content = (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg theme-hover-surface transition-colors">
      {member.userAvatarUrl ? (
        <img
          src={member.userAvatarUrl}
          alt={member.userName || ''}
          className="w-10 h-10 rounded-full object-cover border"
          style={{ borderColor: 'var(--border-color)' }}
        />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-mono text-[12px] font-bold"
          style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
        >
          {(member.userName || member.userUsername || '?')[0]?.toUpperCase()}
        </div>
      )}
      <div>
        <p className="font-mono text-[13px] font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
          {member.userName || member.userUsername || 'Unknown'}
        </p>
        {member.userUsername && (
          <p className="font-mono text-[11px] opacity-50 leading-tight" style={{ color: 'var(--foreground)' }}>
            @{member.userUsername}
          </p>
        )}
      </div>
    </div>
  );

  if (member.userUsername) {
    return (
      <Link href={`/profile/${member.userUsername}`} className="block -mx-3">
        {content}
      </Link>
    );
  }
  return <div className="-mx-3">{content}</div>;
}

/* ── Markdown styles ──────────────────────────────────────────── */

const markdownComponents = {
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="font-mono text-[13px] leading-relaxed mb-3 last:mb-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</p>
  ),
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="font-mono text-[18px] font-bold mb-3 mt-6 first:mt-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="font-mono text-[16px] font-bold mb-2 mt-5 first:mt-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="font-mono text-[14px] font-bold mb-2 mt-4 first:mt-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</h3>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="font-mono text-[13px] list-disc pl-5 mb-3 space-y-1" style={{ color: 'var(--foreground)' }} {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="font-mono text-[13px] list-decimal pl-5 mb-3 space-y-1" style={{ color: 'var(--foreground)' }} {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="font-mono text-[13px] leading-relaxed" style={{ color: 'var(--foreground)' }} {...props}>{children}</li>
  ),
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-60 transition" style={{ color: 'var(--foreground)' }} {...props}>{children}</a>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 pl-4 my-3 opacity-80" style={{ borderColor: 'var(--border-color)' }} {...props}>{children}</blockquote>
  ),
  code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className="font-mono text-[12px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-hover)' }} {...props}>{children}</code>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-bold" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em {...props}>{children}</em>
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-6" style={{ borderColor: 'var(--border-color)' }} {...props} />
  ),
};

/* ── Main Page ────────────────────────────────────────────────── */

export default function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [world, setWorld] = useState<WorldDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, authenticated } = usePrivy();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const worldPromise = fetch(`/api/worlds?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.worlds && data.worlds.length > 0) {
          setWorld(data.worlds[0]);
        }
      });

    const userPromise = (authenticated && user?.id)
      ? fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
          .then(r => r.json())
          .then(d => { if (d.user) setCurrentUserId(d.user.id); })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([worldPromise, userPromise])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, authenticated, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="worlds" />
        <LoadingBar />
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="worlds" />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>World not found.</p>
        <Link href="/worlds" className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to Worlds</Link>
      </div>
    );
  }

  const worldBuilders = world.members?.filter(m => m.role === 'world_builder') || [];
  const collaboratorMembers = world.members?.filter(m => m.role === 'collaborator') || [];
  const isWorldBuilder = currentUserId && worldBuilders.some(b => b.userId === currentUserId);
  const socialLinks = world.socialLinks as SocialLinks | null;
  const hasSocialLinks = socialLinks && Object.values(socialLinks).some(v => v);
  const toolsList = world.tools ? world.tools.split(',').map(t => t.trim()).filter(Boolean) : [];
  const heroImage = world.headerImageUrl || world.imageUrl;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation currentPage="worlds" />

      {/* Hero Image */}
      {heroImage ? (
        <div className="w-full h-56 sm:h-72 md:h-80 relative overflow-hidden">
          <img
            src={heroImage}
            alt={world.title}
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 35%' }}
          />
          <div className="absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
        </div>
      ) : (
        <div className="pt-20 sm:pt-24" />
      )}

      <div className="container mx-auto px-4 sm:px-6 pb-16">
        {/* Back + Edit row */}
        <div className={`flex items-center justify-between ${heroImage ? '-mt-8 relative z-10 mb-6' : 'pt-4 mb-8'}`}>
          <Link href="/worlds" className="font-mono text-[12px] uppercase tracking-widest hover:opacity-60 transition" style={{ color: 'var(--foreground)' }}>
            ← Worlds
          </Link>
          {isWorldBuilder && (
            <Link
              href={`/worlds/${world.slug}/edit`}
              className="font-mono text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-lg border hover:opacity-70 transition"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' }}
            >
              Edit World
            </Link>
          )}
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Hero — centered like profile page */}
          <section className="mb-12 text-center">
            {/* Circle World Avatar */}
            {world.imageUrl && (
              <div className={`mb-5 flex justify-center ${heroImage ? '-mt-14 relative z-10' : ''}`}>
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)' }}
                >
                  <img
                    src={world.imageUrl}
                    alt={world.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Category + Country */}
            {(world.category || world.creatorCountry) && (
              <div className="flex items-center justify-center gap-2 mb-4">
                {world.category && (
                  <span
                    className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border"
                    style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                  >
                    {world.category}
                  </span>
                )}
                {world.creatorCountry && (
                  <span className="text-[15px]">{FLAG_MAP[world.creatorCountry] || world.creatorCountry}</span>
                )}
              </div>
            )}

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-1" style={{ color: 'var(--foreground)' }}>
              {world.title}
            </h1>

            {/* Short description */}
            {world.shortDescription && (
              <p className="font-mono text-[13px] leading-relaxed max-w-md mx-auto mt-2" style={{ color: 'var(--foreground)' }}>
                {world.shortDescription}
              </p>
            )}

            {/* Social Icons */}
            {hasSocialLinks && (
              <div className="flex justify-center gap-4 mt-5">
                {Object.entries(socialLinks!).map(([key, url]) =>
                  url ? (
                    <a
                      key={key}
                      href={url.startsWith('http') ? url : `https://${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-35 hover:opacity-60 transition-opacity"
                      style={{ color: 'var(--foreground)' }}
                      title={key}
                    >
                      <SocialIcon type={key} size={18} />
                    </a>
                  ) : null
                )}
              </div>
            )}
          </section>

          {/* Divider */}
          <div className="border-t mb-10" style={{ borderColor: 'var(--border-color)' }} />

          {/* Built by — World Builders */}
          {worldBuilders.length > 0 && (
            <section className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                Built by
              </p>
              <div className="flex flex-wrap gap-2">
                {worldBuilders.map(builder => (
                  <MemberCard key={builder.userId} member={builder} />
                ))}
              </div>
            </section>
          )}

          {/* Fallback: legacy creator */}
          {worldBuilders.length === 0 && world.creatorName && (
            <section className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                Built by
              </p>
              <Link
                href={`/worlds/creator/${world.creatorSlug}`}
                className="font-mono text-[13px] hover:opacity-60 transition underline"
                style={{ color: 'var(--foreground)' }}
              >
                {world.creatorName}
              </Link>
            </section>
          )}

          {/* About — long description with markdown */}
          {world.description && (
            <section className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-3 opacity-50" style={{ color: 'var(--foreground)' }}>
                About
              </p>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {world.description}
              </ReactMarkdown>
            </section>
          )}

          {/* Tools */}
          {toolsList.length > 0 && (
            <section className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                Tools
              </p>
              <div className="flex flex-wrap gap-2">
                {toolsList.map(tool => (
                  <span
                    key={tool}
                    className="font-mono text-[12px] tracking-tight px-3 py-1.5 rounded-lg border"
                    style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Collaborators */}
          {(collaboratorMembers.length > 0 || world.collaborators) && (
            <section className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                Collaborators
              </p>
              {collaboratorMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {collaboratorMembers.map(c => (
                    <MemberCard key={c.userId} member={c} />
                  ))}
                </div>
              )}
              {world.collaborators && (
                <p className="font-mono text-[13px] opacity-60" style={{ color: 'var(--foreground)' }}>
                  {world.collaborators}
                </p>
              )}
            </section>
          )}

          {/* Date added */}
          {world.dateAdded && (
            <section className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                Created
              </p>
              <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
                {world.dateAdded}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
