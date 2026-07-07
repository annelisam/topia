'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import PageShell from '../components/PageShell';
import GlitchType from '../components/ui/GlitchType';

interface TeamMember {
  username: string;
  name: string | null;
  title: string;
  avatarUrl: string | null;
  tags: string[];
}

const TEAM_META: Record<string, { title: string }> = {
  callmelatasha: { title: 'CEO' },
  annelisa: { title: 'Chief Technology Officer' },
  jada: { title: 'Chief Marketing Officer' },
  artbyjah: { title: 'Chief Creative Officer' },
  d: { title: 'Community Lead / Executive' },
  cxy: { title: 'Executive Producer' },
};

const TEAM_ORDER = ['callmelatasha', 'annelisa', 'jada', 'artbyjah', 'd', 'cxy'];

export default function AboutPage() {
  const [screen, setScreen] = useState(0);
  const [sub, setSub] = useState(0);
  const [team, setTeam] = useState<TeamMember[]>([]);
  // The timed transitions capture callbacks against a screen the user may
  // have already skipped past — every timer checks this before firing.
  const screenRef = useRef(0);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  useEffect(() => {
    setTimeout(() => setScreen(1), 100);
  }, []);

  // Click anywhere (or the skip button) to jump to the next screen instead
  // of waiting out the typewriter — the story stays, the wait doesn't.
  const advance = useCallback(() => {
    setScreen((s) => {
      if (s < 1 || s >= 3) return s;
      setSub(0);
      return s + 1;
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/team');
        if (!res.ok) return;
        const data = await res.json();
        const byUsername = new Map<string, { name: string | null; avatarUrl: string | null; roleTags: string | null }>();
        for (const row of data.team) {
          byUsername.set(row.username, row);
        }
        const ordered: TeamMember[] = TEAM_ORDER
          .map((username) => {
            const row = byUsername.get(username);
            const meta = TEAM_META[username];
            if (!meta) return null;
            const tags = row?.roleTags
              ? row.roleTags.split(',').map((t: string) => t.trim().replace(/-/g, ' ')).filter(Boolean).slice(0, 3)
              : [];
            return {
              username,
              name: row?.name ?? username,
              title: meta.title,
              avatarUrl: row?.avatarUrl ?? null,
              tags,
            };
          })
          .filter(Boolean) as TeamMember[];
        setTeam(ordered);
      } catch { /* silent */ }
    })();
  }, []);

  const s1Done = useCallback(() => {
    setTimeout(() => { if (screenRef.current === 1) setSub(1); }, 350);
  }, []);
  const s1bDone = useCallback(() => {
    setTimeout(() => {
      if (screenRef.current !== 1) return;
      setScreen(2);
      setSub(0);
    }, 700);
  }, []);
  const s2Done = useCallback(() => {
    setTimeout(() => { if (screenRef.current === 2) setSub(1); }, 250);
  }, []);
  const s2bDone = useCallback(() => {
    setTimeout(() => {
      if (screenRef.current !== 2) return;
      setScreen(3);
      setSub(0);
    }, 700);
  }, []);
  const s3Done = useCallback(() => {
    setTimeout(() => { if (screenRef.current === 3) setSub(1); }, 300);
  }, []);

  const screenBg =
    screen === 1 ? 'bg-obsidian' : screen === 2 ? 'bg-blue' : 'bg-bone';
  const isDark = screen !== 3;
  const text = isDark ? 'text-bone' : 'text-obsidian';
  const textSub = isDark ? 'text-bone/50' : 'text-obsidian/50';

  return (
    <PageShell>
      <section
        onClick={screen < 3 ? advance : undefined}
        className={`min-h-screen ${screenBg} transition-colors duration-500 flex items-center justify-center px-6 md:px-10 py-20 relative ${screen > 0 && screen < 3 ? 'cursor-pointer' : ''}`}
      >
        {/* Skip through the writing — click anywhere does the same */}
        {screen > 0 && screen < 3 && (
          <button
            onClick={(e) => { e.stopPropagation(); advance(); }}
            className={`absolute bottom-8 right-8 z-20 font-mono text-[10px] uppercase tracking-[2px] bg-transparent border rounded-full px-4 py-2 cursor-pointer transition hover:opacity-100 opacity-50 ${text} ${isDark ? 'border-bone/30' : 'border-obsidian/30'}`}
          >
            skip →
          </button>
        )}
        <div className="max-w-4xl w-full relative">
          <span
            className={`font-mono text-[11px] uppercase tracking-[3px] ${textSub} block mb-6`}
          >
            {screen === 1
              ? 'about // origin'
              : screen === 2
                ? 'about // values'
                : 'about // team'}
          </span>

          {/* Screen 1 — Origin */}
          {screen === 1 && (
            <div className="space-y-4">
              <div
                className={`font-mono font-bold text-[clamp(24px,4vw,48px)] leading-[1.2] uppercase ${text}`}
                style={{ transform: 'rotate(-1deg)' }}
              >
                <GlitchType
                  text="WE BUILT THIS BECAUSE WE NEEDED IT."
                  onComplete={s1Done}
                  speed={25}
                />
              </div>
              {sub >= 1 && (
                <div
                  className={`font-mono text-[clamp(13px,1.6vw,18px)] leading-[1.9] ${textSub} max-w-xl`}
                >
                  <GlitchType
                    text="topia exists because artists deserve infrastructure. not platforms that extract — systems that support. not algorithms that reduce — tools that amplify."
                    onComplete={s1bDone}
                    speed={20}
                  />
                </div>
              )}
            </div>
          )}

          {/* Screen 2 — Values */}
          {screen === 2 && (
            <div className="space-y-4">
              <div
                className={`font-mono font-bold text-[clamp(24px,4vw,48px)] leading-[1.2] uppercase ${text}`}
                style={{ transform: 'rotate(-0.5deg)' }}
              >
                <GlitchType
                  text="CULTURE FIRST. SYSTEMS SECOND. OWNERSHIP ALWAYS."
                  onComplete={s2Done}
                  speed={28}
                />
              </div>
              {sub >= 1 && (
                <div
                  className={`font-mono text-[clamp(13px,1.6vw,18px)] leading-[1.9] ${textSub} max-w-xl`}
                >
                  <GlitchType
                    text="we don't build for scale. we build for depth. every decision starts with the creator. every feature earns its place."
                    onComplete={s2bDone}
                    speed={22}
                  />
                </div>
              )}
            </div>
          )}

          {/* Screen 3 — Team */}
          {screen === 3 && (
            <div className="space-y-8">
              <div
                className={`font-mono font-bold text-[clamp(24px,4vw,48px)] leading-[1.2] uppercase ${text}`}
                style={{ transform: 'rotate(-1deg)' }}
              >
                <GlitchType
                  text="BUILT BY CREATORS, FOR CREATORS."
                  onComplete={s3Done}
                  speed={28}
                />
              </div>
              {sub >= 1 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mt-8">
                  {team.map((m, i) => (
                    <Link
                      key={m.username}
                      href={`/profile/${m.username}`}
                      className="opacity-0 animate-[fadeUp_0.5s_ease_forwards] group"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <div className="border border-obsidian/10 rounded-xl overflow-hidden bg-white/60 backdrop-blur-sm transition-shadow hover:shadow-lg">
                        <div className="aspect-square bg-obsidian/5 relative overflow-hidden">
                          {m.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={m.avatarUrl}
                              alt={m.name ?? m.username}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="font-basement text-5xl text-obsidian/15">
                                {(m.name ?? m.username)[0]?.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-mono font-bold text-[14px] uppercase text-obsidian leading-tight">
                            {m.name}
                          </h3>
                          <p className="font-mono text-[11px] text-obsidian/40 mt-0.5">
                            @{m.username}
                          </p>
                          <p className="font-mono text-[11px] uppercase tracking-wider text-obsidian/60 mt-2">
                            {m.title}
                          </p>
                          {m.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {m.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-obsidian/5 text-obsidian/50"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
