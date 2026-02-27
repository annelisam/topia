'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

interface NotificationMetadata {
  worldTitle?: string;
  worldSlug?: string;
  role?: string;
}

interface Notification {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actorName: string | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  metadata?: NotificationMetadata | null;
}

export default function NotificationBell() {
  const { authenticated, user } = usePrivy();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(() => {
    if (!authenticated || !user) return;
    fetch(`/api/notifications?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .catch(console.error);
  }, [authenticated, user]);

  // Initial fetch + poll every 30s, pause when tab is hidden
  useEffect(() => {
    fetchNotifications();
    let interval = setInterval(fetchNotifications, 30000);

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchNotifications();
        interval = setInterval(fetchNotifications, 30000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!authenticated) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyId: user.id }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
        className="relative hover:opacity-70 transition p-1"
        aria-label="Notifications"
      >
        {/* Bell icon SVG */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--foreground)' }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-bold"
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
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="font-mono text-[10px] uppercase tracking-tight opacity-50 hover:opacity-100 transition"
                style={{ color: 'var(--foreground)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="font-mono text-[12px] opacity-40" style={{ color: 'var(--foreground)' }}>
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={
                  n.type === 'world_member_added' && n.metadata?.worldSlug
                    ? `/worlds/${n.metadata.worldSlug}`
                    : n.actorUsername ? `/profile/${n.actorUsername}` : '#'
                }
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 hover:opacity-70 transition border-b last:border-b-0"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: n.read ? 'transparent' : 'color-mix(in srgb, var(--foreground) 4%, transparent)',
                }}
              >
                {/* Actor avatar */}
                <div
                  className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  {n.actorAvatarUrl ? (
                    <img src={n.actorAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 10%, transparent)' }}>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--foreground)', opacity: 0.3 }}>
                        {n.actorName?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[12px] truncate" style={{ color: 'var(--foreground)' }}>
                    <span className="font-bold">{n.actorName ?? n.actorUsername ?? 'Someone'}</span>
                    {n.type === 'follow' && ' followed you'}
                    {n.type === 'world_member_added' && n.metadata && (
                      <> added you as {n.metadata.role === 'world_builder' ? 'a world builder' : 'a collaborator'} in <span className="font-bold">{n.metadata.worldTitle}</span></>
                    )}
                  </p>
                  <p className="font-mono text-[10px] opacity-40" style={{ color: 'var(--foreground)' }}>
                    {timeAgo(n.createdAt)}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--foreground)' }} />
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
