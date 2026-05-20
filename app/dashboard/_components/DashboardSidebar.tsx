'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboard } from './DashboardContext';
import { useSidebar } from './SidebarContext';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { worldMemberships, profile } = useDashboard();
  const { collapsed, toggle } = useSidebar();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const sortedWorlds = useMemo(() => {
    return [...worldMemberships].sort((a, b) => {
      if (a.role === b.role) return 0;
      const priority = (r: string) => r === 'owner' ? 0 : r === 'world_builder' ? 1 : 2;
      return priority(a.role) - priority(b.role);
    });
  }, [worldMemberships]);

  // Determine current context from URL
  const currentWorldSlug = useMemo(() => {
    const match = pathname.match(/^\/dashboard\/worlds\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const currentWorld = currentWorldSlug
    ? worldMemberships.find((w) => w.worldSlug === currentWorldSlug)
    : null;

  // Close switcher on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    if (switcherOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [switcherOpen]);

  function isActive(href: string) {
    return pathname === href;
  }

  const worldSubItems = (slug: string) => [
    { label: 'Overview', href: `/dashboard/worlds/${slug}` },
    { label: 'Details', href: `/dashboard/worlds/${slug}/details` },
    { label: 'Projects', href: `/dashboard/worlds/${slug}/projects` },
    { label: 'Members', href: `/dashboard/worlds/${slug}/members` },
  ];

  const personalItems = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Events', href: '/dashboard/events' },
  ];

  /* ── Context switcher ─────────────────────────────────── */
  const contextSwitcher = (
    <div ref={switcherRef} className="relative px-3 pb-3">
      <button
        onClick={() => setSwitcherOpen(!switcherOpen)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-sm border bg-bone/[0.02] border-bone/15 text-bone hover:border-lime/40 hover:bg-bone/[0.05] transition cursor-pointer"
      >
        {currentWorld ? (
          <>
            {currentWorld.worldImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={currentWorld.worldImageUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-basement text-[11px] bg-lime text-obsidian">
                {currentWorld.worldTitle[0]?.toUpperCase()}
              </div>
            )}
            <span className="font-mono text-[11px] uppercase tracking-wider font-bold truncate flex-1 text-left">{currentWorld.worldTitle}</span>
          </>
        ) : (
          <>
            {profile?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={profile.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-lime">
                <span className="font-basement text-[12px] text-obsidian">{(profile?.name?.[0] || profile?.username?.[0] || '?').toUpperCase()}</span>
              </div>
            )}
            <span className="font-mono text-[11px] uppercase tracking-wider font-bold truncate flex-1 text-left">{profile?.username ? `@${profile.username}` : profile?.name || 'You'}</span>
          </>
        )}
        <span className="font-mono text-[12px] text-bone/40 shrink-0" style={{ transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>▾</span>
      </button>

      {/* Dropdown */}
      {switcherOpen && (
        <div className="absolute left-3 right-3 top-full mt-1 border border-bone/15 rounded-sm overflow-hidden shadow-2xl z-30 bg-obsidian">
          {/* Personal option */}
          <Link
            href="/dashboard"
            onClick={() => setSwitcherOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 transition border-b border-bone/10 no-underline ${!currentWorld ? 'bg-bone/[0.06]' : 'hover:bg-bone/[0.03]'}`}
          >
            {profile?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={profile.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-lime">
                <span className="font-basement text-[12px] text-obsidian">{(profile?.name?.[0] || profile?.username?.[0] || '?').toUpperCase()}</span>
              </div>
            )}
            <span className="font-mono text-[11px] uppercase tracking-wider flex-1 truncate text-bone">{profile?.username ? `@${profile.username}` : profile?.name || 'You'}</span>
            {!currentWorld && <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" />}
          </Link>

          {/* World options */}
          {sortedWorlds.length > 0 && (
            <div className="py-1">
              <p className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 px-3 py-1.5">Worlds · {sortedWorlds.length}</p>
              {sortedWorlds.map((w) => (
                <Link
                  key={w.worldId}
                  href={`/dashboard/worlds/${w.worldSlug}`}
                  onClick={() => setSwitcherOpen(false)}
                  className={`flex items-center gap-2 px-3 py-1.5 transition no-underline ${currentWorldSlug === w.worldSlug ? 'bg-bone/[0.06]' : 'hover:bg-bone/[0.03]'}`}
                >
                  {w.worldImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={w.worldImageUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-basement text-[11px] bg-lime text-obsidian">
                      {w.worldTitle[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="font-mono text-[11px] uppercase tracking-wider flex-1 truncate text-bone">{w.worldTitle}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-bone/30 shrink-0">
                    {w.role === 'owner' ? 'OWN' : w.role === 'world_builder' ? 'BLD' : 'COL'}
                  </span>
                  {currentWorldSlug === w.worldSlug && <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" />}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ── Nav items (changes entirely based on context) ───── */
  const navItems = currentWorld
    ? worldSubItems(currentWorld.worldSlug)
    : personalItems;

  const navSection = (
    <nav className="flex-1 overflow-y-auto px-2">
      <p className="font-mono text-[10px] uppercase tracking-[2px] text-bone/25 px-2 py-1 mt-1">
        {currentWorld ? 'Manage' : 'Personal'}
      </p>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-sm transition-colors mb-0.5 no-underline ${
            isActive(item.href) ? 'bg-lime text-obsidian font-bold' : 'text-bone/60 hover:text-bone hover:bg-bone/[0.04]'
          }`}
        >
          <span className="font-mono text-[11px] uppercase tracking-wider">{item.label}</span>
        </Link>
      ))}

      {/* Quick links section */}
      {!currentWorld && (
        <>
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-bone/25 px-2 py-1 mt-4">Quick</p>
          {[
            { label: 'Tools', href: '/resources/tools' },
            { label: 'Worlds', href: '/worlds' },
            { label: 'Events', href: '/events' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-bone/40 hover:text-bone hover:bg-bone/[0.04] transition-colors mb-0.5 no-underline"
            >
              <span className="font-mono text-[11px] uppercase tracking-wider">{item.label} →</span>
            </Link>
          ))}
        </>
      )}
    </nav>
  );

  /* ── Bottom links ─────────────────────────────────────── */
  const bottomLinks = (
    <div className="px-2 pb-6 pt-3 border-t border-bone/[0.06]">
      {currentWorld ? (
        <a
          href={`/worlds/${currentWorld.worldSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-bone/40 hover:text-bone hover:bg-bone/[0.04] transition no-underline"
        >
          <span className="font-mono text-[11px] uppercase tracking-wider">View World ↗</span>
        </a>
      ) : (
        <>
          <Link
            href="/profile"
            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-bone/40 hover:text-bone hover:bg-bone/[0.04] transition no-underline"
          >
            <span className="font-mono text-[11px] uppercase tracking-wider">Edit Profile</span>
          </Link>
          {profile?.username && (
            <Link
              href={`/profile/${profile.username}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-bone/40 hover:text-bone hover:bg-bone/[0.04] transition no-underline"
            >
              <span className="font-mono text-[11px] uppercase tracking-wider">View Profile ↗</span>
            </Link>
          )}
        </>
      )}
    </div>
  );

  /* ── Collapsed rail nav (compact mode) ───────────────── */
  // Shows just the avatar + a row of single-letter tabs so users can still
  // navigate without expanding. The expand chevron sits at the bottom.
  const railNav = (
    <nav className="flex-1 flex flex-col items-center gap-1 px-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          title={item.label}
          className={`w-9 h-9 rounded-sm flex items-center justify-center font-mono text-[11px] uppercase tracking-wider transition-colors no-underline ${
            isActive(item.href)
              ? 'bg-lime text-obsidian font-bold'
              : 'text-bone/50 hover:text-bone hover:bg-bone/[0.04]'
          }`}
        >
          {item.label[0]?.toUpperCase()}
        </Link>
      ))}
      {!currentWorld && (
        <>
          <div className="w-6 h-px bg-bone/15 my-2" />
          {[
            { label: 'Tools',  href: '/resources/tools', glyph: 'T' },
            { label: 'Worlds', href: '/worlds',          glyph: 'W' },
            { label: 'Events', href: '/events',          glyph: 'E' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="w-9 h-9 rounded-sm flex items-center justify-center font-mono text-[11px] uppercase tracking-wider text-bone/35 hover:text-bone hover:bg-bone/[0.04] transition-colors no-underline"
            >
              {item.glyph}
            </Link>
          ))}
        </>
      )}
    </nav>
  );

  /* ── Desktop sidebar ─────────────────────────────────── */
  const desktopSidebar = (
    <aside
      className={`hidden sm:flex flex-col fixed top-0 left-0 h-full pt-16 z-20 border-r border-bone/[0.06] bg-obsidian transition-[width] duration-300 ease-out ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Top: switcher (full) or just avatar (rail) */}
      <div className="pt-3 relative">
        {collapsed ? (
          // Compact avatar — click expands
          <button
            onClick={toggle}
            title="Expand sidebar"
            className="mx-auto block w-9 h-9 rounded-full overflow-hidden border border-bone/15 hover:border-lime/50 transition cursor-pointer bg-bone/[0.02]"
          >
            {currentWorld ? (
              currentWorld.worldImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={currentWorld.worldImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-basement text-[13px] bg-lime text-obsidian">
                  {currentWorld.worldTitle[0]?.toUpperCase()}
                </div>
              )
            ) : profile?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-lime">
                <span className="font-basement text-[14px] text-obsidian">{(profile?.name?.[0] || profile?.username?.[0] || '?').toUpperCase()}</span>
              </div>
            )}
          </button>
        ) : (
          contextSwitcher
        )}
      </div>

      {collapsed ? railNav : navSection}

      {/* Collapse / expand toggle — bottom-right edge */}
      <div className={`px-2 pb-3 ${collapsed ? 'flex justify-center' : 'flex justify-end'} border-t border-bone/[0.06] pt-2`}>
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar (⌘\\)' : 'Collapse sidebar (⌘\\)'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-7 h-7 rounded-sm flex items-center justify-center text-bone/40 hover:text-bone hover:bg-bone/[0.05] transition cursor-pointer bg-transparent border border-bone/10"
        >
          <span
            className="font-mono text-[14px] leading-none"
            style={{ transition: 'transform 250ms ease-out', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            ›
          </span>
        </button>
      </div>

      {!collapsed && bottomLinks}
    </aside>
  );

  /* ── Mobile tab bar ──────────────────────────────────── */
  const mobileTabs = (
    <div className="sm:hidden fixed top-16 left-0 right-0 z-20 border-b border-bone/[0.06] overflow-x-auto bg-obsidian">
      <div className="flex items-center gap-0.5 px-3 py-1.5" style={{ scrollbarWidth: 'none' }}>
        {/* Mobile context indicator */}
        {currentWorld && (
          <Link
            href="/dashboard"
            className="shrink-0 font-mono text-[12px] uppercase tracking-wider px-2 py-1 rounded text-bone/40 hover:text-bone transition no-underline"
          >
            ←
          </Link>
        )}

        {currentWorld && (
          <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider px-1 truncate max-w-[80px] text-bone/50">
            {currentWorld.worldTitle}
          </span>
        )}

        {/* Tab items */}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-sm transition-colors no-underline ${
              isActive(item.href) ? 'bg-lime text-obsidian font-bold' : 'text-bone/40 hover:text-bone'
            }`}
          >
            {item.label}
          </Link>
        ))}

        {/* On personal view, show world shortcuts */}
        {!currentWorld && sortedWorlds.length > 0 && (
          <>
            <span className="shrink-0 w-px h-4 mx-1 bg-bone/15" />
            {sortedWorlds.map((w) => (
              <Link
                key={w.worldId}
                href={`/dashboard/worlds/${w.worldSlug}`}
                className="shrink-0 font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-sm text-bone/40 hover:text-bone transition no-underline"
              >
                {w.worldTitle}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {desktopSidebar}
      {mobileTabs}
    </>
  );
}
