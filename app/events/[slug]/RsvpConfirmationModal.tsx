'use client';

import { useState } from 'react';

interface RsvpConfirmationModalProps {
  eventName: string;
  date: string | null;
  city: string | null;
  slug: string;
  onClose: () => void;
}

export default function RsvpConfirmationModal({ eventName, date, city, slug, onClose }: RsvpConfirmationModalProps) {
  const [copied, setCopied] = useState(false);

  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/events/${slug}` : '';

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border p-8 text-center"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Checkmark */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: 'var(--foreground)' }}
        >
          <span className="text-2xl" style={{ color: 'var(--background)' }}>&#x2713;</span>
        </div>

        <h2 className="font-mono text-[18px] font-bold uppercase mb-2" style={{ color: 'var(--foreground)' }}>
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

        {/* Share buttons */}
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-3 opacity-50" style={{ color: 'var(--foreground)' }}>
          Share with friends
        </p>

        <div className="flex flex-col gap-2 mb-6">
          <button
            onClick={copyLink}
            className="w-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg cursor-pointer"
            style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={shareToX}
            className="w-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg cursor-pointer"
            style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
          >
            Share on X
          </button>
          <button
            onClick={shareViaEmail}
            className="w-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg cursor-pointer"
            style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
          >
            Email
          </button>
        </div>

        <button
          onClick={onClose}
          className="font-mono text-[12px] uppercase tracking-widest opacity-50 hover:opacity-80 transition cursor-pointer"
          style={{ color: 'var(--foreground)' }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
