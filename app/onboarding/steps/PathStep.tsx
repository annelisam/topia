'use client';

import { useEffect, useState } from 'react';
import StepShell from '../StepShell';
import { PATH_CONFIG, PATH_DEFAULT_ROLES, PathConfig, UserPath } from '../../components/profile/pathConfig';

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  initialValue: UserPath | '';
  onBack: () => void;
  onAdvance: (path: UserPath, seedRoles: string[]) => void;
}

const PATH_OPTIONS: { id: UserPath; icon: string; tagline: string; blurb: string }[] = [
  { id: 'worldbuilder', icon: '◆', tagline: 'I build worlds.',         blurb: 'create your own ecosystem on TOPIA. host events, gather a community, run the room.' },
  { id: 'catalyst',     icon: '⬡', tagline: 'I shape worlds.',         blurb: 'lend your craft to worlds being built. design, produce, build, ship — get paid.' },
  { id: 'anchor',       icon: '◎', tagline: 'I move through worlds.',  blurb: 'explore, support, and discover. follow your favorite worlds, attend events, find your scene.' },
];

export default function PathStep({ step, total, config, initialValue, onBack, onAdvance }: Props) {
  const [selected, setSelected] = useState<UserPath | ''>(initialValue);
  const [animatingOut, setAnimatingOut] = useState<UserPath | null>(null);

  function pick(p: UserPath) {
    if (animatingOut) return;
    setSelected(p);
    setAnimatingOut(p);
    setTimeout(() => onAdvance(p, PATH_DEFAULT_ROLES[p]), 600);
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Enter' && selected && !animatingOut) {
        pick(selected as UserPath);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, animatingOut]);

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · pick your path`}
      heading="How do you show up?"
      hint={selected ? 'press enter ↵ to confirm' : 'choose one'}
      onBack={onBack}
      className={animatingOut ? `transition-colors duration-500` : ''}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PATH_OPTIONS.map((opt) => {
          const cfg = PATH_CONFIG[opt.id];
          const isSelected = selected === opt.id;
          const isAnimating = animatingOut === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => pick(opt.id)}
              className={`group text-left p-5 border transition-all cursor-pointer bg-transparent ${
                isSelected
                  ? `${cfg.bg} ${cfg.textOn} border-transparent`
                  : 'border-bone/15 text-bone hover:border-bone/40 hover:bg-bone/[0.03]'
              } ${isAnimating ? 'scale-[1.02]' : ''}`}
              style={{
                transitionDuration: '300ms',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-basement font-black text-[28px] leading-none ${isSelected ? cfg.textOn : 'text-bone/40'}`}>
                  {opt.icon}
                </span>
                <span className={`font-mono text-[10px] uppercase tracking-[2px] ${isSelected ? `${cfg.textOn} opacity-60` : 'text-bone/25'}`}>
                  {cfg.label}
                </span>
              </div>
              <div className={`font-basement font-black text-[clamp(18px,1.8vw,22px)] uppercase leading-[0.95] mb-2 ${isSelected ? cfg.textOn : 'text-bone'}`}>
                {opt.tagline}
              </div>
              <p className={`font-mono text-[11px] leading-relaxed ${isSelected ? `${cfg.textOn} opacity-75` : 'text-bone/40'}`}>
                {opt.blurb}
              </p>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
