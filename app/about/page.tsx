'use client';

import { useState, useEffect, useCallback } from 'react';
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
  artbyjah: { title: 'Creative Director' },
  d: { title: 'Community Lead' },
  cxy: { title: 'Executive Producer' },
};

const TEAM_ORDER = ['callmelatasha', 'annelisa', 'jada', 'artbyjah', 'd', 'cxy'];

export default function AboutPage() {
  const [screen, setScreen] = useState(0);
  const [sub, setSub] = useState(0);
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    setTimeout(() => setScreen(1), 500);
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
    setTimeout(() => setSub(1), 800);
  }, []);
  const s1bDone = useCallback(() => {
    setTimeout(() => {
      setScreen(2);
      setSub(0);
    }, 1500);
  }, []);
  const s2Done = useCallback(() => {
    setTimeout(() => setSub(1), 400);
  }, []);
  const s2bDone = useCallback(() => {
    setTimeout(() => {
      setScreen(3);
      setSub(0);
    }, 1500);
  }, []);
  const s3Done = useCallback(() => {
    setTimeout(() => setSub(1), 600);
  }, []);

  const screenBg =
    screen === 1 ? 'bg-obsidian' : screen === 2 ? 'bg-blue' : 'bg-bone';
  const isDark = screen !== 3;
  const text = isDark ? 'text-bone' : 'text-obsidian';
  const textSub = isDark ? 'text-bone/50' : 'text-obsidian/50';

  return (
    <PageShell>
      <section
        className={`min-h-screen ${screenBg} transition-colors duration-500 flex items-center justify-center px-6 md:px-10 py-20`}
      >
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
