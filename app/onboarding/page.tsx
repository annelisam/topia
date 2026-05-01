'use client';

import { Suspense, useEffect, useReducer, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { PATH_CONFIG, UserPath } from '../components/profile/pathConfig';
import WelcomeStep from './steps/WelcomeStep';
import NameStep from './steps/NameStep';
import UsernameStep from './steps/UsernameStep';
import AvatarStep from './steps/AvatarStep';
import PathStep from './steps/PathStep';
import RoleTagsStep from './steps/RoleTagsStep';
import BioSocialsStep from './steps/BioSocialsStep';
import ToolsStep from './steps/ToolsStep';
import DoneStep from './steps/DoneStep';

/* ── Wizard state ─────────────────────────────────────────────── */

export interface WizardData {
  name: string;
  username: string;
  avatarUrl: string;
  path: UserPath | '';
  roleTags: string[];
  bio: string;
  socialWebsite: string;
  socialTwitter: string;
  socialInstagram: string;
  socialSoundcloud: string;
  socialSpotify: string;
  socialLinkedin: string;
  socialSubstack: string;
  toolSlugs: string[];
}

const EMPTY_DATA: WizardData = {
  name: '',
  username: '',
  avatarUrl: '',
  path: '',
  roleTags: [],
  bio: '',
  socialWebsite: '',
  socialTwitter: '',
  socialInstagram: '',
  socialSoundcloud: '',
  socialSpotify: '',
  socialLinkedin: '',
  socialSubstack: '',
  toolSlugs: [],
};

type State = {
  step: number;
  data: WizardData;
  saving: boolean;
};

type Action =
  | { type: 'PATCH'; patch: Partial<WizardData> }
  | { type: 'GO'; step: number }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SAVING'; saving: boolean }
  | { type: 'HYDRATE'; data: Partial<WizardData>; step: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PATCH':   return { ...state, data: { ...state.data, ...action.patch } };
    case 'GO':      return { ...state, step: action.step };
    case 'NEXT':    return { ...state, step: state.step + 1 };
    case 'BACK':    return { ...state, step: Math.max(0, state.step - 1) };
    case 'SAVING':  return { ...state, saving: action.saving };
    case 'HYDRATE': return { ...state, data: { ...state.data, ...action.data }, step: action.step };
    default:        return state;
  }
}

/* ── Step manifest ────────────────────────────────────────────── */

const STEPS = [
  'welcome',
  'name',
  'username',
  'avatar',
  'path',
  'roles',
  'bio',
  'tools',
  'done',
] as const;

const TOTAL_STEPS = STEPS.length - 1; // welcome + done are bookends; "progress" runs over input steps

/* ── First-incomplete-step resume logic ───────────────────────── */

function firstIncompleteStep(data: Partial<WizardData>): number {
  if (!data.name) return 1;
  if (!data.username) return 2;
  if (!data.avatarUrl) return 3;
  if (!data.path) return 4;
  if (!data.roleTags || data.roleTags.length === 0) return 5;
  // bio + socials + tools are optional — jump to done
  return STEPS.length - 1;
}

/* ── Page component ───────────────────────────────────────────── */

function LoadingFrame() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian text-bone">
      <span className="font-mono text-[11px] uppercase tracking-[3px] text-bone/40">loading…</span>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingFrame />}>
      <OnboardingWizard />
    </Suspense>
  );
}

