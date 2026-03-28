'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboard } from './DashboardContext';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { worldMemberships, profile } = useDashboard();
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
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border transition hover:opacity-80"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
      >
        {currentWorld ? (
          <>
            {currentWorld.worldImageUrl ? (
              <img src={currentWorld.worldImageUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-mono text-[8px] font-bold" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                {currentWorld.worldTitle[0]?.toUpperCase()}
              </div>
            )}
            <span className="font-mono text-[11px] font-bold truncate flex-1 text-left">{currentWorld.worldTitle}</span>
          </>
        ) : (
          <>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--foreground)' }}>
                <span className="font-mono text-[9px] font-bold" style={{ color: 'var(--background)' }}>{(profile?.name?.[0] || profile?.username?.[0] || '?').toUpperCase()}</span>
              </div>
            )}
            <span className="font-mono text-[11px] font-bold truncate flex-1 text-left">{profile?.username ? `@${profile.username}` : profile?.name || 'You'}</span>
          </>
        )}
        <span className="font-mono text-[10px] opacity-40 shrink-0" style={{ transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>▾</span>
      </button>

      {/* Dropdown */}
      {switcherOpen && (
        <div
          className="absolute left-3 right-3 top-full mt-1 border rounded-lg overflow-hidden shadow-lg z-30"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
        >
          {/* Personal option */}
          <Link
            href="/dashboard"
            onClick={() => setSwitcherOpen(false)}
            className="flex items-center gap-2 px-3 py-2 transition hover:opacity-70 border-b"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: !currentWorld ? 'var(--surface)' : 'transparent',
              color: 'var(--foreground)',
            }}
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--foreground)' }}>
                <span className="font-mono text-[9px] font-bold" style={{ color: 'var(--background)' }}>{(profile?.name?.[0] || profile?.username?.[0] || '?').toUpperCase()}</span>
              </div>
            )}
            <span className="font-mono text-[11px] flex-1 truncate">{profile?.username ? `@${profile.username}` : profile?.name || 'You'}</span>
            {!currentWorld && <span className="font-mono text-[9px] opacity-40">●</span>}
          </Link>

          {/* World options */}
          {sortedWorlds.length > 0 && (
            <div className="py-1">
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-30 px-3 py-1" style={{ color: 'var(--foreground)' }}>Worlds</p>
              {sortedWorlds.map((w) => (
                <Link
                  key={w.worldId}
                  href={`/dashboard/worlds/${w.worldSlug}`}
                  onClick={() => setSwitcherOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 transition hover:opacity-70"
                  style={{
                    backgroundColor: currentWorldSlug === w.worldSlug ? 'var(--surface)' : 'transparent',
                    color: 'var(--foreground)',
                  }}
                >
                  {w.worldImageUrl ? (
                    <img src={w.worldImageUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center font-mono text-[8px] font-bold" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                      {w.worldTitle[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="font-mono text-[11px] flex-1 truncate">{w.worldTitle}</span>
                  <span className="font-mono text-[8px] uppercase tracking-wider opacity-30 shrink-0">
                    {w.role === 'owner' ? 'Owner' : w.role === 'world_builder' ? 'Builder' : 'Collab'}
                  </span>
                  {currentWorldSlug === w.worldSlug && <span className="font-mono text-[9px] opacity-40">●</span>}
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
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors mb-0.5"
          style={{
            backgroundColor: isActive(item.href) ? 'var(--foreground)' : 'transparent',
            color: isActive(item.href) ? 'var(--background)' : 'var(--foreground)',
          }}
        >
          <span className="font-mono text-[11px] uppercase tracking-wider">{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  /* ── Bottom links ─────────────────────────────────────── */
  const bottomLinks = (
    <div className="px-2 pb-6 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
      {currentWorld && (
        <a
          href={`/worlds/${currentWorld.worldSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors"
          style={{ color: 'var(--foreground)', opacity: 0.5 }}
        >
          <span className="font-mono text-[11px] uppercase tracking-wider">View World ↗</span>
        </a>
      )}
      {!currentWorld && (
        <Link
          href="/profile"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors"
          style={{ color: 'var(--foreground)', opacity: 0.5 }}
        >
          <span className="font-mono text-[11px] uppercase tracking-wider">Edit Profile</span>
        </Link>
      )}
    </div>
  );

  /* ── Desktop sidebar ─────────────────────────────────── */
  const desktopSidebar = (
    <aside
      className="hidden sm:flex flex-col fixed top-0 left-0 h-full w-56 pt-16 z-20 border-r"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)' }}
    >
      {/* Switcher */}
      <div className="pt-3">
        {contextSwitcher}
      </div>

      {navSection}
      {bottomLinks}
    </aside>
  );

  /* ── Mobile tab bar ──────────────────────────────────── */
  const mobileTabs = (
    <div
      className="sm:hidden fixed top-16 left-0 right-0 z-20 border-b overflow-x-auto"
      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center gap-0.5 px-3 py-1.5">
        {/* Mobile context indicator */}
        {currentWorld ? (
          <Link
            href="/dashboard"
            className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded opacity-40 hover:opacity-80 transition"
            style={{ color: 'var(--foreground)' }}
          >
            ←
          </Link>
        ) : null}

        {currentWorld && (
          <span
            className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider px-1 truncate max-w-[80px] opacity-50"
            style={{ color: 'var(--foreground)' }}
          >
            {currentWorld.worldTitle}
          </span>
        )}

        {/* Tab items */}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded transition-colors"
            style={{
              backgroundColor: isActive(item.href) ? 'var(--foreground)' : 'transparent',
              color: isActive(item.href) ? 'var(--background)' : 'var(--foreground)',
              opacity: isActive(item.href) ? 1 : 0.5,
            }}
          >
            {item.label}
          </Link>
        ))}

        {/* On personal view, show world shortcuts */}
        {!currentWorld && sortedWorlds.length > 0 && (
          <>
            <span className="shrink-0 w-px h-4 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
            {sortedWorlds.map((w) => (
              <Link
                key={w.worldId}
                href={`/dashboard/worlds/${w.worldSlug}`}
                className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded transition-colors"
                style={{
                  color: 'var(--foreground)',
                  opacity: 0.4,
                }}
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
