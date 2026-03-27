'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../../../components/Navigation';
import LoadingBar from '../../../components/LoadingBar';
import WorldGlobe from '../../../components/WorldGlobe';
import { SocialIcon, SOCIAL_PLATFORMS } from '../../../components/SocialIcons';

/* ── Types ────────────────────────────────────────────────────── */

interface SocialLinks { website?: string; twitter?: string; instagram?: string; soundcloud?: string; spotify?: string; linkedin?: string; substack?: string; }
interface PendingInvite { invitationId: string; inviteeId: string; role: string; inviteeName: string | null; inviteeUsername: string | null; }
interface WorldData {
  id: string; title: string; slug: string; shortDescription: string | null; description: string | null;
  imageUrl: string | null; headerImageUrl: string | null; tools: string | null; socialLinks: SocialLinks | null;
  members: { userId: string; role: string; userName: string | null; userUsername: string | null }[];
  pendingInvites?: PendingInvite[];
}
interface ToolOption { id: string; name: string; slug: string; }
interface SearchUser { id: string; username: string | null; name: string | null; avatarUrl: string | null; }
interface ProjectItem {
  id: string; name: string; slug: string; description?: string | null; content?: string | null;
  imageUrl?: string | null; videoUrl?: string | null; url?: string | null;
  links?: { label: string; url: string }[] | null; tags?: string[] | null;
}

/* ── Shared styles ────────────────────────────────────────────── */

const inputCls = 'w-full border px-3 py-2.5 font-mono text-[13px] outline-none transition-colors rounded-lg';
const labelCls = 'block font-mono text-[9px] uppercase tracking-[0.2em] mb-1.5 font-bold opacity-40';

type Tab = 'overview' | 'details' | 'projects' | 'members';

/* ── Markdown components ──────────────────────────────────────── */

const mdComponents = {
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

/* ── Markdown toolbar ─────────────────────────────────────────── */

function MdToolbar({ tid, value, onChange }: { tid: string; value: string; onChange: (v: string) => void }) {
  const ins = (before: string, after: string, ph: string) => {
    const ta = document.getElementById(tid) as HTMLTextAreaElement;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.substring(s, e) || ph;
    onChange(value.substring(0, s) + before + sel + after + value.substring(e));
    setTimeout(() => { ta.focus(); const pos = s + before.length; ta.setSelectionRange(pos, pos + sel.length); }, 0);
  };
  const bc = 'px-2 py-1 font-mono text-[10px] border rounded transition hover:opacity-70 cursor-pointer';
  const bs = { color: 'var(--foreground)', borderColor: 'var(--border-color)' };
  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      <button type="button" className={bc} style={bs} onClick={() => ins('**','**','bold')}><strong>B</strong></button>
      <button type="button" className={bc} style={bs} onClick={() => ins('*','*','italic')}><em>I</em></button>
      <button type="button" className={bc} style={bs} onClick={() => ins('[','](url)','text')}>Link</button>
      <button type="button" className={bc} style={bs} onClick={() => ins('## ','','Heading')}>H2</button>
      <button type="button" className={bc} style={bs} onClick={() => ins('- ','','item')}>List</button>
      <button type="button" className={bc} style={bs} onClick={() => ins('> ','','quote')}>Quote</button>
    </div>
  );
}

/* ── Write/Preview toggle ─────────────────────────────────────── */

function WritePrevToggle({ preview, setPreview }: { preview: boolean; setPreview: (v: boolean) => void }) {
  const cls = 'font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded transition-all cursor-pointer';
  return (
    <div className="flex gap-0.5">
      <button type="button" onClick={() => setPreview(false)} className={cls} style={!preview ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' } : { color: 'var(--foreground)', opacity: 0.3 }}>Write</button>
      <button type="button" onClick={() => setPreview(true)} className={cls} style={preview ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' } : { color: 'var(--foreground)', opacity: 0.3 }}>Preview</button>
    </div>
  );
}

/* ── Image compress ───────────────────────────────────────────── */

function compressImage(file: File, maxW = 1200, q = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxW) { h = (h * maxW) / w; w = maxW; }
      c.width = w; c.height = h;
      c.getContext('2d')?.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.src = URL.createObjectURL(file);
  });
}

