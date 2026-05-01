import { useEffect, useState } from 'react';

export type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const DEBOUNCE_MS = 350;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export function useUsernameAvailability(username: string, forPrivyId?: string) {
  const [state, setState] = useState<AvailabilityState>('idle');

  useEffect(() => {
    if (!username) { setState('idle'); return; }
    if (!USERNAME_RE.test(username)) { setState('invalid'); return; }

    setState('checking');
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url = new URL('/api/auth/profile', window.location.origin);
        url.searchParams.set('username', username);
        if (forPrivyId) url.searchParams.set('forPrivyId', forPrivyId);
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) { setState('idle'); return; }
        const json = await res.json();
        if (json.reason === 'invalid') setState('invalid');
        else setState(json.available ? 'available' : 'taken');
      } catch {
        // aborted or network error — silently keep checking state
      }
    }, DEBOUNCE_MS);

    return () => { controller.abort(); clearTimeout(t); };
  }, [username, forPrivyId]);

  return state;
}

export function sanitizeUsername(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
}
