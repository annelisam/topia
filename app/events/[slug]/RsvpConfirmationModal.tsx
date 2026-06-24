'use client';

import Link from 'next/link';
import { useUserProfile } from '../../hooks/useUserProfile';
import TopiaCard from '../../components/profile/TopiaCard';

interface RsvpConfirmationModalProps {
  eventName: string;
  onClose: () => void;
}

// The stamp a member earns for THIS RSVP. The canonical passport computation
// lives in lib/profile/stamps.ts — this is the celebratory reveal for one event.
function stampFor(eventName: string): { label: string; caption: string; color: string } {
  if (/like\s*minds/i.test(eventName)) {
    return { label: 'LIKE MINDS', caption: 'TOPIA', color: '#e4fe52' };
  }
  return { label: eventName.toUpperCase().slice(0, 14), caption: "RSVP'D", color: '#00F5FF' };
}

// Celebration shown after the visitor taps "Done" on the RSVP success step:
// their full-size Topia card with the event stamp landing on it, then a choice
// of where to go next.
export default function RsvpConfirmationModal({ eventName, onClose }: RsvpConfirmationModalProps) {
  const { profile } = useUserProfile();
  const stamp = stampFor(eventName);
  const roleTagsArr = profile?.roleTags ? profile.roleTags.split(',').map((s) => s.trim()).filter(Boolean) : [];

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
        className="relative w-full max-w-sm rounded-2xl border p-6 text-center max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 font-mono text-[18px] opacity-40 hover:opacity-100 bg-transparent border-none cursor-pointer z-30" style={{ color: 'var(--foreground)' }} aria-label="Close">×</button>

        <h2 className="font-basement text-[24px] font-black uppercase leading-none mb-1" style={{ color: 'var(--foreground)', animation: 'headline-in 0.4s ease both' }}>
          Stamped.
        </h2>
        <p className="font-mono text-[12px] opacity-50 mb-6" style={{ color: 'var(--foreground)' }}>
          Your passport just earned {eventName}.
        </p>

        {/* Full-size profile card + the event stamp landing on its corner */}
        <div className="relative mx-auto" style={{ width: 300, height: 375, marginBottom: 28 }}>
          <div style={{ animation: 'card-rise 0.6s cubic-bezier(0.2,0.8,0.3,1) both' }}>
            <TopiaCard
              name={profile?.name || ''}
              username={profile?.username || ''}
              avatarUrl={profile?.avatarUrl}
              roleTags={roleTagsArr}
              path={profile?.path}
            />
          </div>
          <svg
            viewBox="0 0 100 100" width={92} height={92}
            className="absolute z-20 pointer-events-none"
            style={{ top: -16, right: -12, animation: 'stamp-in 0.55s cubic-bezier(0.2,0.8,0.3,1) 0.55s both' }}
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

        {/* Where to next — side by side */}
        <div className="flex items-stretch gap-2.5">
          <Link
            href={profile?.username ? `/profile/${profile.username}` : '/profile'}
            className="passport-cta-outline flex-1 inline-flex items-center justify-center text-center px-3 py-3 font-mono text-[11px] uppercase tracking-[0.1em] leading-tight rounded-lg cursor-pointer font-bold no-underline transition hover:opacity-80"
          >
            View your passport
          </Link>
          <Link
            href="/home"
            className="flex-1 inline-flex items-center justify-center text-center px-3 py-3 font-mono text-[11px] uppercase tracking-[0.1em] leading-tight rounded-lg cursor-pointer border-none font-bold no-underline transition hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            Explore Topia
          </Link>
        </div>
        <button
          onClick={onClose}
          className="mt-4 font-mono text-[11px] uppercase tracking-widest underline opacity-50 hover:opacity-100 transition cursor-pointer bg-transparent border-none block mx-auto"
          style={{ color: 'var(--foreground)' }}
        >
          Back to event
        </button>
      </div>
    </div>
  );
}
