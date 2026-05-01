'use client';

import { useEffect, useRef, useState } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';

interface Socials {
  socialWebsite: string;
  socialTwitter: string;
  socialInstagram: string;
  socialSoundcloud: string;
  socialSpotify: string;
  socialLinkedin: string;
  socialSubstack: string;
}

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  initialBio: string;
  initialSocials: Socials;
  onBack: () => void;
  onAdvance: (patch: { bio: string } & Socials) => void;
}

export default function BioSocialsStep({ step, total, config, initialBio, initialSocials, onBack, onAdvance }: Props) {
  const [bio, setBio] = useState(initialBio);
  const [socials, setSocials] = useState<Socials>(initialSocials);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => bioRef.current?.focus(), 700);
    return () => clearTimeout(t);
  }, []);

  function setSocial(k: keyof Socials, v: string) {
    setSocials((s) => ({ ...s, [k]: v }));
  }

  function submit() {
    onAdvance({ bio, ...socials });
  }

  const SOCIAL_FIELDS: { key: keyof Socials; label: string; placeholder: string }[] = [
    { key: 'socialWebsite',    label: 'WEB',   placeholder: 'yoursite.com' },
    { key: 'socialTwitter',    label: 'X',     placeholder: 'x.com/handle' },
    { key: 'socialInstagram',  label: 'IG',    placeholder: 'instagram.com/handle' },
    { key: 'socialSoundcloud', label: 'SC',    placeholder: 'soundcloud.com/handle' },
    { key: 'socialSpotify',    label: 'SPOT',  placeholder: 'open.spotify.com/...' },
    { key: 'socialLinkedin',   label: 'LI',    placeholder: 'linkedin.com/in/handle' },
    { key: 'socialSubstack',   label: 'SUB',   placeholder: 'handle.substack.com' },
  ];

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · your story · optional`}
      heading="Say something."
      hint="all optional · press enter ↵ when done"
      onBack={onBack}
    >
      <textarea
        ref={bioRef}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
        placeholder="one sentence about what you make, why you're here…"
        rows={3}
        className="w-full bg-transparent border-b-2 border-bone/20 focus:border-bone/60 font-zirkon text-[clamp(16px,1.8vw,20px)] italic text-bone placeholder:text-bone/15 px-1 py-3 outline-none transition-colors resize-none"
        maxLength={280}
      />
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[2px] text-bone/25 text-right">{bio.length}/280</div>

      <div className="mt-8">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/30 block mb-3">links</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} className="flex items-center gap-2 border-b border-bone/10 focus-within:border-bone/40 py-1.5 transition-colors">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 w-12 shrink-0">{label}</span>
              <input
                type="url"
                value={socials[key]}
                onChange={(e) => setSocial(key, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder={placeholder}
                className="flex-1 bg-transparent font-mono text-[12px] text-bone placeholder:text-bone/15 outline-none border-none"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={submit}
          className="font-mono text-[12px] uppercase tracking-[2px] text-bone/70 hover:text-bone transition-colors bg-transparent border border-bone/30 hover:border-bone/70 px-4 py-2 cursor-pointer"
        >
          continue →
        </button>
        <button
          onClick={submit}
          className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 hover:text-bone/60 transition-colors bg-transparent border-none cursor-pointer"
        >
          skip for now
        </button>
      </div>
    </StepShell>
  );
}