/* ── Tool Picker (reusable) ───────────────────────────────────── */

function ToolPicker({ allTools, selected, onToggle, search, setSearch }: {
  allTools: ToolOption[];
  selected: string[];
  onToggle: (name: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const filtered = allTools.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(name => (
            <button key={name} type="button" onClick={() => onToggle(name)} className="flex items-center gap-1 px-2 py-0.5 border font-mono text-[11px] rounded-lg transition hover:opacity-70" style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
              {name}<span className="text-[9px] opacity-40 ml-0.5">×</span>
            </button>
          ))}
        </div>
      )}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..." className={inputCls + ' mb-1.5'} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
      <div className="border rounded-lg max-h-36 overflow-y-auto" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
        {filtered.length === 0 ? (
          <p className="px-3 py-2 font-mono text-[11px] opacity-30" style={{ color: 'var(--foreground)' }}>No tools found</p>
        ) : filtered.map(t => (
          <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:opacity-70 transition border-b last:border-b-0" style={{ borderColor: 'var(--border-color)' }}>
            <input type="checkbox" checked={selected.includes(t.name)} onChange={() => onToggle(t.name)} className="w-3 h-3" style={{ accentColor: 'var(--foreground)' }} />
            <span className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>{t.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROJECT EDITOR
   ══════════════════════════════════════════════════════════════════ */

function ProjectEditor({
  project, worldId, privyId, allTools, onSave, onCancel,
}: {
  project: ProjectItem | null;
  worldId: string;
  privyId: string;
  allTools: ToolOption[];
  onSave: (p: ProjectItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [content, setContent] = useState(project?.content || '');
  const [imageUrl, setImageUrl] = useState(project?.imageUrl || '');
  const [videoUrl, setVideoUrl] = useState(project?.videoUrl || '');
  const [url, setUrl] = useState(project?.url || '');
  const [tags, setTags] = useState<string[]>((project?.tags as string[]) || []);
  const [tagInput, setTagInput] = useState('');
  const [links, setLinks] = useState<{ label: string; url: string }[]>((project?.links as { label: string; url: string }[]) || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [contentPreview, setContentPreview] = useState(false);
  const [toolSearch, setToolSearch] = useState('');

  // Parse "tools:" from tags for display, but store them as regular tags prefixed
  // Actually: let's use tags for tools too — tags starting with "tool:" are tools
  const toolTags = tags.filter(t => t.startsWith('tool:'));
  const regularTags = tags.filter(t => !t.startsWith('tool:'));
  const selectedToolNames = toolTags.map(t => t.replace('tool:', ''));

  const toggleTool = (toolName: string) => {
    const tag = `tool:${toolName}`;
    if (tags.includes(tag)) setTags(tags.filter(t => t !== tag));
    else setTags([...tags, tag]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(await compressImage(file));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const addLink = () => setLinks([...links, { label: '', url: '' }]);
  const updateLink = (i: number, field: 'label' | 'url', val: string) => {
    const next = [...links]; next[i] = { ...next[i], [field]: val }; setLinks(next);
  };
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name.trim()) { setError('Project name is required'); return; }
    setSaving(true); setError('');
    try {
      const method = project ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        worldId, privyId,
        name: name.trim(),
        description: description.trim() || null,
        content: content.trim() || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl.trim() || null,
        url: url.trim() || null,
        tags: tags.length > 0 ? tags : null,
        links: links.filter(l => l.label && l.url).length > 0 ? links.filter(l => l.label && l.url) : null,
      };
      if (project) body.projectId = project.id;
      const res = await fetch('/api/worlds/projects', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return; }
      onSave(data.project);
    } catch { setError('Failed to save project'); } finally { setSaving(false); }
  };

  return (
    <div className="border rounded-xl p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-mono text-[13px] font-bold uppercase" style={{ color: 'var(--foreground)' }}>
          {project ? 'Edit Project' : 'New Project'}
        </h3>
        <button onClick={onCancel} className="font-mono text-[14px] opacity-30 hover:opacity-100 transition" style={{ color: 'var(--foreground)' }}>×</button>
      </div>

      <div className="space-y-5">
        {/* Row 1: Name + Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Project Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="My Project" className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
          </div>
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Short Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief one-liner..." className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
          </div>
        </div>

        {/* Row 2: Image + Video */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Cover Image</label>
            {imageUrl && (
              <div className="mb-2 relative inline-block">
                <img src={imageUrl} alt="" className="max-w-full h-24 object-cover border rounded-lg" style={{ borderColor: 'var(--border-color)' }} />
                <button onClick={() => setImageUrl('')} className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full font-mono text-[9px]" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>×</button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <label className="shrink-0 px-3 py-2 border font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-lg transition hover:opacity-70" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                Upload
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <input type="url" value={imageUrl.startsWith('data:') ? '' : imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="or paste URL" className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
            </div>
          </div>
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Video URL</label>
            <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube, Vimeo, etc." className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
            <p className="font-mono text-[9px] mt-1 opacity-25" style={{ color: 'var(--foreground)' }}>YouTube, Vimeo, Instagram, TikTok</p>
          </div>
        </div>

        {/* Content (Markdown) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls} style={{ color: 'var(--foreground)', marginBottom: 0 }}>Content</label>
            <WritePrevToggle preview={contentPreview} setPreview={setContentPreview} />
          </div>
          {!contentPreview ? (
            <>
              <MdToolbar tid="proj-content" value={content} onChange={setContent} />
              <textarea id="proj-content" value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Write about this project... Supports **bold**, *italic*, [links](url)" className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)', resize: 'vertical', minHeight: '120px' }} />
            </>
          ) : (
            <div className="border px-4 py-3 rounded-lg min-h-[120px]" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
              {content ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{content}</ReactMarkdown> : <p className="font-mono text-[12px] opacity-25" style={{ color: 'var(--foreground)' }}>Nothing to preview</p>}
            </div>
          )}
        </div>

        {/* Tools used */}
        {allTools.length > 0 && (
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Tools Used</label>
            <ToolPicker allTools={allTools} selected={selectedToolNames} onToggle={toggleTool} search={toolSearch} setSearch={setToolSearch} />
          </div>
        )}

        {/* Tags + URL in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Tags</label>
            {regularTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {regularTags.map(t => (
                  <button key={t} type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="flex items-center gap-0.5 px-2 py-0.5 border font-mono text-[10px] rounded-full transition hover:opacity-70" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    {t}<span className="text-[8px] opacity-40">×</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add tag..." className={inputCls + ' flex-1'} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
              <button type="button" onClick={addTag} className="px-2.5 py-2 border font-mono text-[10px] uppercase rounded-lg transition hover:opacity-70" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>+</button>
            </div>
          </div>
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Project URL</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
          </div>
        </div>

        {/* Additional Links */}
        <div>
          <label className={labelCls} style={{ color: 'var(--foreground)' }}>Additional Links</label>
          {links.map((link, i) => (
            <div key={i} className="flex gap-2 mb-1.5">
              <input type="text" value={link.label} onChange={e => updateLink(i, 'label', e.target.value)} placeholder="Label" className={inputCls + ' flex-1'} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
              <input type="url" value={link.url} onChange={e => updateLink(i, 'url', e.target.value)} placeholder="https://..." className={inputCls + ' flex-1'} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
              <button type="button" onClick={() => removeLink(i)} className="font-mono text-[13px] opacity-30 hover:opacity-100 transition px-1" style={{ color: 'var(--foreground)' }}>×</button>
            </div>
          ))}
          <button type="button" onClick={addLink} className="font-mono text-[10px] uppercase tracking-widest opacity-40 hover:opacity-80 transition" style={{ color: 'var(--foreground)' }}>+ Add link</button>
        </div>

        {/* Actions */}
        {error && <p className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving} className="px-5 py-2 font-mono text-[11px] uppercase tracking-widest hover:opacity-80 transition disabled:opacity-40 rounded-lg" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
            {saving ? 'Saving...' : project ? 'Save' : 'Create'}
          </button>
          <button onClick={onCancel} className="px-5 py-2 font-mono text-[11px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EDIT PAGE
   ══════════════════════════════════════════════════════════════════ */

export default function EditWorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, authenticated, ready } = usePrivy();

  const [world, setWorld] = useState<WorldData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Details
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [tools, setTools] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [allTools, setAllTools] = useState<ToolOption[]>([]);
  const [toolSearch, setToolSearch] = useState('');
  const [descPreview, setDescPreview] = useState(false);

  // Members
  const [members, setMembers] = useState<WorldData['members']>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<SearchUser[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [memberRole, setMemberRole] = useState<'world_builder' | 'collaborator'>('collaborator');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  // Projects
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [editingProject, setEditingProject] = useState<ProjectItem | null | 'new'>(null);

  // Fetch
  useEffect(() => {
    const worldP = fetch(`/api/worlds?slug=${slug}`).then(r => r.json()).then(data => {
      if (data.worlds?.length > 0) {
        const w = data.worlds[0];
        setWorld(w);
        setShortDescription(w.shortDescription || '');
        setDescription(w.description || '');
        setImageUrl(w.imageUrl || '');
        setHeaderImageUrl(w.headerImageUrl || '');
        setTools(w.tools || '');
        setSocialLinks((w.socialLinks as SocialLinks) || {});
        setMembers(w.members || []);
        setPendingInvites(w.pendingInvites || []);
      }
    });
    const toolsP = fetch('/api/tools').then(r => r.json()).then(d => setAllTools(d.tools || [])).catch(() => {});
    const userP = (ready && authenticated && user?.id)
      ? fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`).then(r => r.json()).then(d => { if (d.user) setCurrentUserId(d.user.id); }).catch(() => {})
      : Promise.resolve();
    Promise.all([worldP, toolsP, userP]).catch(console.error).finally(() => setLoading(false));
  }, [slug, ready, authenticated, user?.id]);

  useEffect(() => {
    if (!world?.id) return;
    fetch(`/api/worlds/projects?worldId=${world.id}`).then(r => r.json()).then(d => setProjects(d.projects || [])).catch(console.error);
  }, [world?.id]);

  useEffect(() => {
    if (world && currentUserId) setAuthorized(world.members.some(m => m.userId === currentUserId && m.role === 'world_builder'));
  }, [world, currentUserId]);

  // Member search debounce
  useEffect(() => {
    if (memberSearch.length < 2) { setMemberSearchResults([]); return; }
    const t = setTimeout(() => {
      if (!user) return;
      setMemberSearching(true);
      fetch(`/api/users/search?q=${encodeURIComponent(memberSearch)}&privyId=${encodeURIComponent(user.id)}`)
        .then(r => r.json()).then(d => setMemberSearchResults(d.users || [])).catch(() => setMemberSearchResults([]))
        .finally(() => setMemberSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch, user]);

  const selectedTools = tools.split(',').map(t => t.trim()).filter(Boolean);
  const toggleTool = (name: string) => {
    const c = tools.split(',').map(t => t.trim()).filter(Boolean);
    setTools((c.includes(name) ? c.filter(t => t !== name) : [...c, name]).join(', '));
  };

  const saveDetails = async () => {
    if (!world || !user) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/worlds/update', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldId: world.id, privyId: user.id, shortDescription: shortDescription || null, description: description || null, imageUrl: imageUrl || null, headerImageUrl: headerImageUrl || null, tools: tools || null, socialLinks: Object.values(socialLinks).some(v => v) ? socialLinks : null }),
      });
      if (!res.ok) { let msg = 'Save failed'; try { const d = await res.json(); msg = d.error || msg; } catch { if (res.status === 413) msg = 'Images are too large.'; } setError(msg); return; }
      await res.json();
      setSuccess('Saved'); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); } finally { setSaving(false); }
  };

  const addMember = async (target: SearchUser) => {
    if (!world || !user) return;
    setAddingMember(true); setMemberError(''); setMemberSuccess('');
    try {
      const res = await fetch('/api/worlds/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privyId: user.id, worldId: world.id, targetUserId: target.id, role: memberRole }) });
      const data = await res.json();
      if (!res.ok) { setMemberError(data.error || 'Failed'); return; }
      setPendingInvites(p => [...p, { invitationId: data.invitationId, inviteeId: target.id, role: memberRole, inviteeName: target.name, inviteeUsername: target.username }]);
      setMemberSearch(''); setMemberSearchResults([]);
      setMemberSuccess(`Invite sent to ${target.username || target.name || 'user'}`);
      setTimeout(() => setMemberSuccess(''), 3000);
    } catch { setMemberError('Failed'); } finally { setAddingMember(false); }
  };

  const removeMember = async (targetUserId: string) => {
    if (!world || !user) return; setMemberError('');
    try {
      const res = await fetch('/api/worlds/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privyId: user.id, worldId: world.id, targetUserId }) });
      const data = await res.json();
      if (!res.ok) { setMemberError(data.error || 'Failed'); return; }
      setMembers(p => p.filter(m => m.userId !== targetUserId));
    } catch { setMemberError('Failed'); }
  };

  const deleteProject = async (id: string) => {
    if (!world || !user) return;
    try {
      const res = await fetch('/api/worlds/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: id, worldId: world.id, privyId: user.id }) });
      if (res.ok) setProjects(p => p.filter(x => x.id !== id));
    } catch { /* */ }
  };

  const worldBuilderCount = members.filter(m => m.role === 'world_builder').length;

  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { key: 'details', label: 'Details', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
    { key: 'projects', label: 'Projects', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
    { key: 'members', label: 'Members', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  ];

  // Guards
  if (loading || !ready || (authenticated && !currentUserId)) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}><Navigation currentPage="worlds" /><LoadingBar /></div>;
  if (!world) return <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'var(--background)' }}><Navigation currentPage="worlds" /><p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>World not found.</p><Link href="/worlds" className="font-mono text-[12px] underline" style={{ color: 'var(--foreground)' }}>← Back</Link></div>;
  if (!authenticated || !authorized) return <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'var(--background)' }}><Navigation currentPage="worlds" /><p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>{!authenticated ? 'Please log in.' : 'Not authorized.'}</p><Link href={`/worlds/${slug}`} className="font-mono text-[12px] underline" style={{ color: 'var(--foreground)' }}>← Back</Link></div>;

  return (
    <div className="min-h-screen overflow-x-hidden relative z-10" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation currentPage="worlds" />

      {/* Mobile tab bar */}
      <div className="sm:hidden fixed top-[60px] left-0 right-0 z-30 overflow-x-auto border-b" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
        <div className="flex px-4 py-2 gap-1">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)} className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap transition-all shrink-0 cursor-pointer" style={activeTab === item.key ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' } : { color: 'var(--foreground)', opacity: 0.3 }}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden sm:flex flex-col fixed top-0 left-0 h-full w-56 pt-20 z-20 border-r" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
        {/* World identity */}
        <div className="px-5 pb-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5 mb-2">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-9 h-9 rounded-full object-cover border shrink-0" style={{ borderColor: 'var(--border-color)' }} />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-[12px] font-bold shrink-0" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                {world.title[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-mono text-[12px] font-bold truncate" style={{ color: 'var(--foreground)' }}>{world.title}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest opacity-30" style={{ color: 'var(--foreground)' }}>Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-[11px] transition-all cursor-pointer"
              style={activeTab === item.key
                ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                : { color: 'var(--foreground)', opacity: 0.5 }
              }
            >
              <span className="shrink-0 opacity-70">{item.icon}</span>
              <span className="uppercase tracking-widest">{item.label}</span>
              {item.key === 'projects' && projects.length > 0 && (
                <span className="ml-auto font-mono text-[9px] opacity-50">{projects.length}</span>
              )}
              {item.key === 'members' && members.length > 0 && (
                <span className="ml-auto font-mono text-[9px] opacity-50">{members.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <Link href={`/worlds/${slug}`} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest opacity-40 hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View World
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="pt-28 sm:pt-24 sm:ml-56 px-4 sm:px-8 pb-16">
        <div className="max-w-4xl">

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 'overview' && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold uppercase mb-6" style={{ color: 'var(--foreground)' }}>Overview</h1>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="font-mono text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--foreground)' }}>{projects.length}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-40" style={{ color: 'var(--foreground)' }}>Projects</p>
                </div>
                <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="font-mono text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--foreground)' }}>{members.length}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-40" style={{ color: 'var(--foreground)' }}>Members</p>
                </div>
                <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="font-mono text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--foreground)' }}>{pendingInvites.length}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-40" style={{ color: 'var(--foreground)' }}>Pending Invites</p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mb-8">
                <p className={labelCls} style={{ color: 'var(--foreground)' }}>Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setActiveTab('projects'); setEditingProject('new'); }} className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition cursor-pointer" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    + Add Project
                  </button>
                  <button onClick={() => setActiveTab('members')} className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition cursor-pointer" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    + Invite Member
                  </button>
                  <button onClick={() => setActiveTab('details')} className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition cursor-pointer" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    Edit Details
                  </button>
                </div>
              </div>

              {/* Globe preview */}
              {projects.length > 0 && (
                <div className="border rounded-xl overflow-hidden relative" style={{ borderColor: 'var(--border-color)', height: '320px' }}>
                  <div className="absolute inset-0">
                    <WorldGlobe projects={projects} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ DETAILS TAB ═══ */}
          {activeTab === 'details' && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold uppercase mb-6" style={{ color: 'var(--foreground)' }}>Details</h1>

              {/* Images card */}
              <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                <p className={labelCls} style={{ color: 'var(--foreground)' }}>Images</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <p className="font-mono text-[11px] mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>World Image</p>
                    {imageUrl && (
                      <div className="mb-2 relative inline-block">
                        <img src={imageUrl} alt="" className="w-20 h-20 rounded-full object-cover border" style={{ borderColor: 'var(--border-color)' }} />
                        <button onClick={() => setImageUrl('')} className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full font-mono text-[9px]" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>×</button>
                      </div>
                    )}
                    <label className="inline-block px-3 py-2 border font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-lg transition hover:opacity-70" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                      {imageUrl ? 'Change' : 'Upload'}
                      <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImageUrl(await compressImage(f)); }} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>Header Image</p>
                    {headerImageUrl && (
                      <div className="mb-2 relative inline-block">
                        <img src={headerImageUrl} alt="" className="max-w-full h-20 object-cover border rounded-lg" style={{ borderColor: 'var(--border-color)' }} />
                        <button onClick={() => setHeaderImageUrl('')} className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full font-mono text-[9px]" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>×</button>
                      </div>
                    )}
                    <label className="inline-block px-3 py-2 border font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-lg transition hover:opacity-70" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                      {headerImageUrl ? 'Change' : 'Upload'}
                      <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setHeaderImageUrl(await compressImage(f, 1600)); }} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Description card */}
              <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                <p className={labelCls} style={{ color: 'var(--foreground)' }}>Description</p>
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-[11px] mb-1.5 block opacity-50" style={{ color: 'var(--foreground)' }}>Short Description</label>
                    <input type="text" value={shortDescription} onChange={e => setShortDescription(e.target.value)} placeholder="Brief one-liner" className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>About</label>
                      <WritePrevToggle preview={descPreview} setPreview={setDescPreview} />
                    </div>
                    {!descPreview ? (
                      <>
                        <MdToolbar tid="desc-editor" value={description} onChange={setDescription} />
                        <textarea id="desc-editor" value={description} onChange={e => setDescription(e.target.value)} rows={8} placeholder="Write about this world..." className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)', resize: 'vertical', minHeight: '150px' }} />
                      </>
                    ) : (
                      <div className="border px-4 py-3 rounded-lg min-h-[150px]" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
                        {description ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{description}</ReactMarkdown> : <p className="font-mono text-[12px] opacity-25" style={{ color: 'var(--foreground)' }}>Nothing to preview</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tools & Social card */}
              <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                <p className={labelCls} style={{ color: 'var(--foreground)' }}>Tools & Social</p>
                <div className="space-y-5">
                  <div>
                    <label className="font-mono text-[11px] mb-1.5 block opacity-50" style={{ color: 'var(--foreground)' }}>Tools</label>
                    {allTools.length > 0 ? (
                      <ToolPicker allTools={allTools} selected={selectedTools} onToggle={toggleTool} search={toolSearch} setSearch={setToolSearch} />
                    ) : (
                      <input type="text" value={tools} onChange={e => setTools(e.target.value)} placeholder="Comma-separated" className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
                    )}
                  </div>
                  <div>
                    <label className="font-mono text-[11px] mb-2 block opacity-50" style={{ color: 'var(--foreground)' }}>Social Links</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
                        <div key={key} className="flex items-center gap-2">
                          <div className="opacity-30 shrink-0" style={{ color: 'var(--foreground)' }}><SocialIcon type={key} size={14} /></div>
                          <input type="url" value={(socialLinks as Record<string, string | undefined>)[key] || ''} onChange={e => setSocialLinks(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="flex-1 border-b bg-transparent font-mono text-[12px] py-1.5 outline-none" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 pt-3">
                <button onClick={saveDetails} disabled={saving} className="px-5 py-2 font-mono text-[11px] uppercase tracking-widest hover:opacity-80 transition disabled:opacity-40 rounded-lg" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {error && <span className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</span>}
                {success && <span className="font-mono text-[11px]" style={{ color: '#00AA55' }}>{success}</span>}
              </div>
            </div>
          )}

          {/* ═══ PROJECTS TAB ═══ */}
          {activeTab === 'projects' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl sm:text-2xl font-bold uppercase" style={{ color: 'var(--foreground)' }}>Projects</h1>
                {!editingProject && (
                  <button onClick={() => setEditingProject('new')} className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-80 transition cursor-pointer" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                    + Add Project
                  </button>
                )}
              </div>

              {/* Editor */}
              {editingProject && (
                <div className="mb-6">
                  <ProjectEditor
                    project={editingProject === 'new' ? null : editingProject}
                    worldId={world.id}
                    privyId={user!.id}
                    allTools={allTools}
                    onSave={(p) => {
                      if (editingProject === 'new') setProjects(prev => [...prev, p]);
                      else setProjects(prev => prev.map(x => x.id === p.id ? p : x));
                      setEditingProject(null);
                    }}
                    onCancel={() => setEditingProject(null)}
                  />
                </div>
              )}

              {/* Card grid */}
              {projects.length > 0 && !editingProject && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map(p => {
                    const pTags = ((p.tags as string[]) || []).filter(t => !t.startsWith('tool:'));
                    const pTools = ((p.tags as string[]) || []).filter(t => t.startsWith('tool:')).map(t => t.replace('tool:', ''));
                    return (
                      <div key={p.id} className="border rounded-xl overflow-hidden group relative" style={{ borderColor: 'var(--border-color)' }}>
                        {/* Image */}
                        {p.imageUrl ? (
                          <div className="w-full h-32 overflow-hidden">
                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-15" style={{ color: 'var(--foreground)' }}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                          </div>
                        )}
                        {/* Info */}
                        <div className="p-3">
                          <h4 className="font-mono text-[13px] font-bold uppercase truncate mb-0.5" style={{ color: 'var(--foreground)' }}>{p.name}</h4>
                          {p.description && <p className="font-mono text-[10px] opacity-50 truncate mb-2" style={{ color: 'var(--foreground)' }}>{p.description}</p>}
                          {(pTags.length > 0 || pTools.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {pTags.map(t => <span key={t} className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full border" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>{t}</span>)}
                              {pTools.map(t => <span key={t} className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ color: 'var(--background)', backgroundColor: 'var(--foreground)', opacity: 0.6 }}>{t}</span>)}
                            </div>
                          )}
                        </div>
                        {/* Hover actions */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingProject(p)} className="font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg hover:opacity-80 transition" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>Edit</button>
                          <button onClick={() => { if (confirm('Delete this project?')) deleteProject(p.id); }} className="font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg hover:opacity-80 transition" style={{ backgroundColor: '#FF5C34', color: '#fff' }}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {projects.length === 0 && !editingProject && (
                <div className="border-2 border-dashed rounded-xl py-12 text-center" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="font-mono text-[12px] opacity-30 mb-3" style={{ color: 'var(--foreground)' }}>No projects yet</p>
                  <button onClick={() => setEditingProject('new')} className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-80 transition cursor-pointer" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                    + Add Your First Project
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ MEMBERS TAB ═══ */}
          {activeTab === 'members' && (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold uppercase mb-6" style={{ color: 'var(--foreground)' }}>Members</h1>

              {/* Active members card */}
              <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                <p className={labelCls} style={{ color: 'var(--foreground)' }}>Active Members</p>
                {members.length > 0 ? (
                  <div className="space-y-1.5">
                    {members.map(m => (
                      <div key={m.userId} className="flex items-center gap-3 py-2 px-3 border rounded-lg" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)' }}>
                        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-mono text-[10px]" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 12%, transparent)', color: 'var(--foreground)', opacity: 0.5 }}>
                          {(m.userName || m.userUsername)?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-mono text-[12px] flex-1 truncate" style={{ color: 'var(--foreground)' }}>{m.userUsername ? `@${m.userUsername}` : m.userName || 'Unknown'}</span>
                        <span className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 border rounded-lg shrink-0 opacity-50" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                          {m.role === 'world_builder' ? 'Builder' : 'Collab'}
                        </span>
                        {!(m.role === 'world_builder' && worldBuilderCount <= 1) && (
                          <button onClick={() => removeMember(m.userId)} className="font-mono text-[12px] opacity-30 hover:opacity-100 transition shrink-0" style={{ color: 'var(--foreground)' }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[12px] opacity-30" style={{ color: 'var(--foreground)' }}>No members yet.</p>
                )}
              </div>

              {/* Pending invites card */}
              {pendingInvites.length > 0 && (
                <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                  <p className={labelCls} style={{ color: 'var(--foreground)' }}>Pending Invites</p>
                  <div className="space-y-1.5">
                    {pendingInvites.map(inv => (
                      <div key={inv.invitationId} className="flex items-center gap-3 py-2 px-3 border rounded-lg opacity-60" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)' }}>
                        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-mono text-[10px]" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 12%, transparent)', color: 'var(--foreground)', opacity: 0.3 }}>
                          {(inv.inviteeName || inv.inviteeUsername)?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-mono text-[12px] flex-1" style={{ color: 'var(--foreground)' }}>{inv.inviteeUsername ? `@${inv.inviteeUsername}` : inv.inviteeName || 'Unknown'}</span>
                        <span className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 border rounded-lg" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>Pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite card */}
              <div className="border rounded-xl p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
                <p className={labelCls} style={{ color: 'var(--foreground)' }}>Invite Member</p>
                <div className="flex gap-0.5 mb-3">
                  {(['world_builder', 'collaborator'] as const).map(role => (
                    <button key={role} type="button" onClick={() => setMemberRole(role)} className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded transition-all cursor-pointer" style={memberRole === role ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' } : { color: 'var(--foreground)', opacity: 0.3 }}>
                      {role === 'world_builder' ? 'Builder' : 'Collaborator'}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search by username..." className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} disabled={addingMember} />
                  {memberSearch.length >= 2 && (memberSearchResults.length > 0 || memberSearching) && (
                    <div className="absolute left-0 right-0 top-full mt-1 border rounded-lg z-10 max-h-40 overflow-y-auto shadow-lg" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
                      {memberSearching ? (
                        <div className="px-3 py-2"><span className="font-mono text-[11px] opacity-30" style={{ color: 'var(--foreground)' }}>Searching...</span></div>
                      ) : (
                        memberSearchResults.filter(u => !members.some(m => m.userId === u.id) && !pendingInvites.some(i => i.inviteeId === u.id)).map(u => (
                          <button key={u.id} type="button" onClick={() => addMember(u)} disabled={addingMember} className="w-full flex items-center gap-2.5 px-3 py-2 hover:opacity-70 transition text-left border-b last:border-b-0 disabled:opacity-40" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-mono text-[9px]" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 12%, transparent)', color: 'var(--foreground)' }}>
                              {(u.name || u.username)?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <span className="font-mono text-[12px] truncate" style={{ color: 'var(--foreground)' }}>
                              {u.username ? <strong>@{u.username}</strong> : u.name}
                              {u.name && u.username && <span className="opacity-40 ml-1.5">{u.name}</span>}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {memberError && <p className="font-mono text-[11px] mt-2" style={{ color: '#FF5C34' }}>{memberError}</p>}
                {memberSuccess && <p className="font-mono text-[11px] mt-2" style={{ color: '#00AA55' }}>{memberSuccess}</p>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
