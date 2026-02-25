'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocialLinks {
  website?: string;
  twitter?: string;
  instagram?: string;
  soundcloud?: string;
  spotify?: string;
  linkedin?: string;
  substack?: string;
}

interface World {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  country: string | null;
  tools: string | null;
  collaborators: string | null;
  socialLinks: SocialLinks | null;
  dateAdded: string | null;
  creatorId: string | null;
  published: boolean;
  creatorName: string | null;
}

interface Event {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  startTime: string | null;
  city: string | null;
  link: string | null;
  imageUrl: string | null;
  published: boolean;
}

interface Grant {
  id: string;
  grantName: string;
  slug: string;
  shortDescription: string | null;
  amountMin: number | null;
  amountMax: number | null;
  currency: string | null;
  tags: string | null;
  eligibility: string | null;
  deadlineType: string | null;
  deadlineDate: string | null;
  link: string | null;
  region: string | null;
  category: string | null;
  frequency: string | null;
  orgName: string | null;
  status: string | null;
  notes: string | null;
  source: string | null;
  published: boolean;
}

interface Tool {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  pricing: string | null;
  url: string | null;
  featured: boolean;
  priority: number | null;
  easeOfUse: string | null;
  published: boolean;
}

interface WorldMember {
  userId: string;
  role: string;
  userName: string | null;
  userUsername: string | null;
}

interface WorldWithMembers extends World {
  displayOrder: number | null;
  members: WorldMember[];
}

interface UserRow {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string | null;
  roleTags: string | null;
  toolSlugs: string | null;
  socialWebsite: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
  socialSoundcloud: string | null;
  socialSpotify: string | null;
  socialLinkedin: string | null;
  socialSubstack: string | null;
  worldMemberships: { worldId: string; role: string; worldTitle: string; worldSlug: string }[];
}

