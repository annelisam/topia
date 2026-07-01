'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '../ProjectContent';
import { SocialIcon } from '../SocialIcons';
import { WorldConfig } from './worldConfig';

export interface SocialLinks {
  website?: string;
  twitter?: string;
  instagram?: string;
  soundcloud?: string;
  spotify?: string;
  linkedin?: string;
  substack?: string;
}

export type ActivityType = 'announcement' | 'project' | 'member' | 'event' | 'published';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  primaryText: string;
  timestamp: Date;
}

const ACTIVITY_DOT: Record<ActivityType, string> = {
  announcement: 'bg-lime',
  event: 'bg-blue',
  project: 'bg-green',
  member: 'bg-pink',
  published: 'bg-ink/20',
};

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  announcement: 'Announcement',
  event: 'Event',
  project: 'Project',
  member: 'Member',
  published: 'Milestone',
};

function timeAgo(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  const units: [number, string][] = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [secs, label] of units) {
    const amount = Math.floor(seconds / secs);
    if (amount >= 1) return `${amount}${label} ago`;
  }
  return 'just now';
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-ink/[0.06] last:border-b-0">
      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${ACTIVITY_DOT[item.type]}`} />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[12px] text-ink/80 leading-snug">{item.primaryText}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink/30 mt-0.5">
          {ACTIVITY_LABEL[item.type]} · {timeAgo(item.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default function OverviewLayer({
  config,
  description,
  shortDescription,
  socialLinks,
  activity,
  canPostUpdate,
  onPostUpdate,
}: {
  config: WorldConfig;
  description: string | null;
  shortDescription: string | null;
  socialLinks: SocialLinks | null;
  activity: ActivityItem[];
  canPostUpdate: boolean;
  onPostUpdate: (body: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [composing, setComposing] = useState(false);

  const hasSocial = socialLinks && Object.values(socialLinks).some((v) => v);
  const body = description || shortDescription;

  async function handlePost() {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      await onPostUpdate(draft.trim());
      setDraft('');
      setComposing(false);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bg-[var(--page-bg)] flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Overview</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-40`}>topia://about</span>
      </div>

      <div className="p-5 md:p-6 flex flex-col gap-6">
        {(body || hasSocial) && (
          <div className="flex flex-col gap-4">
            {body ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{body}</ReactMarkdown>
              </div>
            ) : (
              <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">No description yet</span>
            )}
            {hasSocial && (
              <div className="flex flex-wrap gap-4">
                {Object.entries(socialLinks!).map(([key, url]) =>
                  url ? (
                    <a key={key} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-ink/40 hover:text-ink/70 transition-colors" title={key}>
                      <SocialIcon type={key} size={18} />
                    </a>
                  ) : null,
                )}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-ink/[0.08] pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-ink/30">Activity</span>
            {canPostUpdate && !composing && (
              <button onClick={() => setComposing(true)} className="font-mono text-[10px] uppercase tracking-wider text-ink/50 hover:text-ink/70 transition-colors border border-ink/[0.12] rounded-sm px-2 py-0.5 cursor-pointer bg-transparent">
                + Post update
              </button>
            )}
          </div>

          {composing && (
            <div className="flex flex-col gap-2 mb-3 p-3 rounded-lg border border-ink/[0.1]">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Share an update with anyone watching this world…"
                rows={2}
                className="w-full resize-none bg-transparent font-mono text-[12px] text-ink placeholder:text-ink/30 focus:outline-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { setComposing(false); setDraft(''); }} className="font-mono text-[10px] uppercase tracking-wider text-ink/40 hover:text-ink/60 transition-colors cursor-pointer bg-transparent border-none">
                  Cancel
                </button>
                <button
                  onClick={handlePost}
                  disabled={!draft.trim() || posting}
                  className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-sm cursor-pointer border-none ${config.bg} ${config.textOn} disabled:opacity-40`}
                >
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          )}

          {activity.length === 0 ? (
            <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider block py-4">No activity yet</span>
          ) : (
            <div>{activity.map((item) => <ActivityRow key={item.id} item={item} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
