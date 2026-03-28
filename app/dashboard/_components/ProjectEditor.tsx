'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { inputCls, labelCls } from './sharedStyles';
import { mdComponents } from './mdComponents';
import { MdToolbar } from './MdToolbar';
import { WritePrevToggle } from './WritePrevToggle';
import { compressImage } from './compressImage';
import { ToolPicker } from './ToolPicker';
import { ToolOption, ProjectItem } from './types';

export function ProjectEditor({
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
