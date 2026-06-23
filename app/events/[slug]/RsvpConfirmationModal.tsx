'use client';

import { useState } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import ProfileCompletionForm from './ProfileCompletionForm';

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
          100% { transform: scale(1) rotate(-3deg); opacity: 1; }
        }
      `}</style>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border p-8 text-center max-h-[88vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─────────────────────────── MAIN · confirmation + tickets ─────────────────── */}
        {beat === 'main' && (
          <>
            {/* Compact passport-stamp reveal — a celebratory touch, not the headline. */}
            <div className="relative mx-auto mb-4 flex items-center justify-center" style={{ width: 80, height: 80 }}>
              <svg
                viewBox="0 0 100 100"
                width={80}
                height={80}
                style={{ animation: 'stamp-in 0.5s cubic-bezier(0.2,0.8,0.3,1) both' }}
              >
                <defs>
                  <path id="rsvpArcTop" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0" />
                  <path id="rsvpArcBot" d="M 50,50 m 36,0 a 36,36 0 1,1 -72,0" />
                </defs>
                <circle cx="50" cy="50" r="48" fill={stamp.color} opacity={0.08} />
                <circle cx="50" cy="50" r="47" fill="none" stroke={stamp.color} strokeWidth="2.5" opacity={0.9} />
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

            <h2 className="font-mono text-[18px] font-bold uppercase mb-1.5" style={{ color: 'var(--foreground)' }}>
              You&apos;re going!
            </h2>
            <p className="font-mono text-[13px] opacity-60 mb-1" style={{ color: 'var(--foreground)' }}>
              {eventName}
            </p>
            {(date || city) && (
              <p className="font-mono text-[12px] opacity-40 mb-6" style={{ color: 'var(--foreground)' }}>
                {[date, city].filter(Boolean).join(' · ')}
              </p>
            )}
            {!(date || city) && <div className="mb-6" />}

            {/* PRIMARY action — for a ticketed event, getting tickets comes first. */}
            {ticketLink && (
              <div className="mb-6 rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-hover)' }}>
                <p className="font-mono text-[12px] opacity-70 mb-3" style={{ color: 'var(--foreground)' }}>
                  This is a ticketed event — secure your spot.
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

            {/* Share — compact row */}
            <div className="flex items-center gap-2 mb-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold opacity-40 shrink-0 mr-1" style={{ color: 'var(--foreground)' }}>
                Share
              </span>
              <button
                onClick={copyLink}
                className="flex-1 px-2 py-2 font-mono text-[10px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg cursor-pointer"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={shareToX}
                className="flex-1 px-2 py-2 font-mono text-[10px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg cursor-pointer"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                X
              </button>
              <button
                onClick={shareViaEmail}
                className="flex-1 px-2 py-2 font-mono text-[10px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg cursor-pointer"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                Email
              </button>
            </div>

            {/* SECONDARY · optional profile-completion nudge with progress */}
            {justCertified ? (
              <p className="font-mono text-[11px] uppercase tracking-widest mb-5" style={{ color: 'var(--accent)' }}>
                + Certified stamp earned ✓
              </p>
            ) : showNudge ? (
              <button
                onClick={() => setBeat('profile')}
                className="w-full mb-5 pt-5 border-t text-left cursor-pointer bg-transparent border-x-0 border-b-0 group"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] uppercase tracking-widest font-bold" style={{ color: 'var(--foreground)' }}>
                    Complete your profile
                  </span>
                  <span className="font-mono text-[10px] opacity-50" style={{ color: 'var(--foreground)' }}>
                    {doneCount} of {total} →
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-hover)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(doneCount / total) * 100}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>
                <span className="block mt-2 font-mono text-[10px] opacity-40 group-hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
                  Add your handle &amp; finish your passport to earn the Certified stamp.
                </span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="font-mono text-[12px] uppercase tracking-widest opacity-50 hover:opacity-80 transition cursor-pointer"
              style={{ color: 'var(--foreground)' }}
            >
              Done
            </button>
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
