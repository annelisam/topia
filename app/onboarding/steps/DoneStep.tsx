'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import GlitchType from '../../components/ui/GlitchType';
import { PathConfig } from '../../components/profile/pathConfig';

interface Props {
  config: PathConfig | null;
  name: string;
  username: string;
  avatarUrl: string;
  roleTags: string[];
}

export default function DoneStep({ config, name, username, avatarUrl, roleTags }: Props) {
  const [phase, setPhase] = useState(0);
  const accent = config?.hex ?? '#e4fe52';
  const accentBg = config?.bg ?? 'bg-lime';
  const accentTextOn = config?.textOn ?? 'text-obsidian';

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative min-h-screen bg-obsidian text-bone overflow-hidden">
      {/* texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)',
        }}
      />
      {/* path-tinted radial glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          opacity: phase >= 1 ? 0.18 : 0,
          background: `radial-gradient(circle at 50% 45%, ${accent} 0%, transparent 55%)`,
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 pt-6 md:pt-8">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/30">topia://identity issued</span>
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40">complete</span>
      </div>

      {/* Center */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 md:px-10 py-12">
        <div className="w-full max-w-3xl text-center">
          {phase >= 1 && (
            <div className="font-mono text-[12px] md:text-[14px] uppercase tracking-[3px] text-bone/40 mb-4">
              <GlitchType text="profile activated." speed={26} />
            </div>
          )}
          {phase >= 2 && (
            <h1 className="font-basement font-black text-[clamp(40px,8vw,96px)] uppercase leading-[0.92] text-bone">
              <GlitchType text={`welcome, ${name || 'creator'}.`} speed={28} />
            </h1>
          )}

          {/* Mini passport preview */}
          {phase >= 3 && (
            <div
              className="mt-12 mx-auto max-w-md border border-bone/15 rounded-lg overflow-hidden"
              style={{ opacity: 0, animation: 'fadeUp 0.7s ease forwards' }}
            >
              <div className={`${accentBg} px-4 py-2 flex items-center justify-between`}>
                <span className={`font-mono text-[9px] uppercase tracking-[2px] ${accentTextOn} opacity-70`}>topia://identity</span>
                <span className={`font-mono text-[10px] uppercase tracking-wider ${accentTextOn} opacity-50`}>{config?.label ?? 'creator'}</span>
              </div>
              <div className="bg-obsidian p-5 flex items-center gap-4">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-bone/20" />
                ) : (
                  <div className="w-16 h-16 rounded-full border-2 border-bone/20 bg-bone/5 flex items-center justify-center">
                    <span className="font-basement text-2xl text-bone/40">{(name || 'Y')[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="text-left flex-1 min-w-0">
                  <div className="font-basement text-[20px] uppercase text-bone leading-none truncate">{name || 'unnamed'}</div>
                  <div className="font-mono text-[11px] text-bone/50 mt-1">@{username}</div>
                  {roleTags.length > 0 && (
                    <div className="font-mono text-[9px] uppercase tracking-[2px] text-bone/30 mt-1.5 truncate">
                      {roleTags.slice(0, 3).join(' · ')}{roleTags.length > 3 && ` +${roleTags.length - 3}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {phase >= 4 && (
            <div
              className="mt-10 flex items-center justify-center gap-4"
              style={{ opacity: 0, animation: 'fadeUp 0.7s ease forwards' }}
            >
              {username && (
                <Link
                  href={`/profile/${username}`}
                  className={`font-basement font-black text-[clamp(20px,3vw,32px)] uppercase ${accentBg} ${accentTextOn} px-6 py-3 hover:opacity-90 transition-opacity no-underline`}
                >
                  view your profile →
                </Link>
              )}
              <Link
                href="/worlds"
                className="font-mono text-[12px] uppercase tracking-[2px] text-bone/50 hover:text-bone transition-colors no-underline border border-bone/20 hover:border-bone/50 px-4 py-2.5"
              >
                explore worlds
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* bottom accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}40, ${accent}, ${accent}40, transparent)` }}
      />
    </div>
  );
}
