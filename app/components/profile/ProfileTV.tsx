'use client';

import { PathConfig } from './pathConfig';

const EPISODES = [
  { title: 'WORLD TOUR EP.01', duration: '12:34', status: 'NEW' },
  { title: 'BEHIND THE BUILD', duration: '8:22', status: 'LIVE' },
  { title: 'SOUND SYSTEM MIX', duration: '45:10', status: 'ARCHIVE' },
  { title: 'COMMUNITY CALL #7', duration: '32:00', status: 'COMING SOON' },
];

interface Props {
  config: PathConfig;
  handle: string;
}

export default function ProfileTV({ config, handle }: Props) {
  return (
    <div className="bg-obsidian flex flex-col overflow-hidden h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between relative z-10`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>{handle} TV</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>personal channel</span>
      </div>

      <div className="relative flex-1 min-h-0">
        <video src="/brand/vhs-loop.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 pointer-events-none z-[2] opacity-[0.05]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,240,232,0.3) 2px, rgba(245,240,232,0.3) 4px)' }} />
        <div className="absolute inset-0 pointer-events-none z-[3]" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)' }} />

        <div className="absolute top-4 right-4 z-[5]">
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/40 border border-bone/[0.08] px-2 py-1 rounded-sm bg-obsidian/60 backdrop-blur-sm">Coming Soon</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-[4] bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/90 to-transparent p-4">
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block mb-3">episode guide</span>
          <div className="grid grid-cols-2 gap-2">
            {EPISODES.map((ep) => (
              <div key={ep.title} className="border border-bone/[0.06] rounded-sm p-2.5 bg-obsidian/40 backdrop-blur-sm hover:bg-bone/[0.03] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${ep.status === 'LIVE' ? 'bg-lime/20 text-lime' : ep.status === 'NEW' ? 'text-blue border border-blue/30' : 'text-bone/25 border border-bone/[0.08]'}`}>{ep.status}</span>
                  <span className="font-mono text-[9px] text-bone/25">{ep.duration}</span>
                </div>
                <span className="font-mono text-[10px] text-bone/50 font-bold uppercase block truncate">{ep.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
