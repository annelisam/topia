'use client';

import { useEffect, useRef, useState } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';
import { sanitizeUsername, useUsernameAvailability } from '../usernameAvailability';

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  privyId: string;
  initialValue: string;
  onBack: () => void;
  onAdvance: (username: string) => void;
}

export default function UsernameStep({ step, total, config, privyId, initialValue, onBack, onAdvance }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const availability = useUsernameAvailability(value, privyId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 700);
    return () => clearTimeout(t);
  }, []);

  const statusLabel: Record<typeof availability, { text: string; color: string }> = {
    idle:      { text: '',                          color: 'text-bone/30' },
    checking:  { text: 'checking…',                 color: 'text-bone/40' },
    available: { text: '✓ available',               color: 'text-green' },
    taken:     { text: '✗ taken',                   color: 'text-pink' },
    invalid:   { text: '3–30 chars · a–z 0–9 _',    color: 'text-bone/40' },
  };

  function submit() {
    if (!value) { setError('pick a handle.'); return; }
    if (availability === 'taken')   { setError('that one\'s already taken.'); return; }
    if (availability === 'invalid') { setError('handles use a–z, 0–9, underscores. 3–30 chars.'); return; }
    if (availability === 'checking') { setError('hang on — still checking…'); return; }
    if (availability !== 'available' && value !== initialValue) { setError('hang on — still checking…'); return; }
    onAdvance(value);
  }

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · pick a handle`}
      heading="Choose your @handle."
      hint="press enter ↵ to continue"
      onBack={onBack}
    >
      <div className="flex items-baseline gap-1 border-b-2 border-bone/20 focus-within:border-bone/60 transition-colors">
        <span className="font-basement font-black text-[clamp(28px,5vw,44px)] text-bone/30">@</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { setValue(sanitizeUsername(e.target.value)); if (error) setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="yourname"
          className="flex-1 bg-transparent font-basement font-black text-[clamp(28px,5vw,44px)] lowercase text-bone placeholder:text-bone/15 px-1 py-3 outline-none border-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className={`mt-3 font-mono text-[11px] uppercase tracking-[2px] ${statusLabel[availability].color} h-4`}>
        {statusLabel[availability].text}
      </div>
      {error && (
        <div className="mt-1 font-mono text-[11px] uppercase tracking-[2px] text-pink/80">{error}</div>
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
