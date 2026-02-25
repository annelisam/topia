'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../../../components/Navigation';
import { SocialIcon, SOCIAL_PLATFORMS } from '../../../components/SocialIcons';

interface SocialLinks {
  website?: string;
  twitter?: string;
  instagram?: string;
  soundcloud?: string;
  spotify?: string;
  linkedin?: string;
  substack?: string;
}

interface WorldData {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  headerImageUrl: string | null;
  tools: string | null;
  socialLinks: SocialLinks | null;
  members: { userId: string; role: string; userName: string | null; userUsername: string | null }[];
}

interface ToolOption {
  id: string;
  name: string;
}

const inputCls = 'w-full border px-3 py-2 font-mono text-[13px] outline-none transition-colors rounded-sm';
const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.15em] mb-1.5 font-bold opacity-60';

/* ── Markdown preview components ──────────────────────────────── */

const markdownComponents = {
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

/* ── Markdown toolbar helper ──────────────────────────────────── */

function MarkdownToolbar({ onInsert }: { onInsert: (before: string, after: string, placeholder: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-sm cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('**', '**', 'bold')} title="Bold"><strong>B</strong></button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-sm cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('*', '*', 'italic')} title="Italic"><em>I</em></button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-sm cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('[', '](url)', 'link text')} title="Link">Link</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-sm cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('## ', '', 'Heading')} title="Heading">H2</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-sm cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('- ', '', 'list item')} title="List">List</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-sm cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('> ', '', 'quote')} title="Quote">Quote</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-sm cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('\n---\n', '', '')} title="Divider">---</button>
    </div>
  );
}

/* ── Main Edit Page ───────────────────────────────────────────── */