type Tab = 'worlds' | 'users' | 'creators' | 'events' | 'grants' | 'tools';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className="font-mono text-[9px] px-2 py-0.5 border"
      style={{
        backgroundColor: active ? '#00FF88' : '#FF5C34',
        color: '#1a1a1a',
        borderColor: '#1a1a1a',
      }}
    >
      {active ? 'PUB' : 'DRAFT'}
    </span>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-12 px-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl border border-[#1a1a1a] shadow-lg" style={{ backgroundColor: '#f5f0e8' }}>
        <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-3">
          <h2 className="font-mono text-[13px] font-bold uppercase" style={{ color: '#1a1a1a' }}>{title}</h2>
          <button onClick={onClose} className="font-mono text-[18px] leading-none hover:opacity-60" style={{ color: '#1a1a1a' }}>×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block font-mono text-[12px] uppercase tracking-widest mb-1" style={{ color: '#1a1a1a' }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-[#1a1a1a] px-3 py-1.5 font-mono text-[12px] outline-none focus:ring-2 focus:ring-[#1a1a1a]';
const inputStyle: React.CSSProperties = { backgroundColor: '#f5f0e8', color: '#1a1a1a' };

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} style={inputStyle} />;
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${inputCls} resize-none`} style={inputStyle} />;
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Field label={label}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" style={{ accentColor: '#1a1a1a' }} />
        <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{checked ? 'Yes' : 'No'}</span>
      </label>
    </Field>
  );
}

function ActionButtons({ onSave, onCancel, saving, error }: { onSave: () => void; onCancel: () => void; saving: boolean; error?: string }) {
  return (
    <div className="mt-5 pt-4 border-t border-[#1a1a1a]">
      {error && <p className="font-mono text-[12px] mb-2" style={{ color: '#FF5C34' }}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="px-4 py-1.5 font-mono text-[13px] uppercase border border-[#1a1a1a] disabled:opacity-50" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
          {saving ? 'SAVING...' : 'SAVE'}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 font-mono text-[13px] uppercase border border-[#1a1a1a] hover:bg-[#1a1a1a]/5" style={{ color: '#1a1a1a' }}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ─── Worlds Tab ───────────────────────────────────────────────────────────────

interface Creator {
  id: string;
  name: string;
  slug: string;
}

function WorldsTab() {
  const [items, setItems] = useState<WorldWithMembers[]>([]);
  const [modal, setModal] = useState<{ open: boolean; item: WorldWithMembers | null }>({ open: false, item: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<World, 'creatorName'> & { id: string; displayOrder: number; worldBuilderIds: string[]; collaboratorIds: string[] }>({
    id: '', title: '', slug: '', shortDescription: '', description: '', category: '', imageUrl: '',
    country: '', tools: '', collaborators: '', socialLinks: null, dateAdded: '', creatorId: '', published: true,
    displayOrder: 0, worldBuilderIds: [], collaboratorIds: [],
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string | null; username: string | null }[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/worlds');
    const data = await res.json();
    setItems(data.worlds || []);
  }, []);

  useEffect(() => {
    load();
    fetch('/api/admin/creators').then(r => r.json()).then(d => setCreators(d.creators || []));
    fetch('/api/admin/tools').then(r => r.json()).then(d => setAllTools(d.tools || []));
    fetch('/api/admin/users').then(r => r.json()).then(d => setAllUsers((d.users || []).map((u: UserRow) => ({ id: u.id, name: u.name, username: u.username }))));
  }, [load]);

  const openCreate = () => {
    setError('');
    setForm({ id: '', title: '', slug: '', shortDescription: '', description: '', category: '', imageUrl: '', country: '', tools: '', collaborators: '', socialLinks: null, dateAdded: '', creatorId: '', published: true, displayOrder: 0, worldBuilderIds: [], collaboratorIds: [] });
    setModal({ open: true, item: null });
  };

  const openEdit = (item: WorldWithMembers) => {
    setError('');
    const builders = item.members.filter(m => m.role === 'world_builder').map(m => m.userId);
    const collabs = item.members.filter(m => m.role === 'collaborator').map(m => m.userId);
    setForm({ ...item, shortDescription: item.shortDescription || '', description: item.description || '', category: item.category || '', imageUrl: item.imageUrl || '', country: item.country || '', tools: item.tools || '', collaborators: item.collaborators || '', socialLinks: item.socialLinks || null, dateAdded: item.dateAdded || '', creatorId: item.creatorId || '', displayOrder: item.displayOrder ?? 0, worldBuilderIds: builders, collaboratorIds: collabs });
    setModal({ open: true, item });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(p => ({ ...p, imageUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const selectedTools = (form.tools || '').split(',').map(t => t.trim()).filter(Boolean);

  const toggleTool = (toolName: string) => {
    setForm(p => {
      const current = (p.tools || '').split(',').map(t => t.trim()).filter(Boolean);
      const next = current.includes(toolName)
        ? current.filter(t => t !== toolName)
        : [...current, toolName];
      return { ...p, tools: next.join(', ') };
    });
  };

  const toggleWorldBuilder = (userId: string) => {
    setForm(p => {
      const next = p.worldBuilderIds.includes(userId)
        ? p.worldBuilderIds.filter(id => id !== userId)
        : [...p.worldBuilderIds, userId];
      return { ...p, worldBuilderIds: next };
    });
  };

  const toggleCollaborator = (userId: string) => {
    setForm(p => {
      const next = p.collaboratorIds.includes(userId)
        ? p.collaboratorIds.filter(id => id !== userId)
        : [...p.collaboratorIds, userId];
      return { ...p, collaboratorIds: next };
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      slug: form.slug || generateSlug(form.title),
      creatorId: form.creatorId || null,
      socialLinks: form.socialLinks || null,
      worldBuilderIds: form.worldBuilderIds,
      collaboratorIds: form.collaboratorIds,
    };
    const method = modal.item ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/worlds', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save failed');
      setSaving(false);
      return;
    }
    setSaving(false);
    setModal({ open: false, item: null });
    load();
  };

  const remove = async (id: string) => {
    const res = await fetch('/api/admin/worlds', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!res.ok) { setError('Delete failed'); return; }
    setDeleteConfirm(null);
    load();
  };

  const moveBuilder = (index: number, direction: 'up' | 'down') => {
    setForm(p => {
      const ids = [...p.worldBuilderIds];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= ids.length) return p;
      [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
      return { ...p, worldBuilderIds: ids };
    });
  };

  const getSocialLink = (key: string) => (form.socialLinks as SocialLinks)?.[key as keyof SocialLinks] || '';
  const setSocialLink = (key: string, value: string) => {
    setForm(p => ({
      ...p,
      socialLinks: { ...(p.socialLinks as SocialLinks || {}), [key]: value } as SocialLinks,
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{items.length} worlds</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[13px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[13px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Title</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">World Builder(s)</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Category</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Status</th>
              <th className="px-3 py-2 text-[12px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const builders = item.members.filter(m => m.role === 'world_builder');
              return (
                <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f5f0e8' : '#ebe6de', borderBottom: '1px solid #1a1a1a' }}>
                  <td className="px-3 py-2 font-bold">{item.title}</td>
                  <td className="px-3 py-2">{builders.length > 0 ? builders.map(b => b.userName || b.userUsername).join(', ') : item.creatorName || '—'}</td>
                  <td className="px-3 py-2">{item.category || '—'}</td>
                  <td className="px-3 py-2"><Badge active={item.published} label="" /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="font-mono text-[12px] underline hover:opacity-60">EDIT</button>
                      {deleteConfirm === item.id ? (
                        <span className="flex gap-1">
                          <button onClick={() => remove(item.id)} className="font-mono text-[12px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                          <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[12px] underline hover:opacity-60">NO</button>
                        </span>
                      ) : (
                        <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[12px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit World' : 'New World'}>
        <Field label="Title"><TextInput value={form.title} onChange={(v) => setForm(p => ({ ...p, title: v, slug: p.slug || generateSlug(v) }))} /></Field>
        <Field label="Slug"><TextInput value={form.slug} onChange={(v) => setForm(p => ({ ...p, slug: v }))} /></Field>
        <Field label="Short Description"><TextInput value={form.shortDescription || ''} onChange={(v) => setForm(p => ({ ...p, shortDescription: v }))} placeholder="Brief one-line description" /></Field>
        <Field label="Long Description"><TextArea value={form.description || ''} onChange={(v) => setForm(p => ({ ...p, description: v }))} /></Field>
        <Field label="Category"><TextInput value={form.category || ''} onChange={(v) => setForm(p => ({ ...p, category: v }))} /></Field>

        <Field label="Image">
          <div className="flex items-center gap-3">
            <label className="px-3 py-1.5 border border-[#1a1a1a] font-mono text-[13px] cursor-pointer hover:opacity-70" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              UPLOAD
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {form.imageUrl && (
              <div className="flex items-center gap-2">
                <img src={form.imageUrl} alt="preview" className="w-10 h-10 object-cover border border-[#1a1a1a]" />
                <button onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="font-mono text-[12px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>REMOVE</button>
              </div>
            )}
          </div>
          {!form.imageUrl && (
            <p className="font-mono text-[12px] mt-1.5 opacity-50" style={{ color: '#1a1a1a' }}>Or paste a URL:</p>
          )}
          {!form.imageUrl && <TextInput value={form.imageUrl || ''} onChange={(v) => setForm(p => ({ ...p, imageUrl: v }))} placeholder="https://..." />}
        </Field>

        <Field label="Country"><TextInput value={form.country || ''} onChange={(v) => setForm(p => ({ ...p, country: v }))} placeholder="e.g. US" /></Field>

        <Field label="World Builder(s)">
          <div className="border border-[#1a1a1a] p-2 max-h-36 overflow-y-auto" style={{ backgroundColor: '#f5f0e8' }}>
            {allUsers.length === 0 && <p className="font-mono text-[12px] opacity-50" style={{ color: '#1a1a1a' }}>No users yet</p>}
            {allUsers.map(u => (
              <label key={u.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={form.worldBuilderIds.includes(u.id)} onChange={() => toggleWorldBuilder(u.id)} className="w-3.5 h-3.5" style={{ accentColor: '#1a1a1a' }} />
                <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{u.name || u.username || 'Unnamed'}{u.username ? ` (@${u.username})` : ''}</span>
              </label>
            ))}
          </div>
          {form.worldBuilderIds.length > 1 && (
            <div className="mt-2 border border-[#1a1a1a] p-2" style={{ backgroundColor: '#ebe6de' }}>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-1 opacity-60" style={{ color: '#1a1a1a' }}>Display Order</p>
              {form.worldBuilderIds.map((uid, idx) => {
                const u = allUsers.find(u => u.id === uid);
                return (
                  <div key={uid} className="flex items-center gap-2 py-0.5">
                    <button onClick={() => moveBuilder(idx, 'up')} disabled={idx === 0} className="text-[12px] leading-none hover:opacity-60 disabled:opacity-20" style={{ color: '#1a1a1a' }}>&#x25B2;</button>
                    <button onClick={() => moveBuilder(idx, 'down')} disabled={idx === form.worldBuilderIds.length - 1} className="text-[12px] leading-none hover:opacity-60 disabled:opacity-20" style={{ color: '#1a1a1a' }}>&#x25BC;</button>
                    <span className="font-mono text-[12px]" style={{ color: '#1a1a1a' }}>{u?.name || u?.username || 'Unknown'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="Built By (Legacy Creator)">
          <select value={form.creatorId || ''} onChange={(e) => setForm(p => ({ ...p, creatorId: e.target.value }))} className={inputCls} style={inputStyle}>
            <option value="">— None —</option>
            {creators.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Tools Used">
          <div className="border border-[#1a1a1a] p-2 max-h-36 overflow-y-auto" style={{ backgroundColor: '#f5f0e8' }}>
            {allTools.length === 0 && <p className="font-mono text-[12px] opacity-50" style={{ color: '#1a1a1a' }}>No tools in DB yet</p>}
            {allTools.map(t => (
              <label key={t.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={selectedTools.includes(t.name)} onChange={() => toggleTool(t.name)} className="w-3.5 h-3.5" style={{ accentColor: '#1a1a1a' }} />
                <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{t.name}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Collaborators (Users)">
          <div className="border border-[#1a1a1a] p-2 max-h-36 overflow-y-auto" style={{ backgroundColor: '#f5f0e8' }}>
            {allUsers.length === 0 && <p className="font-mono text-[12px] opacity-50" style={{ color: '#1a1a1a' }}>No users yet</p>}
            {allUsers.filter(u => !form.worldBuilderIds.includes(u.id)).map(u => (
              <label key={u.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={form.collaboratorIds.includes(u.id)} onChange={() => toggleCollaborator(u.id)} className="w-3.5 h-3.5" style={{ accentColor: '#1a1a1a' }} />
                <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{u.name || u.username || 'Unnamed'}{u.username ? ` (@${u.username})` : ''}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Collaborators (Legacy Text)"><TextInput value={form.collaborators || ''} onChange={(v) => setForm(p => ({ ...p, collaborators: v }))} placeholder="Comma-separated names for non-user collaborators" /></Field>

        <Field label="Social Links">
          <div className="space-y-1.5">
            <TextInput value={getSocialLink('website')} onChange={(v) => setSocialLink('website', v)} placeholder="Website URL" />
            <TextInput value={getSocialLink('twitter')} onChange={(v) => setSocialLink('twitter', v)} placeholder="Twitter/X URL" />
            <TextInput value={getSocialLink('instagram')} onChange={(v) => setSocialLink('instagram', v)} placeholder="Instagram URL" />
            <TextInput value={getSocialLink('spotify')} onChange={(v) => setSocialLink('spotify', v)} placeholder="Spotify URL" />
            <TextInput value={getSocialLink('soundcloud')} onChange={(v) => setSocialLink('soundcloud', v)} placeholder="SoundCloud URL" />
          </div>
        </Field>

        <Field label="Date Added"><TextInput value={form.dateAdded || ''} onChange={(v) => setForm(p => ({ ...p, dateAdded: v }))} placeholder="e.g. Feb 01, 2026" /></Field>
        <CheckboxField label="Published" checked={form.published} onChange={(v) => setForm(p => ({ ...p, published: v }))} />
        <ActionButtons onSave={save} onCancel={() => setModal({ open: false, item: null })} saving={saving} error={error} />
      </Modal>
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab() {
  const [items, setItems] = useState<Event[]>([]);
  const [modal, setModal] = useState<{ open: boolean; item: Event | null }>({ open: false, item: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Event>({ id: '', eventName: '', slug: '', date: '', startTime: '', city: '', link: '', imageUrl: '', published: true });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/events');
    const data = await res.json();
    setItems(data.events || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setError('');
    setForm({ id: '', eventName: '', slug: '', date: '', startTime: '', city: '', link: '', imageUrl: '', published: true });
    setModal({ open: true, item: null });
  };

  const openEdit = (item: Event) => {
    setError('');
    setForm({ ...item, date: item.date || '', startTime: item.startTime || '', city: item.city || '', link: item.link || '', imageUrl: item.imageUrl || '' });
    setModal({ open: true, item });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const payload = { ...form, slug: form.slug || generateSlug(form.eventName) };
    const method = modal.item ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/events', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return; }
    setSaving(false);
    setModal({ open: false, item: null });
    load();
  };

  const remove = async (id: string) => {
    const res = await fetch('/api/admin/events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!res.ok) { setError('Delete failed'); return; }
    setDeleteConfirm(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{items.length} events</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[13px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[13px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Name</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Date</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">City</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Status</th>
              <th className="px-3 py-2 text-[12px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f5f0e8' : '#ebe6de', borderBottom: '1px solid #1a1a1a' }}>
                <td className="px-3 py-2 font-bold">{item.eventName}</td>
                <td className="px-3 py-2">{item.date || '—'}</td>
                <td className="px-3 py-2">{item.city || '—'}</td>
                <td className="px-3 py-2"><Badge active={item.published} label="" /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="font-mono text-[12px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[12px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[12px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[12px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit Event' : 'New Event'}>
        <Field label="Event Name"><TextInput value={form.eventName} onChange={(v) => setForm(p => ({ ...p, eventName: v, slug: p.slug || generateSlug(v) }))} /></Field>
        <Field label="Slug"><TextInput value={form.slug} onChange={(v) => setForm(p => ({ ...p, slug: v }))} /></Field>
        <Field label="Date"><TextInput value={form.date || ''} onChange={(v) => setForm(p => ({ ...p, date: v }))} placeholder="e.g. 18-Jul-2025" /></Field>
        <Field label="Start Time"><TextInput value={form.startTime || ''} onChange={(v) => setForm(p => ({ ...p, startTime: v }))} placeholder="e.g. 9:00 PM" /></Field>
        <Field label="City"><TextInput value={form.city || ''} onChange={(v) => setForm(p => ({ ...p, city: v }))} /></Field>
        <Field label="Link"><TextInput value={form.link || ''} onChange={(v) => setForm(p => ({ ...p, link: v }))} /></Field>
        <Field label="Image URL"><TextInput value={form.imageUrl || ''} onChange={(v) => setForm(p => ({ ...p, imageUrl: v }))} /></Field>
        <CheckboxField label="Published" checked={form.published} onChange={(v) => setForm(p => ({ ...p, published: v }))} />
        <ActionButtons onSave={save} onCancel={() => setModal({ open: false, item: null })} saving={saving} error={error} />
      </Modal>
    </div>
  );
}

// ─── Grants Tab ───────────────────────────────────────────────────────────────

function GrantsTab() {
  const [items, setItems] = useState<Grant[]>([]);
  const [modal, setModal] = useState<{ open: boolean; item: Grant | null }>({ open: false, item: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Grant>({
    id: '', grantName: '', slug: '', shortDescription: '', amountMin: null, amountMax: null,
    currency: 'USD', tags: '', eligibility: '', deadlineType: '', deadlineDate: '', link: '',
    region: '', category: '', frequency: '', orgName: '', status: '', notes: '', source: '', published: true,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/grants');
    const data = await res.json();
    setItems(data.grants || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setError('');
    setForm({ id: '', grantName: '', slug: '', shortDescription: '', amountMin: null, amountMax: null, currency: 'USD', tags: '', eligibility: '', deadlineType: '', deadlineDate: '', link: '', region: '', category: '', frequency: '', orgName: '', status: '', notes: '', source: '', published: true });
    setModal({ open: true, item: null });
  };

  const openEdit = (item: Grant) => {
    setError('');
    setForm({
      ...item,
      shortDescription: item.shortDescription || '', tags: item.tags || '', eligibility: item.eligibility || '',
      deadlineType: item.deadlineType || '', deadlineDate: item.deadlineDate || '', link: item.link || '',
      region: item.region || '', category: item.category || '', frequency: item.frequency || '',
      orgName: item.orgName || '', status: item.status || '', notes: item.notes || '', source: item.source || '',
      currency: item.currency || 'USD',
    });
    setModal({ open: true, item });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const payload = { ...form, slug: form.slug || generateSlug(form.grantName) };
    const method = modal.item ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/grants', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return; }
    setSaving(false);
    setModal({ open: false, item: null });
    load();
  };

  const remove = async (id: string) => {
    const res = await fetch('/api/admin/grants', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!res.ok) { setError('Delete failed'); return; }
    setDeleteConfirm(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{items.length} grants</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[13px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[13px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Grant Name</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Org</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Amount</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Status</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Pub</th>
              <th className="px-3 py-2 text-[12px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f5f0e8' : '#ebe6de', borderBottom: '1px solid #1a1a1a' }}>
                <td className="px-3 py-2 font-bold">{item.grantName}</td>
                <td className="px-3 py-2">{item.orgName || '—'}</td>
                <td className="px-3 py-2">
                  {item.amountMin != null || item.amountMax != null
                    ? `${item.amountMin != null ? '$' + item.amountMin.toLocaleString() : ''}${item.amountMin != null && item.amountMax != null ? '–' : ''}${item.amountMax != null ? '$' + item.amountMax.toLocaleString() : ''}`
                    : '—'}
                </td>
                <td className="px-3 py-2">{item.status || '—'}</td>
                <td className="px-3 py-2"><Badge active={item.published} label="" /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="font-mono text-[12px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[12px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[12px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[12px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit Grant' : 'New Grant'}>
        <Field label="Grant Name"><TextInput value={form.grantName} onChange={(v) => setForm(p => ({ ...p, grantName: v, slug: p.slug || generateSlug(v) }))} /></Field>
        <Field label="Slug"><TextInput value={form.slug} onChange={(v) => setForm(p => ({ ...p, slug: v }))} /></Field>
        <Field label="Organization"><TextInput value={form.orgName || ''} onChange={(v) => setForm(p => ({ ...p, orgName: v }))} /></Field>
        <Field label="Short Description"><TextArea value={form.shortDescription || ''} onChange={(v) => setForm(p => ({ ...p, shortDescription: v }))} /></Field>
        <div className="flex gap-3">
          <div className="flex-1"><Field label="Amount Min ($)"><TextInput value={form.amountMin?.toString() || ''} onChange={(v) => setForm(p => ({ ...p, amountMin: v ? Number(v) : null }))} /></Field></div>
          <div className="flex-1"><Field label="Amount Max ($)"><TextInput value={form.amountMax?.toString() || ''} onChange={(v) => setForm(p => ({ ...p, amountMax: v ? Number(v) : null }))} /></Field></div>
        </div>
        <Field label="Tags (comma-separated)"><TextInput value={form.tags || ''} onChange={(v) => setForm(p => ({ ...p, tags: v }))} /></Field>
        <Field label="Category"><TextInput value={form.category || ''} onChange={(v) => setForm(p => ({ ...p, category: v }))} /></Field>
        <Field label="Region"><TextInput value={form.region || ''} onChange={(v) => setForm(p => ({ ...p, region: v }))} /></Field>
        <Field label="Deadline Type"><TextInput value={form.deadlineType || ''} onChange={(v) => setForm(p => ({ ...p, deadlineType: v }))} placeholder="Fixed, Rolling..." /></Field>
        <Field label="Deadline Date"><TextInput value={form.deadlineDate || ''} onChange={(v) => setForm(p => ({ ...p, deadlineDate: v }))} /></Field>
        <Field label="Frequency"><TextInput value={form.frequency || ''} onChange={(v) => setForm(p => ({ ...p, frequency: v }))} placeholder="Annual, One-time..." /></Field>
        <Field label="Status"><TextInput value={form.status || ''} onChange={(v) => setForm(p => ({ ...p, status: v }))} placeholder="Open, Closed..." /></Field>
        <Field label="Link"><TextInput value={form.link || ''} onChange={(v) => setForm(p => ({ ...p, link: v }))} /></Field>
        <Field label="Eligibility"><TextArea value={form.eligibility || ''} onChange={(v) => setForm(p => ({ ...p, eligibility: v }))} /></Field>
        <Field label="Notes"><TextArea value={form.notes || ''} onChange={(v) => setForm(p => ({ ...p, notes: v }))} /></Field>
        <Field label="Source"><TextInput value={form.source || ''} onChange={(v) => setForm(p => ({ ...p, source: v }))} /></Field>
        <CheckboxField label="Published" checked={form.published} onChange={(v) => setForm(p => ({ ...p, published: v }))} />
        <ActionButtons onSave={save} onCancel={() => setModal({ open: false, item: null })} saving={saving} error={error} />
      </Modal>
    </div>
  );
}

// ─── Tools Tab ────────────────────────────────────────────────────────────────

function ToolsTab() {
  const [items, setItems] = useState<Tool[]>([]);
  const [modal, setModal] = useState<{ open: boolean; item: Tool | null }>({ open: false, item: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Tool>({ id: '', name: '', slug: '', category: '', description: '', pricing: '', url: '', featured: false, priority: null, easeOfUse: '', published: true });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/tools');
    const data = await res.json();
    setItems(data.tools || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setError('');
    setForm({ id: '', name: '', slug: '', category: '', description: '', pricing: '', url: '', featured: false, priority: null, easeOfUse: '', published: true });
    setModal({ open: true, item: null });
  };

  const openEdit = (item: Tool) => {
    setError('');
    setForm({ ...item, category: item.category || '', description: item.description || '', pricing: item.pricing || '', url: item.url || '', easeOfUse: item.easeOfUse || '' });
    setModal({ open: true, item });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const payload = { ...form, slug: form.slug || generateSlug(form.name) };
    const method = modal.item ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/tools', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return; }
    setSaving(false);
    setModal({ open: false, item: null });
    load();
  };

  const remove = async (id: string) => {
    const res = await fetch('/api/admin/tools', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!res.ok) { setError('Delete failed'); return; }
    setDeleteConfirm(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{items.length} tools</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[13px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[13px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Name</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Category</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Pricing</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Featured</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Status</th>
              <th className="px-3 py-2 text-[12px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f5f0e8' : '#ebe6de', borderBottom: '1px solid #1a1a1a' }}>
                <td className="px-3 py-2 font-bold">{item.name}</td>
                <td className="px-3 py-2">{item.category || '—'}</td>
                <td className="px-3 py-2">{item.pricing || '—'}</td>
                <td className="px-3 py-2">{item.featured ? '★' : '—'}</td>
                <td className="px-3 py-2"><Badge active={item.published} label="" /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="font-mono text-[12px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[12px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[12px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[12px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit Tool' : 'New Tool'}>
        <Field label="Name"><TextInput value={form.name} onChange={(v) => setForm(p => ({ ...p, name: v, slug: p.slug || generateSlug(v) }))} /></Field>
        <Field label="Slug"><TextInput value={form.slug} onChange={(v) => setForm(p => ({ ...p, slug: v }))} /></Field>
        <Field label="Category"><TextInput value={form.category || ''} onChange={(v) => setForm(p => ({ ...p, category: v }))} /></Field>
        <Field label="Description"><TextArea value={form.description || ''} onChange={(v) => setForm(p => ({ ...p, description: v }))} /></Field>
        <Field label="Pricing"><TextInput value={form.pricing || ''} onChange={(v) => setForm(p => ({ ...p, pricing: v }))} placeholder="Free, Paid, Freemium..." /></Field>
        <Field label="URL"><TextInput value={form.url || ''} onChange={(v) => setForm(p => ({ ...p, url: v }))} /></Field>
        <Field label="Ease of Use"><TextInput value={form.easeOfUse || ''} onChange={(v) => setForm(p => ({ ...p, easeOfUse: v }))} placeholder="Easy, Medium, Advanced..." /></Field>
        <Field label="Priority"><TextInput value={form.priority?.toString() || ''} onChange={(v) => setForm(p => ({ ...p, priority: v ? Number(v) : null }))} /></Field>
        <CheckboxField label="Featured" checked={form.featured} onChange={(v) => setForm(p => ({ ...p, featured: v }))} />
        <CheckboxField label="Published" checked={form.published} onChange={(v) => setForm(p => ({ ...p, published: v }))} />
        <ActionButtons onSave={save} onCancel={() => setModal({ open: false, item: null })} saving={saving} error={error} />
      </Modal>
    </div>
  );
}

// ─── Creators Tab ─────────────────────────────────────────────────────────────

interface CreatorRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  country: string | null;
  userId: string | null;
  linkedUserName: string | null;
  linkedUserUsername: string | null;
  published: boolean;
}

function CreatorsTab() {
  const [items, setItems] = useState<CreatorRow[]>([]);
  const [modal, setModal] = useState<{ open: boolean; item: CreatorRow | null }>({ open: false, item: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<CreatorRow, 'linkedUserName' | 'linkedUserUsername'>>({ id: '', name: '', slug: '', description: '', imageUrl: '', websiteUrl: '', country: '', userId: '', published: true });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [allUsers, setAllUsers] = useState<{ id: string; name: string | null; username: string | null }[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/creators');
    const data = await res.json();
    setItems(data.creators || []);
  }, []);

  useEffect(() => {
    load();
    fetch('/api/admin/users').then(r => r.json()).then(d => setAllUsers((d.users || []).map((u: UserRow) => ({ id: u.id, name: u.name, username: u.username }))));
  }, [load]);

  const openCreate = () => {
    setError('');
    setForm({ id: '', name: '', slug: '', description: '', imageUrl: '', websiteUrl: '', country: '', userId: '', published: true });
    setModal({ open: true, item: null });
  };

  const openEdit = (item: CreatorRow) => {
    setError('');
    setForm({ ...item, description: item.description || '', imageUrl: item.imageUrl || '', websiteUrl: item.websiteUrl || '', country: item.country || '', userId: item.userId || '' });
    setModal({ open: true, item });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(p => ({ ...p, imageUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const payload = { ...form, slug: form.slug || generateSlug(form.name) };
    const method = modal.item ? 'PUT' : 'POST';
    const res = await fetch('/api/admin/creators', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return; }
    setSaving(false);
    setModal({ open: false, item: null });
    load();
  };

  const remove = async (id: string) => {
    const res = await fetch('/api/admin/creators', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!res.ok) { setError('Delete failed'); return; }
    setDeleteConfirm(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{items.length} creators</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[13px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[13px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Name</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Slug</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Linked Profile</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Country</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Status</th>
              <th className="px-3 py-2 text-[12px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f5f0e8' : '#ebe6de', borderBottom: '1px solid #1a1a1a' }}>
                <td className="px-3 py-2 font-bold">{item.name}</td>
                <td className="px-3 py-2 opacity-60">{item.slug}</td>
                <td className="px-3 py-2">{item.linkedUserUsername ? `@${item.linkedUserUsername}` : item.linkedUserName || '—'}</td>
                <td className="px-3 py-2">{item.country || '—'}</td>
                <td className="px-3 py-2"><Badge active={item.published} label="" /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="font-mono text-[12px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[12px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[12px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[12px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit Creator' : 'New Creator'}>
        <Field label="Name"><TextInput value={form.name} onChange={(v) => setForm(p => ({ ...p, name: v, slug: p.slug || generateSlug(v) }))} /></Field>
        <Field label="Slug"><TextInput value={form.slug} onChange={(v) => setForm(p => ({ ...p, slug: v }))} /></Field>
        <Field label="Description"><TextArea value={form.description || ''} onChange={(v) => setForm(p => ({ ...p, description: v }))} /></Field>
        <Field label="Country"><TextInput value={form.country || ''} onChange={(v) => setForm(p => ({ ...p, country: v }))} placeholder="e.g. US, SE, DE" /></Field>
        <Field label="Website URL"><TextInput value={form.websiteUrl || ''} onChange={(v) => setForm(p => ({ ...p, websiteUrl: v }))} /></Field>

        <Field label="Image">
          <div className="flex items-center gap-3">
            <label className="px-3 py-1.5 border border-[#1a1a1a] font-mono text-[13px] cursor-pointer hover:opacity-70" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              UPLOAD
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {form.imageUrl && (
              <div className="flex items-center gap-2">
                <img src={form.imageUrl} alt="preview" className="w-10 h-10 object-cover border border-[#1a1a1a]" />
                <button onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="font-mono text-[12px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>REMOVE</button>
              </div>
            )}
          </div>
          {!form.imageUrl && (
            <p className="font-mono text-[12px] mt-1.5 opacity-50" style={{ color: '#1a1a1a' }}>Or paste a URL:</p>
          )}
          {!form.imageUrl && <TextInput value={form.imageUrl || ''} onChange={(v) => setForm(p => ({ ...p, imageUrl: v }))} placeholder="https://..." />}
        </Field>

        <Field label="Linked User Profile">
          <select value={form.userId || ''} onChange={(e) => setForm(p => ({ ...p, userId: e.target.value }))} className={inputCls} style={inputStyle}>
            <option value="">— None —</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.username || 'Unnamed'}{u.username ? ` (@${u.username})` : ''}</option>
            ))}
          </select>
        </Field>

        <CheckboxField label="Published" checked={form.published} onChange={(v) => setForm(p => ({ ...p, published: v }))} />
        <ActionButtons onSave={save} onCancel={() => setModal({ open: false, item: null })} saving={saving} error={error} />
      </Modal>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

const ROLE_TAGS = [
  'music','dj','visual-artist','filmmaker','photographer','writer','poet','dancer',
  'performer','producer','designer','illustrator','game-designer','architect',
  'technologist','curator','educator','community-builder','entrepreneur','researcher',
];

function UsersTab() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [modal, setModal] = useState<{ open: boolean; item: UserRow | null }>({ open: false, item: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<UserRow, 'worldMemberships'>>({
    id: '', name: '', username: '', email: '', bio: '', avatarUrl: '', role: 'user',
    roleTags: '', toolSlugs: '', socialWebsite: '', socialTwitter: '', socialInstagram: '',
    socialSoundcloud: '', socialSpotify: '', socialLinkedin: '', socialSubstack: '',
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setItems(data.users || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (item: UserRow) => {
    setError('');
    setForm({
      id: item.id,
      name: item.name || '', username: item.username || '', email: item.email || '',
      bio: item.bio || '', avatarUrl: item.avatarUrl || '', role: item.role || 'user',
      roleTags: item.roleTags || '', toolSlugs: item.toolSlugs || '',
      socialWebsite: item.socialWebsite || '', socialTwitter: item.socialTwitter || '',
      socialInstagram: item.socialInstagram || '', socialSoundcloud: item.socialSoundcloud || '',
      socialSpotify: item.socialSpotify || '', socialLinkedin: item.socialLinkedin || '',
      socialSubstack: item.socialSubstack || '',
    });
    setModal({ open: true, item });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return; }
    setSaving(false);
    setModal({ open: false, item: null });
    load();
  };

  const remove = async (id: string) => {
    const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!res.ok) { setError('Delete failed'); return; }
    setDeleteConfirm(null);
    load();
  };

  const filtered = items.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  const selectedRoles = (form.roleTags || '').split(',').map(r => r.trim()).filter(Boolean);
  const toggleRole = (slug: string) => {
    const next = selectedRoles.includes(slug)
      ? selectedRoles.filter(r => r !== slug)
      : [...selectedRoles, slug];
    setForm(p => ({ ...p, roleTags: next.join(',') || '' }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{items.length} users</span>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="border border-[#1a1a1a] px-3 py-1 font-mono text-[12px] outline-none w-48" style={{ backgroundColor: '#f5f0e8', color: '#1a1a1a' }} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[13px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Name</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Username</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Email</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Role</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[12px]">Worlds</th>
              <th className="px-3 py-2 text-[12px]"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f5f0e8' : '#ebe6de', borderBottom: '1px solid #1a1a1a' }}>
                <td className="px-3 py-2 font-bold">{item.name || '—'}</td>
                <td className="px-3 py-2">{item.username ? `@${item.username}` : '—'}</td>
                <td className="px-3 py-2 opacity-60">{item.email || '—'}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-[9px] px-2 py-0.5 border" style={{
                    backgroundColor: item.role === 'admin' ? '#8B5CF6' : item.role === 'artist' ? '#3B82F6' : '#e5e5e5',
                    color: item.role === 'admin' || item.role === 'artist' ? '#fff' : '#1a1a1a',
                    borderColor: '#1a1a1a',
                  }}>
                    {(item.role || 'user').toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {item.worldMemberships.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.worldMemberships.map(wm => (
                        <span key={wm.worldId} className="font-mono text-[9px] px-1.5 py-0.5 border" style={{
                          backgroundColor: wm.role === 'world_builder' ? '#00FF88' : '#e5e5e5',
                          color: '#1a1a1a', borderColor: '#1a1a1a',
                        }}>
                          {wm.worldTitle} ({wm.role === 'world_builder' ? 'BUILDER' : 'COLLAB'})
                        </span>
                      ))}
                    </div>
                  ) : '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="font-mono text-[12px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[12px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[12px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[12px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })} title="Edit User">
        <Field label="Name"><TextInput value={form.name || ''} onChange={(v) => setForm(p => ({ ...p, name: v }))} /></Field>
        <Field label="Username"><TextInput value={form.username || ''} onChange={(v) => setForm(p => ({ ...p, username: v.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} /></Field>
        <Field label="Email"><TextInput value={form.email || ''} onChange={(v) => setForm(p => ({ ...p, email: v }))} /></Field>
        <Field label="Bio"><TextArea value={form.bio || ''} onChange={(v) => setForm(p => ({ ...p, bio: v }))} /></Field>
        <Field label="Avatar URL"><TextInput value={form.avatarUrl || ''} onChange={(v) => setForm(p => ({ ...p, avatarUrl: v }))} /></Field>

        <Field label="System Role">
          <select value={form.role || 'user'} onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))} className={inputCls} style={inputStyle}>
            <option value="user">User</option>
            <option value="artist">Artist</option>
            <option value="admin">Admin</option>
          </select>
        </Field>

        <Field label="Creative Roles">
          <div className="flex flex-wrap gap-1.5">
            {ROLE_TAGS.map(slug => (
              <button key={slug} onClick={() => toggleRole(slug)} className="font-mono text-[10px] uppercase px-2 py-1 border transition-colors" style={{
                borderColor: '#1a1a1a',
                backgroundColor: selectedRoles.includes(slug) ? '#1a1a1a' : 'transparent',
                color: selectedRoles.includes(slug) ? '#f5f0e8' : '#1a1a1a',
              }}>
                {slug.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Social - Website"><TextInput value={form.socialWebsite || ''} onChange={(v) => setForm(p => ({ ...p, socialWebsite: v }))} /></Field>
        <Field label="Social - Twitter"><TextInput value={form.socialTwitter || ''} onChange={(v) => setForm(p => ({ ...p, socialTwitter: v }))} /></Field>
        <Field label="Social - Instagram"><TextInput value={form.socialInstagram || ''} onChange={(v) => setForm(p => ({ ...p, socialInstagram: v }))} /></Field>
        <Field label="Social - SoundCloud"><TextInput value={form.socialSoundcloud || ''} onChange={(v) => setForm(p => ({ ...p, socialSoundcloud: v }))} /></Field>
        <Field label="Social - Spotify"><TextInput value={form.socialSpotify || ''} onChange={(v) => setForm(p => ({ ...p, socialSpotify: v }))} /></Field>
        <Field label="Social - LinkedIn"><TextInput value={form.socialLinkedin || ''} onChange={(v) => setForm(p => ({ ...p, socialLinkedin: v }))} /></Field>
        <Field label="Social - Substack"><TextInput value={form.socialSubstack || ''} onChange={(v) => setForm(p => ({ ...p, socialSubstack: v }))} /></Field>

        {/* Show world memberships (read-only here, managed from Worlds tab) */}
        {modal.item && modal.item.worldMemberships.length > 0 && (
          <Field label="World Memberships">
            <div className="space-y-1">
              {modal.item.worldMemberships.map(wm => (
                <div key={wm.worldId} className="flex items-center gap-2">
                  <span className="font-mono text-[9px] px-1.5 py-0.5 border" style={{
                    backgroundColor: wm.role === 'world_builder' ? '#00FF88' : '#e5e5e5',
                    color: '#1a1a1a', borderColor: '#1a1a1a',
                  }}>
                    {wm.role === 'world_builder' ? 'WORLD BUILDER' : 'COLLABORATOR'}
                  </span>
                  <span className="font-mono text-[12px]" style={{ color: '#1a1a1a' }}>{wm.worldTitle}</span>
                </div>
              ))}
            </div>
          </Field>
        )}

        <ActionButtons onSave={save} onCancel={() => setModal({ open: false, item: null })} saving={saving} error={error} />
      </Modal>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'worlds', label: 'WORLDS' },
  { id: 'users', label: 'USERS' },
  { id: 'creators', label: 'CREATORS' },
  { id: 'events', label: 'EVENTS' },
  { id: 'grants', label: 'GRANTS' },
  { id: 'tools', label: 'TOOLS' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('worlds');
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8' }}>
      {/* Header */}
      <header className="border-b border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[18px] font-bold" style={{ color: '#f5f0e8' }}>TOPIA</span>
            <span className="font-mono text-[12px] px-2 py-0.5 border border-[#f5f0e8]/40" style={{ color: '#f5f0e8' }}>ADMIN</span>
          </div>
          <button onClick={logout} className="font-mono text-[12px] uppercase tracking-widest px-3 py-1 border border-[#f5f0e8]/40 hover:border-[#f5f0e8] transition-colors" style={{ color: '#f5f0e8' }}>
            LOGOUT
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="border-b border-[#1a1a1a]" style={{ backgroundColor: '#f5f0e8' }}>
        <div className="max-w-6xl mx-auto px-4 flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative px-5 py-3 font-mono text-[13px] uppercase tracking-widest transition-colors"
              style={{
                color: tab === t.id ? '#f5f0e8' : '#1a1a1a',
                backgroundColor: tab === t.id ? '#1a1a1a' : 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'worlds' && <WorldsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'creators' && <CreatorsTab />}
        {tab === 'events' && <EventsTab />}
        {tab === 'grants' && <GrantsTab />}
        {tab === 'tools' && <ToolsTab />}
      </main>
    </div>
  );
}
