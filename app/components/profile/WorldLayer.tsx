'use client';

import { PathConfig } from './pathConfig';

interface Props {
  config: PathConfig;
  influences?: string[];
  feelsLike?: string[];
  currentlyBuilding?: string;
  currentlyInto?: string[];
}

export default function WorldLayer({ config, influences = [], feelsLike = [], currentlyBuilding = '', currentlyInto = [] }: Props) {
  const fields = [
    { label: 'influences', type: 'tags' as const, data: influences },
    { label: 'feels like', type: 'tags' as const, data: feelsLike },
    { label: 'currently building', type: 'text' as const, data: currentlyBuilding },
    { label: 'currently into', type: 'tags' as const, data: currentlyInto },
  ];

  return (
    <div className="relative bg-obsidian overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(245,240,232,1) 47px, rgba(245,240,232,1) 48px)' }} />
      <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-bone/[0.06] pointer-events-none z-[1]" />

      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between relative z-10`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>World Layer</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>topia://world</span>
      </div>

      <div className="relative z-10">
        {fields.map((field, i) => {
          const isEmpty = field.type === 'tags' ? (field.data as string[]).length === 0 : !field.data;
          return (
            <div key={field.label} className="flex items-start border-b border-bone/[0.04]" style={{ minHeight: '48px' }}>
              <div className="w-[28px] shrink-0 flex items-center justify-center pt-3">
                <span className="font-mono text-[9px] text-bone/15">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="w-[2px] shrink-0 self-stretch" style={{ backgroundColor: config.hex }} />
              <div className="flex-1 px-3 py-3 min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block mb-1.5">{field.label}</span>
                {isEmpty ? (
                  <span className="font-mono text-[11px] text-bone/20 italic">Not yet declared</span>
                ) : field.type === 'tags' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(field.data as string[]).map((tag) => (
                      <span key={tag} className="font-mono text-[10px] text-bone/50 border border-bone/[0.08] rounded-full px-2 py-0.5 whitespace-nowrap">{tag}</span>
                    ))}
                  </div>
                ) : (
                  <span className="font-zirkon text-[12px] text-bone/50 leading-relaxed block">{field.data as string}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
