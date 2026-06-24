'use client';

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

export default function OverviewLayer({
  config,
  description,
  shortDescription,
  tools,
  socialLinks,
}: {
  config: WorldConfig;
  description: string | null;
  shortDescription: string | null;
  tools: string[];
  socialLinks: SocialLinks | null;
}) {
  const hasSocial = socialLinks && Object.values(socialLinks).some((v) => v);
  const body = description || shortDescription;

  return (
    <div className="bg-[var(--page-bg)] flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Overview</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-40`}>topia://about</span>
      </div>

      <div className="p-5 md:p-6 flex flex-col gap-6">
        <div>
          {body ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{body}</ReactMarkdown>
            </div>
          ) : (
            <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">No description yet</span>
          )}
        </div>

        {tools.length > 0 && (
          <div className="border-t border-ink/[0.08] pt-4">
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-ink/30 block mb-2">Tools</span>
            <div className="flex flex-wrap gap-1.5">
              {tools.map((tool) => (
                <span key={tool} className="font-mono text-[12px] px-2 py-0.5 border border-ink/[0.12] rounded text-ink/60">{tool}</span>
              ))}
            </div>
          </div>
        )}

        {hasSocial && (
          <div className="border-t border-ink/[0.08] pt-4">
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-ink/30 block mb-2">Links</span>
            <div className="flex flex-wrap gap-4">
              {Object.entries(socialLinks!).map(([key, url]) =>
                url ? (
                  <a key={key} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-ink/40 hover:text-ink/70 transition-colors" title={key}>
                    <SocialIcon type={key} size={18} />
                  </a>
                ) : null,
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
