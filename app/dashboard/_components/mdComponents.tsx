'use client';

import React from 'react';

export const mdComponents = {
  p: ({ children, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => <p className="font-mono text-[13px] leading-relaxed mb-3 last:mb-0" style={{ color: 'var(--foreground)' }} {...p}>{children}</p>,
  h1: ({ children, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="font-mono text-[18px] font-bold mb-3 mt-6 first:mt-0" style={{ color: 'var(--foreground)' }} {...p}>{children}</h1>,
  h2: ({ children, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="font-mono text-[16px] font-bold mb-2 mt-5 first:mt-0" style={{ color: 'var(--foreground)' }} {...p}>{children}</h2>,
  h3: ({ children, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="font-mono text-[14px] font-bold mb-2 mt-4 first:mt-0" style={{ color: 'var(--foreground)' }} {...p}>{children}</h3>,
  ul: ({ children, ...p }: React.HTMLAttributes<HTMLUListElement>) => <ul className="font-mono text-[13px] list-disc pl-5 mb-3 space-y-1" style={{ color: 'var(--foreground)' }} {...p}>{children}</ul>,
  ol: ({ children, ...p }: React.HTMLAttributes<HTMLOListElement>) => <ol className="font-mono text-[13px] list-decimal pl-5 mb-3 space-y-1" style={{ color: 'var(--foreground)' }} {...p}>{children}</ol>,
  li: ({ children, ...p }: React.HTMLAttributes<HTMLLIElement>) => <li className="font-mono text-[13px] leading-relaxed" style={{ color: 'var(--foreground)' }} {...p}>{children}</li>,
  a: ({ children, href, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-60 transition" style={{ color: 'var(--foreground)' }} {...p}>{children}</a>,
  blockquote: ({ children, ...p }: React.HTMLAttributes<HTMLQuoteElement>) => <blockquote className="border-l-2 pl-4 my-3 opacity-80" style={{ borderColor: 'var(--border-color)' }} {...p}>{children}</blockquote>,
  code: ({ children, ...p }: React.HTMLAttributes<HTMLElement>) => <code className="font-mono text-[12px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-hover)' }} {...p}>{children}</code>,
  strong: ({ children, ...p }: React.HTMLAttributes<HTMLElement>) => <strong className="font-bold" {...p}>{children}</strong>,
};
