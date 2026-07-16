'use client';

import { useCallback, useEffect, useState } from 'react';
import { ReadOnlyBanner } from '../../../_components/ReadOnlyBanner';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { useWorldDashboard } from '../layout';

/* In Process editor — the world's build-in-public roadmap: one or more ERAS
 * ("ORBIT ONE — debut album era"), each a stack of MILESTONES with statuses.
 * No funding fields anywhere (that's a future phase); dates are display
 * labels, not schedules. */

interface Milestone { id: string; title: string; description: string | null; dateLabel: string | null; status: string; imageUrl: string | null; sortOrder: number | null; }
interface Era { id: string; title: string; description: string | null; startLabel: string | null; endLabel: string | null; status: string; inProcessUrl: string | null; milestones: Milestone[]; }

const inputCls = 'w-full border border-ink/15 bg-transparent px-3 py-2 font-mono text-[13px] rounded-sm outline-none text-ink placeholder:text-ink/30 focus:border-ink/40';
const labelCls = 'block font-mono text-[10px] uppercase tracking-[2px] text-ink/40 mb-1';
const btnLime = 'font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian font-bold px-3 py-1.5 rounded-sm hover:opacity-90 transition cursor-pointer border-none disabled:opacity-40';
const btnGhost = 'font-mono text-[11px] uppercase tracking-[2px] text-ink/60 border border-ink/15 hover:border-ink/40 hover:text-ink px-3 py-1.5 rounded-sm transition cursor-pointer bg-transparent disabled:opacity-40';
const linkBtn = 'font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none';

const MILESTONE_STATUSES = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'now', label: 'In motion (now)' },
  { value: 'done', label: 'Done ✓' },
  { value: 'paused', label: 'Paused' },
];
const ERA_STATUSES = [
  { value: 'active', label: 'Active — shown on the world page' },
  { value: 'complete', label: 'Complete — shown as a past era' },
  { value: 'archived', label: 'Archived — hidden everywhere' },
];

