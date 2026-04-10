'use client';

import { useState, useEffect, useCallback } from 'react';
import PageShell from '../components/PageShell';
import GlitchType from '../components/ui/GlitchType';

const teamMembers = [
  { name: 'Latashá', role: 'CEO' },
  { name: 'Annelisa', role: 'CPO' },
  { name: 'Jah.', role: 'CCO' },
  { name: 'Jada', role: 'CMO' },
  { name: 'Dae', role: 'Community Lead' },
  { name: 'Kesaun', role: 'Business Manager' },
  { name: 'CY Lee', role: 'Executive Producer' },
];

export default function AboutPage() {
  const [screen, setScreen] = useState(0);
  const [sub, setSub] = useState(0);

  useEffect(() => {
    setTimeout(() => setScreen(1), 500);
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
        <div className="max-w-3xl w-full relative">
          <span
            className={`font-mono text-[8px] uppercase tracking-[3px] ${textSub} block mb-6`}
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8">
                  {teamMembers.map((m, i) => (
                    <div
                      key={m.name}
                      className="opacity-0 animate-[fadeUp_0.5s_ease_forwards]"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <div className="aspect-square bg-obsidian/10 rounded-lg mb-3 flex items-center justify-center">
                        <span className="font-basement text-3xl text-obsidian/20">
                          {m.name[0]}
                        </span>
                      </div>
                      <h3 className="font-mono font-bold text-sm uppercase">
                        {m.name}
                      </h3>
                      <p className="font-mono text-[9px] uppercase tracking-wider opacity-40">
                        {m.role}
                      </p>
                    </div>
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
