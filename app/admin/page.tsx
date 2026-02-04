'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface World {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  country: string | null;
  tools: string | null;
  collaborators: string | null;
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

type Tab = 'worlds' | 'creators' | 'events' | 'grants' | 'tools';

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
      <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#1a1a1a' }}>{label}</label>
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
        <span className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>{checked ? 'Yes' : 'No'}</span>
      </label>
    </Field>
  );
}

function ActionButtons({ onSave, onCancel, saving, error }: { onSave: () => void; onCancel: () => void; saving: boolean; error?: string }) {
  return (
    <div className="mt-5 pt-4 border-t border-[#1a1a1a]">
      {error && <p className="font-mono text-[10px] mb-2" style={{ color: '#FF5C34' }}>{error}</p>}
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="px-4 py-1.5 font-mono text-[11px] uppercase border border-[#1a1a1a] disabled:opacity-50" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
          {saving ? 'SAVING...' : 'SAVE'}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 font-mono text-[11px] uppercase border border-[#1a1a1a] hover:bg-[#1a1a1a]/5" style={{ color: '#1a1a1a' }}>
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
  const [items, setItems] = useState<World[]>([]);
  const [modal, setModal] = useState<{ open: boolean; item: World | null }>({ open: false, item: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<World, 'creatorName'> & { id: string }>({
    id: '', title: '', slug: '', description: '', category: '', imageUrl: '', websiteUrl: '',
    country: '', tools: '', collaborators: '', dateAdded: '', creatorId: '', published: true,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/worlds');
    const data = await res.json();
    setItems(data.worlds || []);
  }, []);

  useEffect(() => {
    load();
    fetch('/api/admin/creators').then(r => r.json()).then(d => setCreators(d.creators || []));
    fetch('/api/admin/tools').then(r => r.json()).then(d => setAllTools(d.tools || []));
  }, [load]);

  const openCreate = () => {
    setError('');
    setForm({ id: '', title: '', slug: '', description: '', category: '', imageUrl: '', websiteUrl: '', country: '', tools: '', collaborators: '', dateAdded: '', creatorId: '', published: true });
    setModal({ open: true, item: null });
  };

  const openEdit = (item: World) => {
    setError('');
    setForm({ ...item, description: item.description || '', category: item.category || '', imageUrl: item.imageUrl || '', websiteUrl: item.websiteUrl || '', country: item.country || '', tools: item.tools || '', collaborators: item.collaborators || '', dateAdded: item.dateAdded || '', creatorId: item.creatorId || '' });
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

  const save = async () => {
    setSaving(true);
    setError('');
    const payload = { ...form, slug: form.slug || generateSlug(form.title), creatorId: form.creatorId || null };
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>{items.length} worlds</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[11px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Title</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Slug</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Creator</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Category</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Status</th>
              <th className="px-3 py-2 text-[10px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f5f0e8' : '#ebe6de', borderBottom: '1px solid #1a1a1a' }}>
                <td className="px-3 py-2 font-bold">{item.title}</td>
                <td className="px-3 py-2 opacity-60">{item.slug}</td>
                <td className="px-3 py-2">{item.creatorName || '—'}</td>
                <td className="px-3 py-2">{item.category || '—'}</td>
                <td className="px-3 py-2"><Badge active={item.published} label="" /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="font-mono text-[10px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[10px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[10px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[10px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? 'Edit World' : 'New World'}>
        <Field label="Title"><TextInput value={form.title} onChange={(v) => setForm(p => ({ ...p, title: v, slug: p.slug || generateSlug(v) }))} /></Field>
        <Field label="Slug"><TextInput value={form.slug} onChange={(v) => setForm(p => ({ ...p, slug: v }))} /></Field>
        <Field label="Description"><TextArea value={form.description || ''} onChange={(v) => setForm(p => ({ ...p, description: v }))} /></Field>
        <Field label="Category"><TextInput value={form.category || ''} onChange={(v) => setForm(p => ({ ...p, category: v }))} /></Field>

        <Field label="Image">
          <div className="flex items-center gap-3">
            <label className="px-3 py-1.5 border border-[#1a1a1a] font-mono text-[11px] cursor-pointer hover:opacity-70" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              UPLOAD
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {form.imageUrl && (
              <div className="flex items-center gap-2">
                <img src={form.imageUrl} alt="preview" className="w-10 h-10 object-cover border border-[#1a1a1a]" />
                <button onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="font-mono text-[10px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>REMOVE</button>
              </div>
            )}
          </div>
          {!form.imageUrl && (
            <p className="font-mono text-[10px] mt-1.5 opacity-50" style={{ color: '#1a1a1a' }}>Or paste a URL:</p>
          )}
          {!form.imageUrl && <TextInput value={form.imageUrl || ''} onChange={(v) => setForm(p => ({ ...p, imageUrl: v }))} placeholder="https://..." />}
        </Field>

        <Field label="Website URL"><TextInput value={form.websiteUrl || ''} onChange={(v) => setForm(p => ({ ...p, websiteUrl: v }))} /></Field>
        <Field label="Country"><TextInput value={form.country || ''} onChange={(v) => setForm(p => ({ ...p, country: v }))} placeholder="e.g. US" /></Field>

        <Field label="Built By">
          <select value={form.creatorId || ''} onChange={(e) => setForm(p => ({ ...p, creatorId: e.target.value }))} className={inputCls} style={inputStyle}>
            <option value="">— None —</option>
            {creators.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Tools Used">
          <div className="border border-[#1a1a1a] p-2 max-h-36 overflow-y-auto" style={{ backgroundColor: '#f5f0e8' }}>
            {allTools.length === 0 && <p className="font-mono text-[10px] opacity-50" style={{ color: '#1a1a1a' }}>No tools in DB yet</p>}
            {allTools.map(t => (
              <label key={t.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                <input type="checkbox" checked={selectedTools.includes(t.name)} onChange={() => toggleTool(t.name)} className="w-3.5 h-3.5" style={{ accentColor: '#1a1a1a' }} />
                <span className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>{t.name}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Collaborators (comma-separated)"><TextInput value={form.collaborators || ''} onChange={(v) => setForm(p => ({ ...p, collaborators: v }))} /></Field>
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
        <span className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>{items.length} events</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[11px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Name</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Date</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">City</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Status</th>
              <th className="px-3 py-2 text-[10px]"></th>
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
                    <button onClick={() => openEdit(item)} className="font-mono text-[10px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[10px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[10px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[10px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
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
        <span className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>{items.length} grants</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[11px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Grant Name</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Org</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Amount</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Status</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Pub</th>
              <th className="px-3 py-2 text-[10px]"></th>
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
                    <button onClick={() => openEdit(item)} className="font-mono text-[10px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[10px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[10px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[10px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
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
        <span className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>{items.length} tools</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[11px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Name</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Category</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Pricing</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Featured</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Status</th>
              <th className="px-3 py-2 text-[10px]"></th>
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
                    <button onClick={() => openEdit(item)} className="font-mono text-[10px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[10px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[10px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[10px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
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
  published: boolean;
}

function CreatorsTab() {
  const [items, setItems] = useState<CreatorRow[]>([]);
  const [modal, setModal] = useState<{ open: boolean; item: CreatorRow | null }>({ open: false, item: null });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreatorRow>({ id: '', name: '', slug: '', description: '', imageUrl: '', websiteUrl: '', country: '', published: true });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/creators');
    const data = await res.json();
    setItems(data.creators || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setError('');
    setForm({ id: '', name: '', slug: '', description: '', imageUrl: '', websiteUrl: '', country: '', published: true });
    setModal({ open: true, item: null });
  };

  const openEdit = (item: CreatorRow) => {
    setError('');
    setForm({ ...item, description: item.description || '', imageUrl: item.imageUrl || '', websiteUrl: item.websiteUrl || '', country: item.country || '' });
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
        <span className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>{items.length} creators</span>
        <button onClick={openCreate} className="px-3 py-1 font-mono text-[11px] border border-[#1a1a1a]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>+ ADD</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]" style={{ color: '#1a1a1a' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Name</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Slug</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Country</th>
              <th className="text-left px-3 py-2 font-bold uppercase text-[10px]">Status</th>
              <th className="px-3 py-2 text-[10px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#f5f0e8' : '#ebe6de', borderBottom: '1px solid #1a1a1a' }}>
                <td className="px-3 py-2 font-bold">{item.name}</td>
                <td className="px-3 py-2 opacity-60">{item.slug}</td>
                <td className="px-3 py-2">{item.country || '—'}</td>
                <td className="px-3 py-2"><Badge active={item.published} label="" /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="font-mono text-[10px] underline hover:opacity-60">EDIT</button>
                    {deleteConfirm === item.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => remove(item.id)} className="font-mono text-[10px] underline" style={{ color: '#FF5C34' }}>CONFIRM</button>
                        <button onClick={() => setDeleteConfirm(null)} className="font-mono text-[10px] underline hover:opacity-60">NO</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="font-mono text-[10px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>DEL</button>
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
            <label className="px-3 py-1.5 border border-[#1a1a1a] font-mono text-[11px] cursor-pointer hover:opacity-70" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8' }}>
              UPLOAD
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {form.imageUrl && (
              <div className="flex items-center gap-2">
                <img src={form.imageUrl} alt="preview" className="w-10 h-10 object-cover border border-[#1a1a1a]" />
                <button onClick={() => setForm(p => ({ ...p, imageUrl: '' }))} className="font-mono text-[10px] underline hover:opacity-60" style={{ color: '#FF5C34' }}>REMOVE</button>
              </div>
            )}
          </div>
          {!form.imageUrl && (
            <p className="font-mono text-[10px] mt-1.5 opacity-50" style={{ color: '#1a1a1a' }}>Or paste a URL:</p>
          )}
          {!form.imageUrl && <TextInput value={form.imageUrl || ''} onChange={(v) => setForm(p => ({ ...p, imageUrl: v }))} placeholder="https://..." />}
        </Field>

        <CheckboxField label="Published" checked={form.published} onChange={(v) => setForm(p => ({ ...p, published: v }))} />
        <ActionButtons onSave={save} onCancel={() => setModal({ open: false, item: null })} saving={saving} error={error} />
      </Modal>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'worlds', label: 'WORLDS' },
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
            <span className="font-mono text-[10px] px-2 py-0.5 border border-[#f5f0e8]/40" style={{ color: '#f5f0e8' }}>ADMIN</span>
          </div>
          <button onClick={logout} className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 border border-[#f5f0e8]/40 hover:border-[#f5f0e8] transition-colors" style={{ color: '#f5f0e8' }}>
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
              className="relative px-5 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors"
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
        {tab === 'creators' && <CreatorsTab />}
        {tab === 'events' && <EventsTab />}
        {tab === 'grants' && <GrantsTab />}
        {tab === 'tools' && <ToolsTab />}
      </main>
    </div>
  );
}
