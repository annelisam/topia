'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* ── Types ────────────────────────────────────────────────────── */

export interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  url?: string | null;
  links?: { label: string; url: string }[] | null;
  tags?: string[] | null;
}

/* ── Video embed helper ───────────────────────────────────────── */

export function getEmbedUrl(videoUrl: string): { src: string; vertical: boolean } | null {
  if (!videoUrl) return null;
  const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return { src: `https://www.youtube.com/embed/${ytMatch[1]}`, vertical: false };
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { src: `https://player.vimeo.com/video/${vimeoMatch[1]}`, vertical: false };
  if (videoUrl.includes('instagram.com')) return { src: videoUrl.replace(/\/$/, '') + '/embed', vertical: true };
  const tikMatch = videoUrl.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tikMatch) return { src: `https://www.tiktok.com/embed/${tikMatch[1]}`, vertical: true };
  if (videoUrl.startsWith('http')) return { src: videoUrl, vertical: false };
  return null;
}

/* ── Markdown components ──────────────────────────────────────── */

export const markdownComponents = {
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="font-mono text-[13px] leading-relaxed mb-3 last:mb-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</p>
  ),
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="font-mono text-[18px] font-bold mb-3 mt-6 first:mt-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="font-mono text-[16px] font-bold mb-2 mt-5 first:mt-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="font-mono text-[14px] font-bold mb-2 mt-4 first:mt-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</h3>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="font-mono text-[13px] list-disc pl-5 mb-3 space-y-1" style={{ color: 'var(--foreground)' }} {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="font-mono text-[13px] list-decimal pl-5 mb-3 space-y-1" style={{ color: 'var(--foreground)' }} {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="font-mono text-[13px] leading-relaxed" style={{ color: 'var(--foreground)' }} {...props}>{children}</li>
  ),
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-60 transition" style={{ color: 'var(--foreground)' }} {...props}>{children}</a>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 pl-4 my-3 opacity-80" style={{ borderColor: 'var(--border-color)' }} {...props}>{children}</blockquote>
  ),
  code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className="font-mono text-[12px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-hover)' }} {...props}>{children}</code>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-bold" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em {...props}>{children}</em>
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-6" style={{ borderColor: 'var(--border-color)' }} {...props} />
  ),
};

/* ── Project Content ──────────────────────────────────────────── */

export default function ProjectContent({
  project,
  maxImageHeight = '250px',
}: {
  project: ProjectItem;
  maxImageHeight?: string;
}) {
  const embed = project.videoUrl ? getEmbedUrl(project.videoUrl) : null;
  const projectLinks = (project.links as { label: string; url: string }[] | null) || [];
  const allTags = (project.tags as string[] | null) || [];
  const toolTags = allTags.filter(t => t.startsWith('tool:'));
  const regularTags = allTags.filter(t => !t.startsWith('tool:'));

  return (
    <>
      {/* Cover image */}
      {project.imageUrl && (
        <div className="w-full rounded-xl overflow-hidden mb-5" style={{ maxHeight: maxImageHeight }}>
          <img src={project.imageUrl} alt={project.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Video embed */}
      {embed && (
        <div className="w-full rounded-xl overflow-hidden mb-5" style={{ aspectRatio: embed.vertical ? '9/16' : '16/9', maxHeight: embed.vertical ? '400px' : undefined }}>
          <iframe
            src={embed.src}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ border: 'none' }}
          />
        </div>
      )}

      {/* Description */}
      {project.description && (
        <p className="font-mono text-[13px] leading-relaxed opacity-60 mb-4" style={{ color: 'var(--foreground)' }}>
          {project.description}
        </p>
      )}

      {/* Tools used */}
      {toolTags.length > 0 && (
        <div className="mb-5">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] mb-2 font-bold opacity-40" style={{ color: 'var(--foreground)' }}>Tools Used</p>
          <div className="flex flex-wrap gap-1.5">
            {toolTags.map(tag => {
              const toolName = tag.replace('tool:', '');
              const toolSlug = toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              return (
                <a
                  key={tag}
                  href={`/resources/tools#${toolSlug}`}
                  className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border hover:opacity-70 transition inline-flex items-center gap-1"
                  style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  {toolName}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {regularTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {regularTags.map(tag => (
            <span
              key={tag}
              className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Markdown content */}
      {project.content && (
        <div className="mb-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {project.content}
          </ReactMarkdown>
        </div>
      )}

      {/* Links */}
      {(project.url || projectLinks.length > 0) && (
        <div className="flex flex-wrap gap-2 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          {project.url && (
            <a
              href={project.url.startsWith('http') ? project.url : `https://${project.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full border hover:opacity-70 transition"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              Visit →
            </a>
          )}
          {projectLinks.map((link, i) => (
            <a
              key={i}
              href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full border hover:opacity-70 transition"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              {link.label} →
            </a>
          ))}
        </div>
      )}
    </>
  );
}
