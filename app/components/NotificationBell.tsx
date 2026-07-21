'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { useBadges } from './BadgesProvider';
import type { NotificationRow as Notification } from '@/lib/notifications/types';

export default function NotificationBell() {
  const { authenticated, user } = usePrivy();
  const { notificationsUnread, refreshBadges } = useBadges();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(() => {
    if (!authenticated || !user) return;
    setLoading(true);
    fetch(`/api/notifications?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authenticated, user]);

  // Fetch the list only when the dropdown opens — the unread *count* comes from
  // the shared BadgesProvider poll, so we don't fetch the full list every 30s.
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!authenticated) return null;

  const unreadCount = notificationsUnread;

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyId: user.id }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    refreshBadges();
  };

  const respondToInvite = async (invitationId: string, action: 'accept' | 'decline') => {
    if (!user) return;
    setRespondingTo(invitationId);
    try {
      const res = await fetch('/api/worlds/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, invitationId, action }),
      });
      if (res.ok) {
        // Update the notification locally to reflect the response
        setNotifications((prev) =>
          prev.map((n) => {
            if (n.type === 'world_invite' && n.metadata?.invitationId === invitationId) {
              return {
                ...n,
                type: action === 'accept' ? 'world_invite_accepted_self' : 'world_invite_declined_self',
                read: true,
              };
            }
            return n;
          })
        );
        refreshBadges();
      }
    } catch (err) {
      console.error('Failed to respond to invite:', err);
    } finally {
      setRespondingTo(null);
    }
  };

  const respondToEventInvite = async (invitationId: string, action: 'accept' | 'decline') => {
    if (!user) return;
    setRespondingTo(invitationId);
    try {
      const res = await fetch('/api/events/hosts/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, invitationId, action }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => {
            if (n.type === 'event_cohost_invite' && n.metadata?.invitationId === invitationId) {
              return {
                ...n,
                type: action === 'accept' ? 'event_cohost_accepted_self' : 'event_cohost_declined_self',
                read: true,
              };
            }
            return n;
          })
        );
        refreshBadges();
      }
    } catch (err) {
      console.error('Failed to respond to event invite:', err);
    } finally {
      setRespondingTo(null);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 hover:opacity-70 transition bg-transparent border-none cursor-pointer"
        aria-label="Notifications"
      >
        {/* Bell icon SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--foreground)' }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 w-4 h-4 rounded-full flex items-center justify-center font-mono text-[12px] font-bold"
            style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 border rounded-2xl shadow-lg z-50 max-h-80 overflow-y-auto"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <span className="font-mono text-[13px] uppercase tracking-[0.15em] font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="font-mono text-[13px] uppercase tracking-tight opacity-50 hover:opacity-100 transition"
                style={{ color: 'var(--foreground)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {loading && notifications.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="font-mono text-[12px] opacity-40" style={{ color: 'var(--foreground)' }}>
                Loading…
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="font-mono text-[12px] opacity-40" style={{ color: 'var(--foreground)' }}>
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isInvite = n.type === 'world_invite' || n.type === 'event_cohost_invite';
              const isEventInvite = n.type === 'event_cohost_invite';
              const isRespondedInvite =
                n.type === 'world_invite_accepted_self' || n.type === 'world_invite_declined_self' ||
                n.type === 'event_cohost_accepted_self' || n.type === 'event_cohost_declined_self';

              const linkHref = (n.type === 'event_reminder' && n.metadata?.eventSlug) ? `/events/${n.metadata.eventSlug}` :
                (n.type === 'world_member_added' || n.type === 'world_invite_accepted' || n.type === 'world_announcement') && n.metadata?.worldSlug
                  ? `/worlds/${n.metadata.worldSlug}`
                  : (n.type === 'event_cohost_accepted' || n.type === 'event_rsvp' || n.type === 'event_rsvp_waitlist' || n.type === 'event_waitlist_promoted' || n.type === 'event_rsvp_approved') && n.metadata?.eventSlug
                  ? `/events/${n.metadata.eventSlug}`
                  : n.actorUsername ? `/profile/${n.actorUsername}` : '#';

              const notificationText = () => {
                const actor = <span className="font-bold">{n.actorName ?? n.actorUsername ?? 'Someone'}</span>;
                const roleLabel = n.metadata?.role === 'world_builder' ? 'a world builder' : 'a collaborator';
                const worldName = <span className="font-bold">{n.metadata?.worldTitle}</span>;
                const eventName = <span className="font-bold">{n.metadata?.eventName}</span>;

                if (n.type === 'event_reminder') return <>{n.metadata?.kind === '2h' ? 'Starting soon' : 'Tomorrow'}: {eventName}</>;
                if (n.type === 'follow') return <>{actor} connected with you</>;
                if (n.type === 'world_follow') return <>{actor} started following {worldName}</>;
                if (n.type === 'world_announcement') return <>{actor} posted an update in {worldName}</>;
                if (n.type === 'world_member_added') return <>{actor} added you as {roleLabel} in {worldName}</>;
                if (n.type === 'world_invite') return <>{actor} invited you to join {worldName} as {roleLabel}</>;
                if (n.type === 'world_invite_accepted') return <>{actor} accepted your invite to {worldName}</>;
                if (n.type === 'world_invite_accepted_self') return <>You accepted the invite to {worldName}</>;
                if (n.type === 'world_invite_declined_self') return <>You declined the invite to {worldName}</>;
                if (n.type === 'event_cohost_invite') return <>{actor} invited you to co-host {eventName}</>;
                if (n.type === 'event_cohost_added') return <>{actor} added you as a co-host of {eventName}</>;
                if (n.type === 'event_cohost_accepted') return <>{actor} accepted your co-host invite for {eventName}</>;
                if (n.type === 'event_cohost_accepted_self') return <>You accepted the co-host invite for {eventName}</>;
                if (n.type === 'event_cohost_declined_self') return <>You declined the co-host invite for {eventName}</>;
                if (n.type === 'event_cohost_declined') return <>{actor} declined your co-host invite for {eventName}</>;
                if (n.type === 'event_rsvp') return <>{actor} RSVP&apos;d to {eventName}</>;
                if (n.type === 'event_rsvp_waitlist') return <>{actor} joined the waitlist for {eventName}</>;
                if (n.type === 'event_waitlist_promoted') return <>You&apos;re in! A spot opened up for {eventName}</>;
                if (n.type === 'event_rsvp_approved') return <>{actor} approved your request for {eventName}</>;
                if (n.type === 'event_rsvp_declined') return <>{actor} declined your request for {eventName}</>;
                return <>{actor}</>;
              };

              const content = (
                <>
                  {/* Actor avatar */}
                  <div
                    className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border relative"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {/* Initial sits underneath, so a broken/deleted blob URL
                        degrades to it instead of an empty circle. */}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 10%, transparent)' }}>
                      <span className="font-mono text-[13px]" style={{ color: 'var(--foreground)', opacity: 0.3 }}>
                        {n.actorName?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    {n.actorAvatarUrl && (
                      <img
                        src={n.actorAvatarUrl}
                        alt=""
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        className="relative w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Text + actions */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>
                      {notificationText()}
                    </p>
                    <p className="font-mono text-[13px] opacity-40" style={{ color: 'var(--foreground)' }}>
                      {timeAgo(n.createdAt)}
                    </p>
                    {/* Accept / Decline buttons for pending invites */}
                    {isInvite && n.metadata?.invitationId && (
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            isEventInvite
                              ? respondToEventInvite(n.metadata!.invitationId!, 'accept')
                              : respondToInvite(n.metadata!.invitationId!, 'accept');
                          }}
                          disabled={respondingTo === n.metadata.invitationId}
                          className="px-3 py-1 font-mono text-[13px] uppercase tracking-widest rounded-lg transition hover:opacity-80 disabled:opacity-40"
                          style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
                        >
                          {respondingTo === n.metadata.invitationId ? '...' : 'Accept'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            isEventInvite
                              ? respondToEventInvite(n.metadata!.invitationId!, 'decline')
                              : respondToInvite(n.metadata!.invitationId!, 'decline');
                          }}
                          disabled={respondingTo === n.metadata.invitationId}
                          className="px-3 py-1 font-mono text-[13px] uppercase tracking-widest rounded-lg border transition hover:opacity-80 disabled:opacity-40"
                          style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {isRespondedInvite && (
                      <p className="font-mono text-[13px] mt-1 opacity-50" style={{ color: n.type === 'world_invite_accepted_self' ? '#00AA55' : 'var(--foreground)' }}>
                        {n.type === 'world_invite_accepted_self' ? 'Accepted' : 'Declined'}
                      </p>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--foreground)' }} />
                  )}
                </>
              );

              // Invites shouldn't navigate away — they need action buttons
              if (isInvite) {
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-3 py-2.5 border-b last:border-b-0"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: n.read ? 'transparent' : 'color-mix(in srgb, var(--foreground) 4%, transparent)',
                    }}
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={n.id}
                  href={linkHref}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-3 py-2.5 hover:opacity-70 transition border-b last:border-b-0"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: n.read ? 'transparent' : 'color-mix(in srgb, var(--foreground) 4%, transparent)',
                  }}
                >
                  {content}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
