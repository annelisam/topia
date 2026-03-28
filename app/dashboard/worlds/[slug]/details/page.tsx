'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SocialIcon, SOCIAL_PLATFORMS } from '../../../../components/SocialIcons';
import { inputCls, labelCls } from '../../../_components/sharedStyles';
import { mdComponents } from '../../../_components/mdComponents';
import { MdToolbar } from '../../../_components/MdToolbar';
import { WritePrevToggle } from '../../../_components/WritePrevToggle';
import { compressImage } from '../../../_components/compressImage';
import { ToolPicker } from '../../../_components/ToolPicker';
import { SocialLinks } from '../../../_components/types';
import { ReadOnlyBanner } from '../../../_components/ReadOnlyBanner';
import { useWorldDashboard } from '../layout';

export default function WorldDetailsPage() {
  const { world, allTools, privyId, imageUrl, setImageUrl, isBuilder } = useWorldDashboard();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shortDescription, setShortDescription] = useState(world.shortDescription || '');
  const [description, setDescription] = useState(world.description || '');
  const [headerImageUrl, setHeaderImageUrl] = useState(world.headerImageUrl || '');
  const [tools, setTools] = useState(world.tools || '');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>((world.socialLinks as SocialLinks) || {});
  const [toolSearch, setToolSearch] = useState('');
  const [descPreview, setDescPreview] = useState(!isBuilder);

  const selectedTools = tools.split(',').map(t => t.trim()).filter(Boolean);
  const toggleTool = (name: string) => {
    if (!isBuilder) return;
    const c = tools.split(',').map(t => t.trim()).filter(Boolean);
    setTools((c.includes(name) ? c.filter(t => t !== name) : [...c, name]).join(', '));
  };

  const saveDetails = async () => {
    if (!world || !isBuilder) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/worlds/update', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldId: world.id, privyId, shortDescription: shortDescription || null, description: description || null, imageUrl: imageUrl || null, headerImageUrl: headerImageUrl || null, tools: tools || null, socialLinks: Object.values(socialLinks).some(v => v) ? socialLinks : null }),
      });
      if (!res.ok) { let msg = 'Save failed'; try { const d = await res.json(); msg = d.error || msg; } catch { if (res.status === 413) msg = 'Images are too large.'; } setError(msg); return; }
      await res.json();
      setSuccess('Saved'); setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); } finally { setSaving(false); }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold uppercase mb-6" style={{ color: 'var(--foreground)' }}>Details</h1>

      {!isBuilder && <ReadOnlyBanner />}

      {/* Images card */}
      <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
        <p className={labelCls} style={{ color: 'var(--foreground)' }}>Images</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="font-mono text-[11px] mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>World Image</p>
            {imageUrl ? (
              <div className="mb-2 relative inline-block">
                <img src={imageUrl} alt="" className="w-20 h-20 rounded-full object-cover border" style={{ borderColor: 'var(--border-color)' }} />
                {isBuilder && (
                  <button onClick={() => setImageUrl('')} className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full font-mono text-[9px]" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>×</button>
                )}
              </div>
            ) : (
              <p className="font-mono text-[11px] opacity-30" style={{ color: 'var(--foreground)' }}>No image</p>
            )}
            {isBuilder && (
              <label className="inline-block px-3 py-2 border font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-lg transition hover:opacity-70" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                {imageUrl ? 'Change' : 'Upload'}
                <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImageUrl(await compressImage(f)); }} className="hidden" />
              </label>
            )}
          </div>
          <div>
            <p className="font-mono text-[11px] mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>Header Image</p>
            {headerImageUrl ? (
              <div className="mb-2 relative inline-block">
                <img src={headerImageUrl} alt="" className="max-w-full h-20 object-cover border rounded-lg" style={{ borderColor: 'var(--border-color)' }} />
                {isBuilder && (
                  <button onClick={() => setHeaderImageUrl('')} className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full font-mono text-[9px]" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>×</button>
                )}
              </div>
            ) : (
              <p className="font-mono text-[11px] opacity-30" style={{ color: 'var(--foreground)' }}>No header image</p>
            )}
            {isBuilder && (
              <label className="inline-block px-3 py-2 border font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-lg transition hover:opacity-70" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                {headerImageUrl ? 'Change' : 'Upload'}
                <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setHeaderImageUrl(await compressImage(f, 1600)); }} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Description card */}
      <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
        <p className={labelCls} style={{ color: 'var(--foreground)' }}>Description</p>
        <div className="space-y-4">
          <div>
            <label className="font-mono text-[11px] mb-1.5 block opacity-50" style={{ color: 'var(--foreground)' }}>Short Description</label>
            {isBuilder ? (
              <input type="text" value={shortDescription} onChange={e => setShortDescription(e.target.value)} placeholder="Brief one-liner" className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
            ) : (
              <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)', opacity: shortDescription ? 1 : 0.3 }}>{shortDescription || 'None'}</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>About</label>
              {isBuilder && <WritePrevToggle preview={descPreview} setPreview={setDescPreview} />}
            </div>
            {isBuilder && !descPreview ? (
              <>
                <MdToolbar tid="desc-editor" value={description} onChange={setDescription} />
                <textarea id="desc-editor" value={description} onChange={e => setDescription(e.target.value)} rows={8} placeholder="Write about this world..." className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)', resize: 'vertical', minHeight: '150px' }} />
              </>
            ) : (
              <div className="border px-4 py-3 rounded-lg min-h-[80px]" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
                {description ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{description}</ReactMarkdown> : <p className="font-mono text-[12px] opacity-25" style={{ color: 'var(--foreground)' }}>{isBuilder ? 'Nothing to preview' : 'No description yet'}</p>}
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
            {isBuilder ? (
              allTools.length > 0 ? (
                <ToolPicker allTools={allTools} selected={selectedTools} onToggle={toggleTool} search={toolSearch} setSearch={setToolSearch} />
              ) : (
                <input type="text" value={tools} onChange={e => setTools(e.target.value)} placeholder="Comma-separated" className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
              )
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedTools.length > 0 ? selectedTools.map(t => (
                  <span key={t} className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>{t}</span>
                )) : (
                  <p className="font-mono text-[11px] opacity-30" style={{ color: 'var(--foreground)' }}>None</p>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="font-mono text-[11px] mb-2 block opacity-50" style={{ color: 'var(--foreground)' }}>Social Links</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => {
                const val = (socialLinks as Record<string, string | undefined>)[key] || '';
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className="opacity-30 shrink-0" style={{ color: 'var(--foreground)' }}><SocialIcon type={key} size={14} /></div>
                    {isBuilder ? (
                      <input type="url" value={val} onChange={e => setSocialLinks(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="flex-1 border-b bg-transparent font-mono text-[12px] py-1.5 outline-none" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
                    ) : val ? (
                      <a href={val} target="_blank" rel="noopener noreferrer" className="font-mono text-[12px] truncate hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>{val}</a>
                    ) : (
                      <span className="font-mono text-[12px] opacity-20" style={{ color: 'var(--foreground)' }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Save — builders only */}
      {isBuilder && (
        <div className="flex items-center gap-3 pt-3">
          <button onClick={saveDetails} disabled={saving} className="px-5 py-2 font-mono text-[11px] uppercase tracking-widest hover:opacity-80 transition disabled:opacity-40 rounded-lg" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {error && <span className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</span>}
          {success && <span className="font-mono text-[11px]" style={{ color: '#00AA55' }}>{success}</span>}
        </div>
      )}
    </div>
  );
}