function OnboardingWizard() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, dispatch] = useReducer(reducer, { step: 0, data: EMPTY_DATA, saving: false });
  const [hydrated, setHydrated] = useState(false);

  /* Redirect to home if not authenticated */
  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/');
    }
  }, [ready, authenticated, router]);

  /* Hydrate from existing profile */
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then(({ user: saved }) => {
        if (!saved) {
          setHydrated(true);
          return;
        }
        const partial: Partial<WizardData> = {
          name: saved.name ?? '',
          username: saved.username ?? '',
          avatarUrl: saved.avatarUrl ?? '',
          path: (saved.path ?? '') as WizardData['path'],
          roleTags: saved.roleTags ? saved.roleTags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          bio: saved.bio ?? '',
          socialWebsite: saved.socialWebsite ?? '',
          socialTwitter: saved.socialTwitter ?? '',
          socialInstagram: saved.socialInstagram ?? '',
          socialSoundcloud: saved.socialSoundcloud ?? '',
          socialSpotify: saved.socialSpotify ?? '',
          socialLinkedin: saved.socialLinkedin ?? '',
          socialSubstack: saved.socialSubstack ?? '',
          toolSlugs: saved.toolSlugs ? saved.toolSlugs.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        };
        // ?from=profile means user clicked "Redo intro" — start at welcome no matter what
        const fromProfile = searchParams?.get('from') === 'profile';
        const initialStep = fromProfile ? 0 : firstIncompleteStep(partial);
        dispatch({ type: 'HYDRATE', data: partial, step: initialStep });
      })
      .catch(console.error)
      .finally(() => setHydrated(true));
  }, [ready, authenticated, user, searchParams]);

  /* Save partial diff to API */
  const saveDiff = useCallback(async (patch: Partial<WizardData>) => {
    if (!user) return;
    dispatch({ type: 'SAVING', saving: true });
    try {
      const body: Record<string, unknown> = { privyId: user.id };
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'roleTags' || k === 'toolSlugs') {
          body[k] = (v as string[]).join(',') || null;
        } else {
          body[k] = v;
        }
      }
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } finally {
      dispatch({ type: 'SAVING', saving: false });
    }
  }, [user]);

  const advance = useCallback(async (patch: Partial<WizardData>) => {
    dispatch({ type: 'PATCH', patch });
    await saveDiff(patch);
    dispatch({ type: 'NEXT' });
  }, [saveDiff]);

  const back = useCallback(() => dispatch({ type: 'BACK' }), []);

  /* Loading frame while we figure out where to send the user */
  if (!ready || !authenticated || !hydrated) {
    return <LoadingFrame />;
  }

  const current = STEPS[state.step];
  const config = state.data.path ? PATH_CONFIG[state.data.path as UserPath] : null;
  const stepNumber = state.step; // 0 for welcome, 1-7 input, 8 done
  const inputStepNumber = Math.max(0, Math.min(stepNumber, TOTAL_STEPS));

  /* Step routing */
  return (
    <div key={current} className="min-h-screen bg-obsidian">
      {current === 'welcome' && (
        <WelcomeStep
          onAdvance={() => dispatch({ type: 'NEXT' })}
          name={user?.email?.address ?? user?.google?.name ?? 'creator'}
        />
      )}
      {current === 'name' && (
        <NameStep
          step={inputStepNumber}
          total={TOTAL_STEPS}
          config={config}
          initialValue={state.data.name}
          onBack={back}
          onAdvance={(name) => advance({ name })}
        />
      )}
      {current === 'username' && (
        <UsernameStep
          step={inputStepNumber}
          total={TOTAL_STEPS}
          config={config}
          privyId={user?.id ?? ''}
          initialValue={state.data.username}
          onBack={back}
          onAdvance={(username) => advance({ username })}
        />
      )}
      {current === 'avatar' && (
        <AvatarStep
          step={inputStepNumber}
          total={TOTAL_STEPS}
          config={config}
          initialValue={state.data.avatarUrl}
          fallbackName={state.data.name || 'You'}
          onBack={back}
          onAdvance={(avatarUrl) => advance({ avatarUrl })}
        />
      )}
      {current === 'path' && (
        <PathStep
          step={inputStepNumber}
          total={TOTAL_STEPS}
          config={config}
          initialValue={state.data.path}
          onBack={back}
          onAdvance={(path, seedRoles) => advance({ path, roleTags: seedRoles })}
        />
      )}
      {current === 'roles' && (
        <RoleTagsStep
          step={inputStepNumber}
          total={TOTAL_STEPS}
          config={config}
          initialValue={state.data.roleTags}
          onBack={back}
          onAdvance={(roleTags) => advance({ roleTags })}
        />
      )}
      {current === 'bio' && (
        <BioSocialsStep
          step={inputStepNumber}
          total={TOTAL_STEPS}
          config={config}
          initialBio={state.data.bio}
          initialSocials={{
            socialWebsite: state.data.socialWebsite,
            socialTwitter: state.data.socialTwitter,
            socialInstagram: state.data.socialInstagram,
            socialSoundcloud: state.data.socialSoundcloud,
            socialSpotify: state.data.socialSpotify,
            socialLinkedin: state.data.socialLinkedin,
            socialSubstack: state.data.socialSubstack,
          }}
          onBack={back}
          onAdvance={(patch) => advance(patch)}
        />
      )}
      {current === 'tools' && (
        <ToolsStep
          step={inputStepNumber}
          total={TOTAL_STEPS}
          config={config}
          initialValue={state.data.toolSlugs}
          onBack={back}
          onAdvance={(toolSlugs) => advance({ toolSlugs })}
        />
      )}
      {current === 'done' && (
        <DoneStep
          config={config}
          name={state.data.name}
          username={state.data.username}
          avatarUrl={state.data.avatarUrl}
          roleTags={state.data.roleTags}
        />
      )}
    </div>
  );
}
