'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageShell from '../../components/PageShell';

const TABS = [
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/cookies', label: 'Cookies' },
];

export default function LegalLayout({
  eyebrow,
  title,
  lastUpdated,
  content,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  content: string;
}) {
  const pathname = usePathname();

  return (
    <PageShell>
      <section
        className="min-h-screen px-4 md:px-6 py-4 md:py-6"
        style={{ backgroundColor: 'var(--page-bg)' }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Header — accent block, mirrors the contact page treatment */}
          <div
            className="p-5 md:p-8 rounded-lg mb-8"
            style={{ backgroundColor: 'var(--accent, #e4fe52)' }}
          >
            <span
              className="font-mono text-[12px] uppercase tracking-[2px] opacity-50"
              style={{ color: 'var(--accent-text, #1a1a1a)' }}
            >
              {eyebrow}
            </span>
            <h1
              className="font-basement font-black text-[clamp(32px,5vw,64px)] leading-[0.9] uppercase mt-2"
              style={{ color: 'var(--accent-text, #1a1a1a)' }}
            >
              {title}
            </h1>
            <span
              className="font-mono text-[12px] uppercase tracking-[1px] opacity-50 block mt-4"
              style={{ color: 'var(--accent-text, #1a1a1a)' }}
            >
              Last updated: {lastUpdated}
            </span>
          </div>

          {/* Tabs between the three legal docs */}
          <nav className="flex gap-2 mb-10 flex-wrap">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="legal-tab font-mono text-[12px] uppercase tracking-[1px] px-4 py-2 rounded-sm border no-underline transition-colors"
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--accent, #e4fe52)',
                          color: 'var(--accent-text, #1a1a1a)',
                          borderColor: 'transparent',
                        }
                      : {
                          color: 'var(--page-text)',
                          borderColor:
                            'color-mix(in srgb, var(--page-text) 20%, transparent)',
                        }
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          {/* Body */}
          <article className="legal-prose font-zirkon pb-24">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        </div>
      </section>

      <style jsx global>{`
        .legal-prose {
          color: var(--page-text);
          line-height: 1.7;
          font-size: 15px;
        }
        .legal-prose h2 {
          font-family: var(--font-basement);
          font-weight: 800;
          text-transform: uppercase;
          font-size: clamp(18px, 2.4vw, 24px);
          line-height: 1.1;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent);
        }
        .legal-prose h3 {
          font-family: var(--font-mono-ui);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 14px;
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
          opacity: 0.85;
        }
        .legal-prose p {
          margin-bottom: 1rem;
        }
        .legal-prose ul,
        .legal-prose ol {
          margin: 0 0 1rem 1.25rem;
          list-style-position: outside;
        }
        .legal-prose ul {
          list-style-type: disc;
        }
        .legal-prose ol {
          list-style-type: decimal;
        }
        .legal-prose li {
          margin-bottom: 0.5rem;
          padding-left: 0.25rem;
        }
        .legal-prose a {
          color: inherit;
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-color: var(--accent, #e4fe52);
        }
        .legal-prose a:hover {
          text-decoration-color: currentColor;
        }
        .legal-prose strong {
          font-weight: 700;
        }
        .legal-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0 1.5rem;
          font-size: 13px;
        }
        .legal-prose th,
        .legal-prose td {
          border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
          padding: 0.6rem 0.75rem;
          text-align: left;
          vertical-align: top;
        }
        .legal-prose th {
          font-family: var(--font-mono-ui);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 11px;
          background: color-mix(in srgb, currentColor 5%, transparent);
        }
        .legal-prose hr {
          border: none;
          border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent);
          margin: 2rem 0;
        }
        .legal-prose blockquote {
          border-left: 3px solid var(--accent, #e4fe52);
          padding-left: 1rem;
          margin: 1rem 0;
          opacity: 0.85;
          font-style: italic;
        }
        .legal-prose code {
          font-family: var(--font-mono-ui);
          font-size: 13px;
          background: color-mix(in srgb, currentColor 8%, transparent);
          padding: 0.1rem 0.35rem;
          border-radius: 3px;
        }
      `}</style>
    </PageShell>
  );
}
