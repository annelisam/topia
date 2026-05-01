'use client';

import { PathConfig, UserPath } from './pathConfig';

interface Props {
  config: PathConfig;
  path: UserPath;
  stats: { worlds: number; events: number; collabs: number; followers: number; projectsCompleted?: number; responseTime?: string };
}

export default function ProofLayer({ config, path, stats }: Props) {
  const cards = path === 'worldbuilder'
    ? [
        { label: 'Worlds Created', value: stats.worlds },
        { label: 'Events Hosted', value: stats.events },
        { label: 'Collabs', value: stats.collabs },
        { label: 'Followers', value: stats.followers },
      ]
    : path === 'catalyst'
    ? [
        { label: 'Projects Completed', value: stats.projectsCompleted ?? 0 },
        { label: 'Response Time', value: stats.responseTime ?? 'N/A' },
        { label: 'Worlds Worked In', value: stats.worlds },
        { label: 'Collabs', value: stats.collabs },
      ]
    : [
        { label: 'Worlds Visited', value: stats.worlds },
        { label: 'Events Attended', value: stats.events },
        { label: 'Collabs Supported', value: stats.collabs },
        { label: 'Followers', value: stats.followers },
      ];

  return (
    <div className="bg-obsidian flex flex-col h-full overflow-y-auto">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Proof Layer</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>auto-populated</span>
      </div>

      <div className="grid grid-cols-2 gap-[1px] p-4">
        {cards.map((stat) => (
          <div key={stat.label} className="bg-obsidian border border-bone/[0.06] rounded-sm p-4 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-[24px] md:text-[32px] font-bold text-bone leading-none">{stat.value}</span>
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 mt-2">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="px-4 pb-3 flex items-center gap-3">
        <div className="flex-1 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${config.hex}30, ${config.hex}60, ${config.hex}30, transparent)` }} />
        <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/15">topia://proof</span>
      </div>
    </div>
  );
}
