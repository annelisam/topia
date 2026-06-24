'use client';

import { useState } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import ProfileCompletionForm from './ProfileCompletionForm';
import TopiaCard from '../../components/profile/TopiaCard';

interface RsvpConfirmationModalProps {
  eventName: string;
  date: string | null;
  city: string | null;
  slug: string;
  ticketLink?: string | null;
  onClose: () => void;
}

type Beat = 'main' | 'profile';

// The stamp a member earns for THIS RSVP. The canonical passport computation
// lives in lib/profile/stamps.ts — this is the celebratory reveal for one event.
function stampFor(eventName: string): { label: string; caption: string; color: string } {
  if (/like\s*minds/i.test(eventName)) {
    return { label: 'LIKE MINDS', caption: 'TOPIA', color: '#e4fe52' };
  }
  return { label: eventName.toUpperCase().slice(0, 14), caption: "RSVP'D", color: '#00F5FF' };
}

export default function RsvpConfirmationModal({ eventName, date, city, slug, ticketLink, onClose }: RsvpConfirmationModalProps) {
  const { profile } = useUserProfile();
  const [beat, setBeat] = useState<Beat>('main');
  const [completed, setCompleted] = useState(false);
  const [justCertified, setJustCertified] = useState(false);
  const [copied, setCopied] = useState(false);

  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/events/${slug}` : '';
  const stamp = stampFor(eventName);
  const roleTagsArr = profile?.roleTags ? profile.roleTags.split(',').map((s) => s.trim()).filter(Boolean) : [];

  // The pieces that make a profile complete (handle · photo · path · craft · bio).
  const pieces = profile
    ? [
        !!profile.username,
        !!profile.avatarUrl,
        !!profile.path,
        !!(profile.roleTags && profile.roleTags.trim()),
        !!(profile.bio && profile.bio.trim()),
      ]
    : [];
  const doneCount = pieces.filter(Boolean).length;
  const total = pieces.length || 5;
  const incomplete = !!profile && doneCount < total;
  const showNudge = incomplete && !completed;

  const copyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToX = () => {
    const text = `I'm going to ${eventName}!`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(eventUrl)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Join me at ${eventName}`;
    const body = `I just RSVP'd to ${eventName}${date ? ` on ${date}` : ''}${city ? ` in ${city}` : ''}.\n\nCheck it out: ${eventUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <style>{`
        @keyframes stamp-in {
          0%   { transform: scale(1.7) rotate(-12deg); opacity: 0; }
          60%  { transform: scale(0.93) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(8deg); opacity: 1; }
        }
        @keyframes card-rise {
          0%   { transform: translateY(24px) scale(0.92); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes headline-in {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border p-6 text-center max-h-[88vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─────────────────────────── MAIN · confirmation + tickets ─────────────────── */}
        {beat === 'main' && (
          <>
            <h2 className="font-mono text-[18px] font-bold uppercase mb-1" style={{ color: 'var(--foreground)', animation: 'headline-in 0.4s ease both' }}>
              You&apos;re going!
            </h2>
            <p className="font-mono text-[12px] opacity-50 mb-6" style={{ color: 'var(--foreground)' }}>
              {eventName}{(date || city) ? ` · ${[date, city].filter(Boolean).join(' · ')}` : ''}
            </p>

            {/* Profile card + the event stamp landing on it. The card is scaled
                down; the wrapper takes the *scaled* dimensions so there's no dead
                space below it (300×375 card → scale .68 → 204×255). */}
            <div className="relative mx-auto" style={{ width: 204, height: 255, marginBottom: 26 }}>
              <div style={{ animation: 'card-rise 0.6s cubic-bezier(0.2,0.8,0.3,1) both' }}>
                <div style={{ transform: 'scale(0.68)', transformOrigin: 'top left' }}>
                  <TopiaCard
                    name={profile?.name || ''}
                    username={profile?.username || ''}
                    avatarUrl={profile?.avatarUrl}
                    roleTags={roleTagsArr}
                    path={profile?.path}
                  />
                </div>
              </div>
              {/* stamp — lands on the card's top-right corner after it rises in */}
              <svg
                viewBox="0 0 100 100" width={76} height={76}
                className="absolute z-20 pointer-events-none"
                style={{ top: -14, right: -14, animation: 'stamp-in 0.55s cubic-bezier(0.2,0.8,0.3,1) 0.55s both' }}
              >
                <defs>
                  <path id="rsvpArcTop" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0" />
                  <path id="rsvpArcBot" d="M 50,50 m 36,0 a 36,36 0 1,1 -72,0" />
                </defs>
                <circle cx="50" cy="50" r="48" fill={stamp.color} opacity={0.12} />
                <circle cx="50" cy="50" r="47" fill="none" stroke={stamp.color} strokeWidth="2.5" opacity={0.95} />
                <circle cx="50" cy="50" r="42" fill="none" stroke={stamp.color} strokeWidth="1" opacity={0.5} strokeDasharray="0.5 2.6" />
                <text fontSize="8.5" fontFamily="monospace" fontWeight="700" letterSpacing="1.2" fill={stamp.color}>
                  <textPath href="#rsvpArcTop" startOffset="50%" textAnchor="middle">{stamp.label}</textPath>
                </text>
                <text fontSize="7.5" fontFamily="monospace" fontWeight="700" letterSpacing="2" fill={stamp.color} opacity={0.85}>
                  <textPath href="#rsvpArcBot" startOffset="50%" textAnchor="middle">{`• ${stamp.caption} •`}</textPath>
                </text>
                <path d="M 38,50 L 47,59 L 64,40" fill="none" stroke={stamp.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* PRIMARY · tickets — mandatory, but a calm container so the single
                lime button is the only loud element on the screen. */}
            {ticketLink && (
              <div className="mb-3 rounded-xl border p-4 text-left" style={{ borderColor: 'var(--border-color)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-40 mb-1.5" style={{ color: 'var(--foreground)' }}>
                  Almost there
                </p>
                <p className="font-mono text-[12px] leading-snug opacity-70 mb-3.5" style={{ color: 'var(--foreground)' }}>
                  This event is ticketed — your spot isn&apos;t locked until you grab a ticket.
                </p>
                <a
                  href={ticketLink.startsWith('http') ? ticketLink : `https://${ticketLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-3 font-mono text-[13px] uppercase tracking-widest rounded-lg cursor-pointer text-center font-bold no-underline transition hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                >
                  Get Tickets →
                </a>
              </div>
            )}

            {/* Done — primary when nothing else is, a quiet ghost when tickets
                is the real call to action. */}
            <button
              onClick={onClose}
              className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer font-bold transition hover:opacity-90"
              style={ticketLink
                ? { backgroundColor: 'transparent', color: 'var(--foreground)', border: '1px solid var(--border-color)' }
                : { backgroundColor: 'var(--foreground)', color: 'var(--background)', border: 'none' }}
            >
              Done
            </button>

            {/* QUIET ZONE · passport nudge + share, the last thing on the modal */}
            <div className="mt-5 pt-4 border-t flex flex-col items-center gap-3.5" style={{ borderColor: 'var(--border-color)' }}>
              {justCertified ? (
                <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--accent-ink)' }}>
                  + Certified stamp earned ✓
                </p>
              ) : showNudge ? (
                <button
                  onClick={() => setBeat('profile')}
                  className="font-mono text-[11px] uppercase tracking-widest underline opacity-60 hover:opacity-100 transition cursor-pointer bg-transparent border-none"
                  style={{ color: 'var(--foreground)' }}
                >
                  Finish your passport ({doneCount}/{total}) →
                </button>
              ) : null}
              <div className="flex items-center justify-center gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-40" style={{ color: 'var(--foreground)' }}>Share</span>
                <button onClick={copyLink} className="font-mono text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition cursor-pointer bg-transparent border-none" style={{ color: 'var(--foreground)' }}>{copied ? 'Copied!' : 'Copy link'}</button>
                <button onClick={shareToX} className="font-mono text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition cursor-pointer bg-transparent border-none" style={{ color: 'var(--foreground)' }}>X</button>
                <button onClick={shareViaEmail} className="font-mono text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition cursor-pointer bg-transparent border-none" style={{ color: 'var(--foreground)' }}>Email</button>
              </div>
            </div>
          </>
        )}

        {/* ─────────────────────────── PROFILE · opt-in inline completion ────────────── */}
        {beat === 'profile' && profile && (
          <ProfileCompletionForm
            privyId={profile.privyId}
            profile={profile}
            onComplete={(nowComplete) => {
              setCompleted(true);
              setJustCertified(nowComplete);
              setBeat('main');
            }}
            onSkip={() => setBeat('main')}
          />
        )}
      </div>
    </div>
  );
}
