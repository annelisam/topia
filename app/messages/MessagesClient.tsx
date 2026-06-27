'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import Thread, { Avatar } from './Thread';

interface InboxItem {
  conversationId: string;
  status: 'accepted' | 'pending';
  other: { id: string; name: string | null; username: string | null; avatarUrl: string | null };
  preview: string;
  fromMe: boolean;
  lastMessageAt: string;
  unreadCount: number;
}
interface Inbox { primary: InboxItem[]; requests: InboxItem[]; requestCount: number; unreadTotal: number; }

const POLL_MS = 10000;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface MessagesClientProps {
  initialConversationId?: string | null;
  onClose?: () => void;     // renders a close button (modal)
  fullViewHref?: string;    // renders an expand link (modal → full page)
}

export default function MessagesClient({ initialConversationId = null, onClose, fullViewHref }: MessagesClientProps) {
  const { authenticated, user, ready } = usePrivy();
  const [inbox, setInbox] = useState<Inbox>({ primary: [], requests: [], requestCount: 0, unreadTotal: 0 });
  const [tab, setTab] = useState<'primary' | 'requests'>('primary');
  const [selected, setSelected] = useState<string | null>(initialConversationId);

  const fetchInbox = useCallback(() => {
    if (!authenticated || !user) return;
    fetch(`/api/messages/conversations?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data: Inbox) => setInbox(data))
      .catch(() => {});
  }, [authenticated, user]);

  useEffect(() => {
    fetchInbox();
    let interval = setInterval(fetchInbox, POLL_MS);
    const onVis = () => {
      clearInterval(interval);
      if (!document.hidden) { fetchInbox(); interval = setInterval(fetchInbox, POLL_MS); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchInbox]);

  if (ready && !authenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-mono text-[12px] uppercase tracking-[2px] text-ink/40">log in to view messages</p>
      </div>
    );
  }

  const list = tab === 'primary' ? inbox.primary : inbox.requests;

  const Row = ({ item }: { item: InboxItem }) => {
    const name = item.other.name || item.other.username || 'Unknown';
    const unread = item.unreadCount > 0;
    return (
      <button
        onClick={() => setSelected(item.conversationId)}
        className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-ink/[0.05] cursor-pointer transition-colors ${selected === item.conversationId ? 'bg-ink/[0.06]' : 'hover:bg-ink/[0.03]'}`}
      >
        <Avatar user={item.other} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-mono text-[13px] truncate ${unread ? 'text-ink font-bold' : 'text-ink/90'}`}>{name}</span>
            <span className="font-mono text-[10px] text-ink/35 shrink-0">{timeAgo(item.lastMessageAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className={`font-mono text-[12px] truncate ${unread ? 'text-ink/80' : 'text-ink/40'}`}>
              {item.fromMe ? 'You: ' : ''}{item.preview || '—'}
            </span>
            {unread && <span className="w-2 h-2 rounded-full bg-lime shrink-0" />}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex">
      {/* List pane */}
      <div className={`w-full md:w-[340px] md:shrink-0 border-r border-ink/[0.08] flex flex-col min-h-0 ${selected ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-basement font-black text-[22px] uppercase text-ink leading-none">Messages</h1>
            {(fullViewHref || onClose) && (
              <div className="flex items-center gap-1 -mr-1">
                {fullViewHref && (
                  <Link href={selected ? `${fullViewHref}?c=${selected}` : fullViewHref} onClick={onClose} aria-label="Open full view" className="text-ink/45 hover:text-ink p-1.5 no-underline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                  </Link>
                )}
                {onClose && (
                  <button onClick={onClose} aria-label="Close" className="text-ink/45 hover:text-ink p-1.5 bg-transparent border-none cursor-pointer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setTab('primary')}
              className={`font-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded-sm cursor-pointer transition ${tab === 'primary' ? 'bg-lime text-obsidian font-bold' : 'text-ink/45 hover:text-ink/80 bg-transparent'}`}
            >
              Primary{inbox.unreadTotal > 0 ? ` (${inbox.unreadTotal})` : ''}
            </button>
            <button
              onClick={() => setTab('requests')}
              className={`font-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded-sm cursor-pointer transition ${tab === 'requests' ? 'bg-lime text-obsidian font-bold' : 'text-ink/45 hover:text-ink/80 bg-transparent'}`}
            >
              Requests{inbox.requestCount > 0 ? ` (${inbox.requestCount})` : ''}
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {list.length === 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-[2px] text-ink/30 text-center mt-10 px-4">
              {tab === 'primary' ? 'no conversations yet' : 'no requests'}
            </p>
          ) : (
            list.map((item) => <Row key={item.conversationId} item={item} />)
          )}
        </div>
      </div>

      {/* Thread pane */}
      <div className={`flex-1 min-h-0 ${selected ? 'flex' : 'hidden md:flex'} flex-col`}>
        {selected && user ? (
          <Thread
            key={selected}
            conversationId={selected}
            privyId={user.id}
            onBack={() => setSelected(null)}
            onActivity={fetchInbox}
          />
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center">
            <p className="font-mono text-[11px] uppercase tracking-[2px] text-ink/25">select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
