'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { CheckIcon } from '../../components/ui/Icons';
import { useOverview } from './DashboardOverviewContext';

export default function PendingInvitationsWidget() {
  const { user } = usePrivy();
  const { data, loading, dismissWorldInvitation, dismissEventInvitation } = useOverview();
  const [busy, setBusy] = useState<string | null>(null);

  // While loading, render nothing (it's a conditional block — no skeleton needed; it just doesn't appear if there's nothing)
  if (loading || !data) return null;

  const worldInvites = data.invitations.worldInvitations;
  const eventInvites = data.invitations.eventInvitations;
  const total = worldInvites.length + eventInvites.length;
  if (total === 0) return null;

  async function respondWorld(id: string, action: 'accept' | 'decline') {
    if (!user?.id || busy) return;
    setBusy(id);
    try {
      await fetch('/api/worlds/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, invitationId: id, action }),
      });
      dismissWorldInvitation(id);
    } catch (err) {
      console.error('respond world invite failed', err);
    } finally {
      setBusy(null);
    }
  }

  async function dismissEvent(id: string) {
    if (!user?.id || busy) return;
    setBusy(id);
    // No accept endpoint surfaced here yet — just dismiss locally
    dismissEventInvitation(id);
    setBusy(null);
  }

  return (
    <div className="border border-pink/30 rounded-lg overflow-hidden mb-6 bg-obsidian">
      <div className="bg-pink/10 border-b border-pink/30 px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-pink/90 flex items-center gap-2">
          ✉ pending invitations
          <span className="bg-pink text-obsidian font-bold px-1.5 py-0.5 rounded-sm text-[10px]">{total}</span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30">act soon</span>
      </div>
      <div className="p-3 space-y-2">
        {worldInvites.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 border border-bone/10 rounded-sm p-3">
            {inv.worldImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={inv.worldImageUrl} alt="" className="w-9 h-9 rounded-sm object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-sm bg-bone/10 flex items-center justify-center shrink-0">
                <span className="font-basement text-sm text-bone/40">{inv.worldTitle[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[12px] uppercase font-bold text-bone truncate">{inv.worldTitle}</div>
              <div className="font-mono text-[10px] text-bone/40 truncate">
                {inv.inviterName || `@${inv.inviterUsername || 'someone'}`} · {inv.role === 'world_builder' ? 'Builder' : 'Collab'}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => respondWorld(inv.id, 'accept')}
                disabled={busy === inv.id}
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[2px] bg-lime text-obsidian px-2.5 py-1.5 rounded-sm hover:opacity-90 transition cursor-pointer border-none disabled:opacity-50"
              >
                <CheckIcon size={9} /> Accept
              </button>
              <button
                onClick={() => respondWorld(inv.id, 'decline')}
                disabled={busy === inv.id}
                className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40 hover:text-bone bg-transparent border border-bone/20 px-2.5 py-1.5 rounded-sm cursor-pointer transition disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
        {eventInvites.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 border border-bone/10 rounded-sm p-3">
            {inv.eventImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={inv.eventImageUrl} alt="" className="w-9 h-9 rounded-sm object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-sm bg-bone/10 flex items-center justify-center shrink-0">
                <span className="font-basement text-sm text-bone/40">{inv.eventName[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[12px] uppercase font-bold text-bone truncate">{inv.eventName}</div>
              <div className="font-mono text-[10px] text-bone/40 truncate">
                Co-host invite from {inv.inviterName || `@${inv.inviterUsername || 'someone'}`}
                {inv.eventDate ? ` · ${inv.eventDate}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={`/events/${inv.eventSlug}`}
                className="font-mono text-[10px] uppercase tracking-[2px] text-bone/60 hover:text-bone border border-bone/20 px-2.5 py-1.5 rounded-sm transition no-underline"
              >
                View
              </Link>
              <button
                onClick={() => dismissEvent(inv.id)}
                disabled={busy === inv.id}
                className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40 hover:text-bone bg-transparent border border-bone/20 px-2.5 py-1.5 rounded-sm cursor-pointer transition disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
