'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import GlitchType from './components/ui/GlitchType';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (ready && authenticated) {
      router.replace('/worlds');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2100),
      setTimeout(() => setPhase(5), 2800),
      setTimeout(() => setPhase(6), 3500),
      setTimeout(() => setPhase(7), 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!ready || authenticated) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--accent, #e4fe52)' }}
    >
      {/* Chrome star logo video — center, dominant */}
      <div className="absolute inset-0 flex items-center justify-center z-[2]">
        <video
          src="/brand/star-sequence.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-[clamp(300px,50vw,700px)] h-auto mix-blend-multiply"
        />
      </div>

      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-[3]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px',
        }}
      />

      {/* Top-left cluster */}
      <div className="absolute top-6 left-6 md:top-10 md:left-10 z-[10]">
        {phase >= 1 && (
          <div className="font-mono text-[9px] md:text-[11px] text-[#1a1a1a]/70 uppercase tracking-[2px]">
            <GlitchType text="a creator engine" speed={30} />
          </div>
        )}
        {phase >= 2 && (
          <div className="font-mono text-[9px] md:text-[11px] text-[#1a1a1a]/50 uppercase tracking-[2px] mt-0.5">
            <GlitchType text="for artists, by artists" speed={25} />
          </div>
        )}
        {phase >= 1 && (
          <div className="font-basement font-black text-[clamp(24px,3vw,36px)] text-[#1a1a1a] uppercase leading-none mt-3">
            <GlitchType text="TOPIA" speed={80} />
          </div>
        )}
      </div>

      {/* Top-right cluster */}
      <div className="absolute top-6 right-6 md:top-10 md:right-10 text-right z-[10]">
        {phase >= 2 && (
          <div className="font-mono text-[8px] md:text-[10px] text-[#1a1a1a]/50 uppercase tracking-[2px]">
            <GlitchType text="culture first." speed={30} />
          </div>
        )}
        {phase >= 3 && (
          <div className="font-mono text-[8px] md:text-[10px] text-[#1a1a1a]/50 uppercase tracking-[2px] mt-0.5">
            <GlitchType text="systems second." speed={30} />
          </div>
        )}
        {phase >= 4 && (
          <div className="font-mono text-[8px] md:text-[10px] text-[#1a1a1a]/70 uppercase tracking-[2px] mt-0.5 font-bold">
            <GlitchType text="ownership always." speed={25} />
          </div>
        )}
      </div>

      {/* Asterisk — top center */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[10]">
        <span className="text-[#1a1a1a]/30 text-[20px] md:text-[28px]">※</span>
      </div>

      {/* Center text — overlaps with star video */}
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 text-center z-[4]">
        {phase >= 5 && (
          <div className="font-mono text-[10px] md:text-[13px] text-[#1a1a1a]/60 uppercase tracking-[3px]">
            <GlitchType text="build your world." speed={30} />
          </div>
        )}
      </div>

      {/* Mid-left — scattered metadata */}
      <div className="absolute left-6 md:left-10 top-[55%] z-[10]">
        {phase >= 4 && (
          <div className="font-mono text-[8px] text-[#1a1a1a]/40 uppercase tracking-[2px]">
            <GlitchType text="ecosystem" speed={35} />
          </div>
        )}
        {phase >= 4 && (
          <div className="font-mono text-[8px] text-[#1a1a1a]/40 uppercase tracking-[2px] mt-0.5">
            <GlitchType text="tools" speed={35} />
          </div>
        )}
        {phase >= 4 && (
          <div className="font-mono text-[8px] text-[#1a1a1a]/40 uppercase tracking-[2px] mt-0.5">
            <GlitchType text="community" speed={35} />
          </div>
        )}
      </div>

      {/* Mid-right — date and version */}
      <div className="absolute right-6 md:right-10 top-[55%] text-right z-[10]">
        {phase >= 3 && (
          <div className="font-mono text-[8px] text-[#1a1a1a]/40 uppercase tracking-[2px]">
            <GlitchType text="2026" speed={50} />
          </div>
        )}
        {phase >= 3 && (
          <div className="font-mono text-[8px] text-[#1a1a1a]/40 uppercase tracking-[2px] mt-0.5">
            <GlitchType text="v2.0" speed={50} />
          </div>
        )}
      </div>

      {/* BOTTOM — massive ENTER TOPIA */}
      <div
        className={`absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 z-[10] transition-all duration-1000 ${
          phase >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Tagline */}
        <div className="flex justify-between items-end mb-2">
          <span className="font-mono text-[8px] text-[#1a1a1a]/40 uppercase tracking-[2px]">
            culture before tech.
          </span>
          <span className="font-mono text-[8px] text-[#1a1a1a]/40 uppercase tracking-[2px]">
            depth before data.
          </span>
        </div>

        {/* Big CTA */}
        <Link href="/worlds" className="group block no-underline">
          <div className="flex items-baseline justify-between">
            <span className="font-basement font-black text-[clamp(48px,10vw,120px)] uppercase text-[#1a1a1a] leading-none group-hover:text-bone transition-colors duration-300">
              {phase >= 7 ? <GlitchType text="ENTER TOPIA" speed={50} /> : ''}
            </span>
            <span className="font-mono text-[#1a1a1a]/50 group-hover:text-bone/60 transition-colors duration-300 text-[clamp(24px,4vw,48px)]">
              →
            </span>
          </div>
          {/* Progress line */}
          <div className="mt-3 h-[2px] bg-[#1a1a1a]/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-[#1a1a1a]/40 rounded-full transition-all ease-out ${
                phase >= 7 ? 'w-full duration-[1500ms]' : 'w-0'
              }`}
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