export default function EditWorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, authenticated, ready } = usePrivy();

  const [world, setWorld] = useState<WorldData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allTools, setAllTools] = useState<ToolOption[]>([]);
  const [descriptionPreview, setDescriptionPreview] = useState(false);

  // Form state
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [tools, setTools] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [toolSearch, setToolSearch] = useState('');

  // Fetch world data
  useEffect(() => {
    fetch(`/api/worlds?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.worlds?.length > 0) {
          const w = data.worlds[0];
          setWorld(w);
          setShortDescription(w.shortDescription || '');
          setDescription(w.description || '');
          setImageUrl(w.imageUrl || '');
          setHeaderImageUrl(w.headerImageUrl || '');
          setTools(w.tools || '');
          setSocialLinks((w.socialLinks as SocialLinks) || {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch available tools
    fetch('/api/admin/tools')
      .then(r => r.json())
      .then(d => setAllTools((d.tools || []).map((t: ToolOption) => ({ id: t.id, name: t.name }))))
      .catch(() => {});
  }, [slug]);

  // Resolve current user
  useEffect(() => {
    if (ready && authenticated && user?.id) {
      fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
        .then(r => r.json())
        .then(d => {
          if (d.user) setCurrentUserId(d.user.id);
        })
        .catch(() => {});
    }
  }, [ready, authenticated, user?.id]);

  // Check authorization
  useEffect(() => {
    if (world && currentUserId) {
      const isBuilder = world.members.some(
        m => m.userId === currentUserId && m.role === 'world_builder'
      );
      setAuthorized(isBuilder);
    }
  }, [world, currentUserId]);

  const selectedTools = tools.split(',').map(t => t.trim()).filter(Boolean);

  const toggleTool = (toolName: string) => {
    const current = tools.split(',').map(t => t.trim()).filter(Boolean);
    const next = current.includes(toolName)
      ? current.filter(t => t !== toolName)
      : [...current, toolName];
    setTools(next.join(', '));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setHeaderImageUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const insertMarkdown = (before: string, after: string, placeholder: string) => {
    const textarea = document.getElementById('description-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = description.substring(start, end);
    const text = selected || placeholder;
    const newText = description.substring(0, start) + before + text + after + description.substring(end);
    setDescription(newText);
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + text.length + after.length;
      textarea.setSelectionRange(
        selected ? newCursorPos : start + before.length,
        selected ? newCursorPos : start + before.length + text.length
      );
    }, 0);
  };

  const save = async () => {
    if (!world || !user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/worlds/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worldId: world.id,
        privyId: user.id,
        shortDescription: shortDescription || null,
        description: description || null,
        imageUrl: imageUrl || null,
        headerImageUrl: headerImageUrl || null,
        tools: tools || null,
        socialLinks: Object.values(socialLinks).some(v => v) ? socialLinks : null,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }

    setSuccess('Saved');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Loading state
  if (loading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="worlds" />
        <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>Loading...</p>
      </div>
    );
  }

  // Not found
  if (!world) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="worlds" />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>World not found.</p>
        <Link href="/worlds" className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to Worlds</Link>
      </div>
    );
  }

  // Not authorized
  if (!authenticated || !authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="worlds" />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>
          {!authenticated ? 'Please log in to edit this world.' : 'You are not a world builder for this world.'}
        </p>
        <Link href={`/worlds/${slug}`} className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to World</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation currentPage="worlds" />

      <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/worlds/${slug}`} className="font-mono text-[12px] uppercase tracking-widest hover:opacity-60 transition" style={{ color: 'var(--foreground)' }}>
            ← {world.title}
          </Link>
        </div>

        <div className="max-w-2xl">
          <h1 className="font-mono text-[20px] font-bold uppercase mb-8" style={{ color: 'var(--foreground)' }}>
            Edit World
          </h1>

          {/* World Image (circle) */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>World Image</label>
            <p className="font-mono text-[10px] opacity-30 mb-2" style={{ color: 'var(--foreground)' }}>Displayed as a circle on your world page</p>
            {imageUrl && (
              <div className="mb-3 relative inline-block">
                <img src={imageUrl} alt="preview" className="w-24 h-24 rounded-full object-cover border-2" style={{ borderColor: 'var(--border-color)' }} />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full font-mono text-[10px] transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
                >
                  ×
                </button>
              </div>
            )}
            <div>
              <label
                className="inline-block px-4 py-2 border font-mono text-[12px] uppercase tracking-widest cursor-pointer transition-all rounded-sm theme-hover-invert"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                {imageUrl ? 'Change Image' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Header Image (banner) */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Header Image</label>
            <p className="font-mono text-[10px] opacity-30 mb-2" style={{ color: 'var(--foreground)' }}>Recommended: 16:9 ratio. Shown as a banner at the top of your world page.</p>
            {(headerImageUrl || (!headerImageUrl && imageUrl)) && (
              <div className="mb-3 relative inline-block">
                <img
                  src={headerImageUrl || imageUrl}
                  alt="header preview"
                  className="w-full max-w-md h-32 object-cover object-top border rounded-sm"
                  style={{ borderColor: 'var(--border-color)', opacity: headerImageUrl ? 1 : 0.5 }}
                />
                {!headerImageUrl && imageUrl && (
                  <span className="absolute bottom-2 left-2 font-mono text-[10px] px-2 py-0.5 rounded-sm" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                    Using world image as default
                  </span>
                )}
                {headerImageUrl && (
                  <button
                    onClick={() => setHeaderImageUrl('')}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full font-mono text-[11px] transition hover:opacity-80"
                    style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            <div>
              <label
                className="inline-block px-4 py-2 border font-mono text-[12px] uppercase tracking-widest cursor-pointer transition-all rounded-sm theme-hover-invert"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                {headerImageUrl ? 'Change Header' : 'Upload Header'}
                <input type="file" accept="image/*" onChange={handleHeaderImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Short Description */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Short Description</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief one-line description"
              className={inputCls}
              style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            />
          </div>

          {/* Long Description with markdown toolbar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold opacity-60" style={{ color: 'var(--foreground)' }}>About</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDescriptionPreview(false)}
                  className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm transition-all"
                  style={!descriptionPreview
                    ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                    : { color: 'var(--foreground)', opacity: 0.4 }
                  }
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setDescriptionPreview(true)}
                  className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm transition-all"
                  style={descriptionPreview
                    ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                    : { color: 'var(--foreground)', opacity: 0.4 }
                  }
                >
                  Preview
                </button>
              </div>
            </div>

            {!descriptionPreview ? (
              <>
                <MarkdownToolbar onInsert={insertMarkdown} />
                <textarea
                  id="description-editor"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={10}
                  placeholder="Write about this world... Supports **bold**, *italic*, [links](url), ## headings, - lists, > quotes"
                  className={inputCls}
                  style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)', resize: 'vertical', minHeight: '180px' }}
                />
                <p className="font-mono text-[10px] mt-1 opacity-30" style={{ color: 'var(--foreground)' }}>
                  Supports Markdown formatting
                </p>
              </>
            ) : (
              <div
                className="border px-4 py-3 rounded-sm min-h-[180px]"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
              >
                {description ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {description}
                  </ReactMarkdown>
                ) : (
                  <p className="font-mono text-[13px] opacity-30" style={{ color: 'var(--foreground)' }}>Nothing to preview</p>
                )}
              </div>
            )}
          </div>

          {/* Tools */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Tools</label>
            {/* Selected tools as removable chips */}
            {selectedTools.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedTools.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleTool(name)}
                    className="flex items-center gap-1 px-2.5 py-1 border font-mono text-[12px] rounded-sm transition hover:opacity-70"
                    style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
                  >
                    {name}
                    <span className="text-[10px] opacity-50 ml-0.5">×</span>
                  </button>
                ))}
              </div>
            )}
            {allTools.length > 0 ? (
              <>
                <input
                  type="text"
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  placeholder="Search tools..."
                  className={inputCls + ' mb-2'}
                  style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                />
                <div className="border p-3 max-h-48 overflow-y-auto rounded-sm" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
                  {allTools
                    .filter(t => !toolSearch || t.name.toLowerCase().includes(toolSearch.toLowerCase()))
                    .map(t => (
                      <label key={t.id} className="flex items-center gap-2 py-1 cursor-pointer hover:opacity-70 transition">
                        <input
                          type="checkbox"
                          checked={selectedTools.includes(t.name)}
                          onChange={() => toggleTool(t.name)}
                          className="w-3.5 h-3.5"
                          style={{ accentColor: 'var(--foreground)' }}
                        />
                        <span className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>{t.name}</span>
                      </label>
                    ))}
                  {allTools.filter(t => !toolSearch || t.name.toLowerCase().includes(toolSearch.toLowerCase())).length === 0 && (
                    <p className="font-mono text-[12px] opacity-40 py-1" style={{ color: 'var(--foreground)' }}>No tools match "{toolSearch}"</p>
                  )}
                </div>
              </>
            ) : (
              <input
                type="text"
                value={tools}
                onChange={(e) => setTools(e.target.value)}
                placeholder="Comma-separated tool names"
                className={inputCls}
                style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              />
            )}
          </div>

          {/* Social Links */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Social Links</label>
            <div className="space-y-3">
              {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-tight mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                    <SocialIcon type={key} size={16} />
                    {label}
                  </label>
                  <input
                    type="url"
                    value={(socialLinks as Record<string, string | undefined>)[key] || ''}
                    onChange={(e) => setSocialLinks(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border-b bg-transparent font-mono text-[13px] py-2 outline-none"
                    style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-10 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2 font-mono text-[12px] uppercase tracking-widest hover:opacity-80 transition disabled:opacity-40 rounded-sm"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/worlds/${slug}`}
              className="px-6 py-2 font-mono text-[12px] uppercase tracking-widest border hover:opacity-70 transition rounded-sm"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              Cancel
            </Link>
            {error && <span className="font-mono text-[12px]" style={{ color: '#FF5C34' }}>{error}</span>}
            {success && <span className="font-mono text-[12px]" style={{ color: '#00AA55' }}>{success}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
