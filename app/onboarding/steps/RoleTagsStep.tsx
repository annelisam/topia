'use client';

import { useEffect, useState } from 'react';
import StepShell from '../StepShell';
import { PathConfig } from '../../components/profile/pathConfig';
import { roleLabelToSlug, roleSlugToLabel } from '../../../lib/profile/roleTags';
import { ROLE_TAGS as EVENT_ROLE_TAGS, ROLES_MAX } from '../../../lib/events/questions';
import RoleTagPicker from '../../components/RoleTagPicker';

interface Props {
  step: number;
  total: number;
  config: PathConfig | null;
  initialValue: string[];
  onBack: () => void;
  onAdvance: (roleTags: string[]) => void;
}

export default function RoleTagsStep({ step, total, config, initialValue, onBack, onAdvance }: Props) {
  const [selected, setSelected] = useState<string[]>(initialValue);
  const [error, setError] = useState('');

  // Pre-select the user's saved tags once the profile hydrates (the initial
  // value arrives async, after mount, so useState's initializer misses it).
  useEffect(() => {
    setSelected(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue.join(',')]);

  function submit() {
    if (selected.length === 0) { setError('pick at least one — these power your discovery.'); return; }
    onAdvance(selected);
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Enter') submit();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <StepShell
      step={step}
      total={total}
      config={config}
      kicker={`${String(step).padStart(2, '0')} · what do you do`}
      heading="Tag your craft."
      hint={`${selected.length}/${ROLES_MAX} selected · press enter ↵`}
      onBack={onBack}
    >
      <p className="font-mono text-[11px] text-ink/40 mb-5 max-w-md">search for what fits, or add your own — up to {ROLES_MAX}. you can fine-tune anytime.</p>
      <RoleTagPicker
        options={EVENT_ROLE_TAGS}
        value={selected.map(roleSlugToLabel)}
        onChange={(labels) => { setSelected(labels.map(roleLabelToSlug)); if (error) setError(''); }}
      />
      {error && (
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[2px] text-pink/80">{error}</div>
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
