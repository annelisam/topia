'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';
import { sanitizeUsername, useUsernameAvailability } from '../usernameAvailability';
import { CheckIcon } from '../../components/ui/Icons';

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  privyId: string;
  initialName: string;
  initialUsername: string;
  onBack: () => void;
  onAdvance: (patch: { name: string; username: string }) => void;
}

// Name + @handle on one screen — the whole written identity in a single step,
// so a new member can get through signup in seconds.
export default function IdentityStep({ step, total, config, privyId, initialName, initialUsername, onBack, onAdvance }: Props) {
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [error, setError] = useState('');
  const availability = useUsernameAvailability(username, privyId);
  const nameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 700);
    return () => clearTimeout(t);
  }, []);

  const statusLabel: Record<typeof availability, { text: ReactNode; color: string }> = {
    idle:      { text: '',                                                                                            color: 'text-ink/30' },
    checking:  { text: 'checking…',                                                                                   color: 'text-ink/40' },
    available: { text: (<span className="inline-flex items-center gap-1.5"><CheckIcon size={10} /> available</span>), color: 'text-green' },
    taken:     { text: '✗ taken',                                                                                     color: 'text-pink' },
    invalid:   { text: '3–30 chars · a–z 0–9 _',                                                                      color: 'text-ink/40' },
  };

  function submit() {
    const trimmed = name.trim();
    if (trimmed.length < 1) { setError('what should we call you?'); nameRef.current?.focus(); return; }
    if (trimmed.length > 60) { setError('a little shorter — 60 chars max.'); nameRef.current?.focus(); return; }
    if (!username) { setError('pick a handle.'); usernameRef.current?.focus(); return; }
    if (availability === 'taken')   { setError('that one\'s already taken.'); return; }
    if (availability === 'invalid') { setError('handles use a–z, 0–9, underscores. 3–30 chars.'); return; }
    if (availability === 'checking') { setError('hang on — still checking…'); return; }
    if (availability !== 'available' && username !== initialUsername) { setError('hang on — still checking…'); return; }
    onAdvance({ name: trimmed, username });
  }

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · who are you`}
      heading="Claim your identity."
      hint="press enter ↵ to continue"
      onBack={onBack}
    >
      <label className="block font-mono text-[11px] uppercase tracking-[2px] text-ink/40 mb-1">your name</label>
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
        onKeyDown={(e) => { if (e.key === 'Enter') usernameRef.current?.focus(); }}
        placeholder="your display name"
        className="w-full bg-transparent border-b-2 border-ink/20 focus:border-ink/60 font-basement font-black text-[clamp(22px,4vw,36px)] uppercase text-ink placeholder:text-ink/15 px-1 py-2.5 outline-none transition-colors"
        autoComplete="off"
        spellCheck={false}
      />

      <label className="block font-mono text-[11px] uppercase tracking-[2px] text-ink/40 mt-8 mb-1">your @handle</label>
      <div className="flex items-baseline gap-1 border-b-2 border-ink/20 focus-within:border-ink/60 transition-colors">
        <span className="font-basement font-black text-[clamp(22px,4vw,36px)] text-ink/30">@</span>
        <input
          ref={usernameRef}
          type="text"
          value={username}
          onChange={(e) => { setUsername(sanitizeUsername(e.target.value)); if (error) setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="yourname"
          className="flex-1 bg-transparent font-basement font-black text-[clamp(22px,4vw,36px)] lowercase text-ink placeholder:text-ink/15 px-1 py-2.5 outline-none border-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className={`mt-2 font-mono text-[11px] uppercase tracking-[2px] ${statusLabel[availability].color} h-4`}>
        {statusLabel[availability].text}
      </div>
      {error && (
        <div className="mt-1 font-mono text-[11px] uppercase tracking-[2px] text-pink/80">{error}</div>
      )}
      <div className="mt-6">
        <button
          onClick={submit}
          className="font-mono text-[12px] uppercase tracking-[2px] text-ink/70 hover:text-ink transition-colors bg-transparent border border-ink/30 hover:border-ink/70 px-4 py-2 cursor-pointer"
        >
          continue →
        </button>
      </div>
    </StepShell>
  );
}
