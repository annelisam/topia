'use client';

import { useEffect, useRef, useState } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  initialValue: string;
  onBack: () => void;
  onAdvance: (name: string) => void;
}

export default function NameStep({ step, total, config, initialValue, onBack, onAdvance }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 700);
    return () => clearTimeout(t);
  }, []);

  function submit() {
    const trimmed = value.trim();
    if (trimmed.length < 1) { setError('what should we call you?'); return; }
    if (trimmed.length > 60) { setError('a little shorter — 60 chars max.'); return; }
    onAdvance(trimmed);
  }

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · who are you`}
      heading="What's your name?"
      hint="press enter ↵ to continue"
      onBack={onBack}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value); if (error) setError(''); }}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder="your display name"
        className="w-full bg-transparent border-b-2 border-bone/20 focus:border-bone/60 font-basement font-black text-[clamp(28px,5vw,44px)] uppercase text-bone placeholder:text-bone/15 px-1 py-3 outline-none transition-colors"
        autoComplete="off"
        spellCheck={false}
      />
      {error && (
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[2px] text-pink/80">{error}</div>
      )}
      <div className="mt-6">
        <button
          onClick={submit}
          className="font-mono text-[12px] uppercase tracking-[2px] text-bone/70 hover:text-bone transition-colors bg-transparent border border-bone/30 hover:border-bone/70 px-4 py-2 cursor-pointer"
        >
          continue →
        </button>
      </div>
    </StepShell>
  );
}