export default function WorldInProcessPage() {
  const { world, privyId, isBuilder } = useWorldDashboard();
  const [eras, setEras] = useState<Era[] | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'era' | 'milestone'; id: string; title: string } | null>(null);

  const load = useCallback(() => {
    if (!world?.id) return;
    fetch(`/api/worlds/eras?worldId=${world.id}`)
      .then((r) => r.json())
      .then((d) => setEras(d.eras ?? []))
      .catch(() => setEras([]));
  }, [world?.id]);
  useEffect(() => { load(); }, [load]);

  if (!world) return null;

  return (
    <div>
      {!isBuilder && <ReadOnlyBanner />}

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-mono text-[13px] font-bold uppercase tracking-[2px] text-ink">In Process · Roadmap</h2>
          <p className="font-mono text-[11px] text-ink/40 mt-1 max-w-xl">
            An era is a chapter of this world&apos;s story (&quot;ORBIT ONE — debut album era&quot;), built from milestones
            with statuses. It renders as the In Process tab on your world page. Paste your In Process
            (inprocess.world) link to sync your process log under the roadmap.
          </p>
        </div>
      </div>

      {eras === null ? (
        <p className="font-mono text-[12px] text-ink/40">Loading…</p>
      ) : (
        <>
          {error && <p className="font-mono text-[12px] mb-3" style={{ color: '#FF5C34' }}>{error}</p>}
          {eras.map((era) => (
            <EraEditor
              key={era.id}
              era={era}
              privyId={privyId}
              isBuilder={isBuilder}
              onChanged={load}
              onError={setError}
              onDelete={(kind, id, title) => setConfirmDelete({ kind, id, title })}
            />
          ))}
          {isBuilder && <NewEraForm worldId={world.id} privyId={privyId} onCreated={load} onError={setError} hasEras={eras.length > 0} />}
          {!isBuilder && eras.length === 0 && (
            <p className="font-mono text-[12px] text-ink/40">No roadmap yet.</p>
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.kind === 'era' ? 'this era' : 'this milestone'}?`}
          body={`"${confirmDelete.title}" will be removed from the world page${confirmDelete.kind === 'era' ? ' along with all its milestones' : ''}. This can't be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            const url = confirmDelete.kind === 'era'
              ? `/api/worlds/eras?eraId=${confirmDelete.id}&privyId=${encodeURIComponent(privyId)}`
              : `/api/worlds/eras/milestones?milestoneId=${confirmDelete.id}&privyId=${encodeURIComponent(privyId)}`;
            await fetch(url, { method: 'DELETE' });
            setConfirmDelete(null);
            load();
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

/* ── Era block: header fields + milestone list ─────────────────────── */
function EraEditor({ era, privyId, isBuilder, onChanged, onError, onDelete }: {
  era: Era; privyId: string; isBuilder: boolean;
  onChanged: () => void; onError: (e: string) => void;
  onDelete: (kind: 'era' | 'milestone', id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: era.title, description: era.description ?? '', startLabel: era.startLabel ?? '', endLabel: era.endLabel ?? '', status: era.status, inProcessUrl: era.inProcessUrl ?? '' });
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);

  const saveEra = async () => {
    if (!draft.title.trim()) return;
    setSaving(true); onError('');
    try {
      const res = await fetch('/api/worlds/eras', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, eraId: era.id, ...draft }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); onError(d.error || 'Could not save the era.'); return; }
      setEditing(false);
      onChanged();
    } finally { setSaving(false); }
  };

  // Reorder = swap locally, persist index → sortOrder for the whole list.
  const move = async (m: Milestone, dir: -1 | 1) => {
    const idx = era.milestones.findIndex((x) => x.id === m.id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= era.milestones.length) return;
    const next = [...era.milestones];
    [next[idx], next[j]] = [next[j], next[idx]];
    await Promise.all(next.map((x, i) => fetch('/api/worlds/eras/milestones', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyId, milestoneId: x.id, sortOrder: i }),
    })));
    onChanged();
  };

  return (
    <div className="border border-ink/[0.08] rounded-lg overflow-hidden mb-6">
      <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-ink/35">
              Era · {era.status}{era.startLabel || era.endLabel ? ` · ${[era.startLabel, era.endLabel].filter(Boolean).join(' — ')}` : ''}
            </p>
            <h3 className="font-mono text-[15px] font-bold uppercase text-ink mt-0.5">{era.title}</h3>
            {era.description && <p className="font-mono text-[11px] text-ink/50 mt-0.5">{era.description}</p>}
            {era.inProcessUrl && (
              <a href={era.inProcessUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-[1px] no-underline mt-1 inline-block" style={{ color: '#FF5C34' }}>
                ⛓ Synced with In Process ↗
              </a>
            )}
          </div>
          {isBuilder && (
            <span className="flex gap-2 shrink-0">
              <button onClick={() => setEditing((e) => !e)} className={linkBtn} style={{ color: 'var(--foreground, #1a1a1a)' }}>{editing ? 'Cancel' : 'Edit era'}</button>
              <button onClick={() => onDelete('era', era.id, era.title)} className={linkBtn} style={{ color: '#FF5C34' }}>Del</button>
            </span>
          )}
        </div>

        {editing && (
          <div className="mt-3 space-y-2">
            <div>
              <label className={labelCls}>Era title</label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>One-line description</label>
              <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="debut album era" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Starts (label)</label>
                <input value={draft.startLabel} onChange={(e) => setDraft({ ...draft, startLabel: e.target.value })} placeholder="MAR 2026" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ends (label)</label>
                <input value={draft.endLabel} onChange={(e) => setDraft({ ...draft, endLabel: e.target.value })} placeholder="FEB 2027" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputCls} appearance-none cursor-pointer`}>
                {ERA_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>In Process link (optional — your inprocess.world profile)</label>
              <input value={draft.inProcessUrl} onChange={(e) => setDraft({ ...draft, inProcessUrl: e.target.value })} placeholder="https://inprocess.world/0x…" className={inputCls} />
            </div>
            <button onClick={saveEra} disabled={saving || !draft.title.trim()} className={btnLime}>{saving ? 'Saving…' : 'Save era'}</button>
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="bg-[var(--page-bg)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40">Milestones · {era.milestones.length}</span>
          {isBuilder && <button onClick={() => setAdding((a) => !a)} className={btnGhost}>{adding ? 'Cancel' : '+ Milestone'}</button>}
        </div>

        {adding && (
          <MilestoneForm
            privyId={privyId}
            eraId={era.id}
            nextIndex={era.milestones.length}
            onDone={() => { setAdding(false); onChanged(); }}
            onError={onError}
          />
        )}

        {era.milestones.length === 0 && !adding ? (
          <p className="font-mono text-[11px] text-ink/35">No milestones yet — each one is a stage of the era.</p>
        ) : (
          <div className="space-y-2">
            {era.milestones.map((m, i) => (
              <div key={m.id} className="border border-ink/[0.08] rounded-sm px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] font-bold text-ink/35 w-8 shrink-0">M{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[13px] font-bold text-ink truncate">{m.title}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[1px] text-ink/40">
                      {m.status === 'done' ? 'Done ✓' : m.status === 'now' ? 'In motion · now' : m.status}
                      {m.dateLabel ? ` · ${m.dateLabel}` : ''}
                    </p>
                  </div>
                  {isBuilder && (
                    <span className="flex items-center gap-2 shrink-0">
                      <button onClick={() => move(m, -1)} disabled={i === 0} aria-label="Move up" className="w-6 h-6 rounded-sm border border-ink/15 cursor-pointer bg-transparent font-mono text-[11px] text-ink disabled:opacity-25">↑</button>
                      <button onClick={() => move(m, 1)} disabled={i === era.milestones.length - 1} aria-label="Move down" className="w-6 h-6 rounded-sm border border-ink/15 cursor-pointer bg-transparent font-mono text-[11px] text-ink disabled:opacity-25">↓</button>
                      <button onClick={() => setEditingMilestone(editingMilestone === m.id ? null : m.id)} className={linkBtn} style={{ color: 'var(--foreground, #1a1a1a)' }}>
                        {editingMilestone === m.id ? 'Cancel' : 'Edit'}
                      </button>
                      <button onClick={() => onDelete('milestone', m.id, m.title)} className={linkBtn} style={{ color: '#FF5C34' }}>Del</button>
                    </span>
                  )}
                </div>
                {editingMilestone === m.id && (
                  <div className="mt-3 pt-3 border-t border-ink/[0.08]">
                    <MilestoneForm
                      privyId={privyId}
                      eraId={era.id}
                      existing={m}
                      onDone={() => { setEditingMilestone(null); onChanged(); }}
                      onError={onError}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Milestone add/edit form ───────────────────────────────────────── */
function MilestoneForm({ privyId, eraId, existing, nextIndex, onDone, onError }: {
  privyId: string; eraId: string; existing?: Milestone; nextIndex?: number;
  onDone: () => void; onError: (e: string) => void;
}) {
  const [draft, setDraft] = useState({
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    dateLabel: existing?.dateLabel ?? '',
    status: existing?.status ?? 'upcoming',
    imageUrl: existing?.imageUrl ?? '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.title.trim()) return;
    setSaving(true); onError('');
    try {
      const res = await fetch('/api/worlds/eras/milestones', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing
          ? { privyId, milestoneId: existing.id, ...draft }
          : { privyId, eraId, ...draft, sortOrder: nextIndex ?? 0 }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); onError(d.error || 'Could not save the milestone.'); return; }
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-2 mb-3">
      <div>
        <label className={labelCls}>Milestone title</label>
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Album Production" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Description (optional)</label>
        <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this stage is" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>When (label)</label>
          <input value={draft.dateLabel} onChange={(e) => setDraft({ ...draft, dateLabel: e.target.value })} placeholder="MAR–JUN 2026" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputCls} appearance-none cursor-pointer`}>
            {MILESTONE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Image URL (optional)</label>
        <input value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="https://…" className={inputCls} />
      </div>
      <button onClick={save} disabled={saving || !draft.title.trim()} className={btnLime}>
        {saving ? 'Saving…' : existing ? 'Save milestone' : 'Add milestone'}
      </button>
    </div>
  );
}

/* ── New era form ──────────────────────────────────────────────────── */
function NewEraForm({ worldId, privyId, onCreated, onError, hasEras }: {
  worldId: string; privyId: string; onCreated: () => void; onError: (e: string) => void; hasEras: boolean;
}) {
  const [open, setOpen] = useState(!hasEras);
  const [draft, setDraft] = useState({ title: '', description: '', startLabel: '', endLabel: '', inProcessUrl: '' });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!draft.title.trim()) return;
    setSaving(true); onError('');
    try {
      const res = await fetch('/api/worlds/eras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, worldId, ...draft }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); onError(d.error || 'Could not create the era.'); return; }
      setDraft({ title: '', description: '', startLabel: '', endLabel: '', inProcessUrl: '' });
      setOpen(false);
      onCreated();
    } finally { setSaving(false); }
  };

  if (!open) {
    return <button onClick={() => setOpen(true)} className={btnGhost}>+ New era</button>;
  }

  return (
    <div className="border-2 border-dashed border-ink/15 rounded-lg p-4">
      <p className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40 mb-3">
        {hasEras ? 'New era' : 'Start your first era'}
      </p>
      <div className="space-y-2">
        <div>
          <label className={labelCls}>Era title</label>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="ORBIT ONE" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>One-line description</label>
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="debut album era" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Starts (label)</label>
            <input value={draft.startLabel} onChange={(e) => setDraft({ ...draft, startLabel: e.target.value })} placeholder="MAR 2026" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ends (label)</label>
            <input value={draft.endLabel} onChange={(e) => setDraft({ ...draft, endLabel: e.target.value })} placeholder="FEB 2027" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>In Process link (optional — syncs your process log)</label>
          <input value={draft.inProcessUrl} onChange={(e) => setDraft({ ...draft, inProcessUrl: e.target.value })} placeholder="https://inprocess.world/0x…" className={inputCls} />
        </div>
        <div className="flex gap-2">
          <button onClick={create} disabled={saving || !draft.title.trim()} className={btnLime}>{saving ? 'Creating…' : 'Create era'}</button>
          {hasEras && <button onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>}
        </div>
      </div>
    </div>
  );
}
