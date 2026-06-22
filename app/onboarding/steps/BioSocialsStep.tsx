'use client';

import { useEffect, useRef, useState } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';
import SocialConnect, { ENABLED_SOCIAL_PROVIDERS, type SocialProvider } from '../../components/SocialConnect';

interface Socials {
  socialWebsite: string;
  socialTwitter: string;
  socialInstagram: string;
  socialSoundcloud: string;
  socialSpotify: string;
  socialLinkedin: string;
  socialSubstack: string;
  socialFarcaster: string;
}

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  initialBio: string;
  initialSocials: Socials;
  onBack: () => void;
  onAdvance: (patch: { bio: string } & Socials) => void;
  /** Persist current draft state before Privy's OAuth redirect, so it survives the round-trip. */
  saveDraft?: (patch: { bio: string } & Socials) => Promise<void>;
}

export default function BioSocialsStep({ step, total, config, initialBio, initialSocials, onBack, onAdvance, saveDraft }: Props) {
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
    { key: 'socialSoundcloud', label: 'SC',    placeholder: 'soundcloud.com/handle' },
    { key: 'socialSubstack',   label: 'SUB',   placeholder: 'handle.substack.com' },
  ];

  const accentHex = config?.hex ?? '#e4fe52';

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
        className="w-full bg-transparent border-b-2 border-ink/20 focus:border-ink/60 font-zirkon text-[clamp(16px,1.8vw,20px)] italic text-ink placeholder:text-ink/15 px-1 py-3 outline-none transition-colors resize-none"
        maxLength={280}
      />
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[2px] text-ink/25 text-right">{bio.length}/280</div>

      {ENABLED_SOCIAL_PROVIDERS.length > 0 && (
        <div className="mt-8">
          <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/30 block mb-3">connected profiles</span>
          <div className="space-y-1">
            {([
              { p: 'twitter'   as const, key: 'socialTwitter'   as const },
              { p: 'instagram' as const, key: 'socialInstagram' as const },
              { p: 'linkedin'  as const, key: 'socialLinkedin'  as const },
              { p: 'spotify'   as const, key: 'socialSpotify'   as const },
              { p: 'farcaster' as const, key: 'socialFarcaster' as const },
            ] satisfies { p: SocialProvider; key: keyof Socials }[])
              .filter(({ p }) => ENABLED_SOCIAL_PROVIDERS.includes(p))
              .map(({ p, key }) => (
                <SocialConnect
                  key={p}
                  provider={p}
                  value={socials[key]}
                  onChange={(url) => setSocial(key, url)}
                  accent={accentHex}
                  onBeforeConnect={saveDraft ? () => saveDraft({ bio, ...socials }) : undefined}
                />
              ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/30 block mb-3">other links</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} className="flex items-center gap-2 border-b border-ink/10 focus-within:border-ink/40 py-1.5 transition-colors">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-ink/30 w-12 shrink-0">{label}</span>
              <input
                type="url"
                value={socials[key]}
                onChange={(e) => setSocial(key, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder={placeholder}
                className="flex-1 bg-transparent font-mono text-[12px] text-ink placeholder:text-ink/15 outline-none border-none"
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
          className="font-mono text-[12px] uppercase tracking-[2px] text-ink/70 hover:text-ink transition-colors bg-transparent border border-ink/30 hover:border-ink/70 px-4 py-2 cursor-pointer"
        >
          continue →
        </button>
        <button
          onClick={submit}
          className="font-mono text-[10px] uppercase tracking-[2px] text-ink/30 hover:text-ink/60 transition-colors bg-transparent border-none cursor-pointer"
        >
          skip for now
        </button>
      </div>
    </StepShell>
  );
}
