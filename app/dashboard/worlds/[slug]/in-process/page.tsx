'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { ReadOnlyBanner } from '../../../_components/ReadOnlyBanner';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { useWorldDashboard } from '../layout';
import { eraDateRange } from '../../../../../lib/eraDates';
import { resizeAndUploadImage } from '../../../../../lib/uploadImage';

/* In Process editor — the world's build-in-public roadmap: one or more ERAS
 * ("ORBIT ONE — debut album era"), each a stack of MILESTONES with statuses.
 * No funding fields anywhere (that's a future phase); dates are display
 * labels, not schedules. */

interface Milestone { id: string; title: string; description: string | null; dateLabel: string | null; status: string; imageUrl: string | null; sortOrder: number | null; }
interface ProcessPost { id: string; title: string; body: string | null; imageUrl: string | null; mintedUrl: string | null; createdAt: string; }
interface Era { id: string; title: string; description: string | null; startDate: string | null; endDate: string | null; startLabel: string | null; endLabel: string | null; status: string; inProcessUrl: string | null; milestones: Milestone[]; posts: ProcessPost[]; }

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

// A milestone worth minting: prefill for the moment composer.
export interface MintDraft { title: string; text: string; imageUrl: string; eraId: string }

export default function WorldInProcessPage() {
  const { world, privyId, isBuilder } = useWorldDashboard();
  const [eras, setEras] = useState<Era[] | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'era' | 'milestone'; id: string; title: string } | null>(null);

  // In Process connection state drives the ⛓ Moment buttons.
  const [ipConnected, setIpConnected] = useState<boolean | null>(null);
  const [mintDraft, setMintDraft] = useState<MintDraft | null>(null);
  useEffect(() => {
    if (!privyId) return;
    fetch(`/api/in-process/connect?privyId=${encodeURIComponent(privyId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIpConnected(!!(d?.configured && d?.connected)))
      .catch(() => setIpConnected(false));
  }, [privyId]);

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
          {isBuilder && ipConnected === false && (
            <p className="font-mono text-[11px] text-ink/40 mb-4">
              ⛓ Want your milestones minted as onchain moments?{' '}
              <Link href="/profile" className="underline text-ink/60">Connect In Process in your profile settings</Link>.
            </p>
          )}
          {eras.map((era) => (
            <EraEditor
              key={era.id}
              era={era}
              privyId={privyId}
              isBuilder={isBuilder}
              canMint={!!ipConnected}
              onMint={setMintDraft}
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

      {mintDraft && (
        <MintMomentModal draft={mintDraft} privyId={privyId} onClose={() => setMintDraft(null)} onMinted={load} />
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
function EraEditor({ era, privyId, isBuilder, canMint, onMint, onChanged, onError, onDelete }: {
  era: Era; privyId: string; isBuilder: boolean;
  canMint: boolean; onMint: (d: MintDraft) => void;
  onChanged: () => void; onError: (e: string) => void;
  onDelete: (kind: 'era' | 'milestone', id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: era.title, description: era.description ?? '', startDate: era.startDate ?? '', endDate: era.endDate ?? '', status: era.status, inProcessUrl: era.inProcessUrl ?? '' });
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
              Era · {era.status}{eraDateRange(era) ? ` · ${eraDateRange(era)}` : ''}
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
                <label className={labelCls}>Starts</label>
                <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ends</label>
                <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className={inputCls} />
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

      {/* Process log — Topia-first posts; optional mint-through */}
      <ProcessLogPanel era={era} privyId={privyId} isBuilder={isBuilder} canMint={canMint} onChanged={onChanged} onError={onError} />

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
                      {canMint && (
                        <button
                          onClick={() => onMint({ title: m.title, text: m.description ?? '', imageUrl: m.imageUrl ?? '', eraId: era.id })}
                          className={linkBtn}
                          style={{ color: '#FF5C34' }}
                          title="Mint this as an In Process moment"
                        >
                          ⛓ Moment
                        </button>
                      )}
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
                      // Flipping a milestone to DONE is the natural moment to
                      // mint — offer the composer right after the save lands.
                      onDoneTransition={canMint ? (d) => onMint({ title: d.title, text: d.text, imageUrl: d.imageUrl, eraId: era.id }) : undefined}
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
function MilestoneForm({ privyId, eraId, existing, nextIndex, onDone, onError, onDoneTransition }: {
  privyId: string; eraId: string; existing?: Milestone; nextIndex?: number;
  onDone: () => void; onError: (e: string) => void;
  onDoneTransition?: (d: { title: string; text: string; imageUrl: string }) => void;
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
      if (onDoneTransition && existing && existing.status !== 'done' && draft.status === 'done') {
        onDoneTransition({ title: draft.title.trim(), text: draft.description.trim(), imageUrl: draft.imageUrl.trim() });
      }
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
  const [draft, setDraft] = useState({ title: '', description: '', startDate: '', endDate: '', inProcessUrl: '' });
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
      setDraft({ title: '', description: '', startDate: '', endDate: '', inProcessUrl: '' });
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
            <label className={labelCls}>Starts</label>
            <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ends</label>
            <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className={inputCls} />
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

/* ── Mint-as-moment composer ───────────────────────────────────────────
 * Cross-posts a milestone (or update) to the builder's connected In Process
 * timeline. Minting is PERMANENT — onchain on Base, media on Arweave — so
 * the modal says exactly that and nothing mints without this explicit step. */
function MintMomentModal({ draft, privyId, onClose, onMinted }: {
  draft: MintDraft; privyId: string; onClose: () => void; onMinted: () => void;
}) {
  const { getAccessToken } = usePrivy();
  const [title, setTitle] = useState(draft.title);
  const [text, setText] = useState(draft.text);
  const [imageUrl, setImageUrl] = useState(draft.imageUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [minted, setMinted] = useState<{ collectUrl: string } | null>(null);

  const mint = async () => {
    if (!title.trim()) return;
    setBusy(true); setError('');
    try {
      const accessToken = await getAccessToken().catch(() => null);
      const res = await fetch('/api/in-process/moments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId, accessToken,
          title: title.trim(),
          text: text.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          eraId: draft.eraId,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Mint failed — nothing was posted.'); return; }
      setMinted({ collectUrl: d.collectUrl });
      onMinted();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[2300] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.72)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 bg-[var(--page-bg)] border border-ink/[0.1]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px]" style={{ color: '#FF5C34' }}>⛓ Mint an In Process moment</p>
            <p className="font-mono text-[11px] text-ink/45 mt-1">Posts to your onchain timeline on inprocess.world.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="bg-transparent border-none cursor-pointer text-[18px] leading-none p-0 text-ink/50">×</button>
        </div>

        {minted ? (
          <div className="py-2">
            <p className="font-mono text-[13px] font-bold text-ink mb-2">✓ Minted</p>
            <p className="font-mono text-[11px] text-ink/50 mb-4">
              It's on your timeline now — the world page's process log picks it up within a few minutes.
            </p>
            <a href={minted.collectUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian font-bold px-3 py-2 rounded-sm no-underline">
              View on In Process ↗
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Moment title" className="w-full border border-ink/15 bg-transparent px-3 py-2 font-mono text-[16px] sm:text-[13px] rounded-sm outline-none text-ink placeholder:text-ink/30 focus:border-ink/40" />
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="What happened? (optional)" className="w-full border border-ink/15 bg-transparent px-3 py-2 font-mono text-[16px] sm:text-[13px] rounded-sm outline-none text-ink placeholder:text-ink/30 focus:border-ink/40" />
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (optional — mirrored to Arweave)" className="w-full border border-ink/15 bg-transparent px-3 py-2 font-mono text-[16px] sm:text-[13px] rounded-sm outline-none text-ink placeholder:text-ink/30 focus:border-ink/40" />
            <p className="font-mono text-[10px] text-ink/40 leading-relaxed">
              ⚠ Minting is permanent: this becomes an onchain token on Base with media stored on
              Arweave. It can be hidden on In Process, but never deleted.
            </p>
            {error && <p className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</p>}
            <div className="flex items-center gap-3">
              <button onClick={mint} disabled={busy || !title.trim()} className={btnLime}>
                {busy ? 'Minting onchain…' : '⛓ Mint moment'}
              </button>
              <button onClick={onClose} className={btnGhost}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Process log panel — native build-in-public posts ──────────────────
 * A post is Topia-first: it always lives here and shows on the world page's
 * process log immediately. "Also mint on In Process" is optional per post,
 * for builders who've connected their account. */
function ProcessLogPanel({ era, privyId, isBuilder, canMint, onChanged, onError }: {
  era: Era; privyId: string; isBuilder: boolean; canMint: boolean;
  onChanged: () => void; onError: (e: string) => void;
}) {
  const { getAccessToken } = usePrivy();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', body: '', imageUrl: '', mint: false });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); onError('');
    try {
      setDraft((d) => ({ ...d, imageUrl: '' }));
      const url = await resizeAndUploadImage(file, 1280);
      setDraft((d) => ({ ...d, imageUrl: url }));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Image upload failed');
    } finally { setUploading(false); }
  };

  const post = async () => {
    if (!draft.title.trim()) return;
    setSaving(true); onError(''); setNote('');
    try {
      const accessToken = draft.mint ? await getAccessToken().catch(() => null) : null;
      const res = await fetch('/api/worlds/eras/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId, accessToken, eraId: era.id,
          title: draft.title.trim(),
          body: draft.body.trim() || undefined,
          imageUrl: draft.imageUrl.trim() || undefined,
          mintToInProcess: draft.mint,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { onError(d.error || 'Could not add the post.'); return; }
      setNote(d.mintWarning || (d.mintedUrl ? '✓ Posted + minted on In Process' : '✓ Posted'));
      setDraft({ title: '', body: '', imageUrl: '', mint: false });
      setAdding(false);
      onChanged();
    } finally { setSaving(false); }
  };

  const remove = async (postId: string) => {
    await fetch(`/api/worlds/eras/posts?postId=${postId}&privyId=${encodeURIComponent(privyId)}`, { method: 'DELETE' });
    onChanged();
  };

  return (
    <div className="bg-[var(--page-bg)] px-4 pt-4 pb-1 border-b border-ink/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40">Process log · {era.posts.length}</span>
        {isBuilder && <button onClick={() => setAdding((a) => !a)} className={btnGhost}>{adding ? 'Cancel' : '+ Post an update'}</button>}
      </div>

      {note && <p className="font-mono text-[11px] mb-2" style={{ color: 'var(--accent-ink, #4f6b00)' }}>{note}</p>}

      {adding && (
        <div className="border-2 border-dashed border-ink/15 rounded-sm p-3 mb-3 space-y-2">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="What happened? (e.g. Mix 01 done)" className={inputCls} />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={2} placeholder="A few words of process (optional)" className={inputCls} />
          <div className="flex items-center gap-3 flex-wrap">
            <label className={`${btnGhost} inline-block`} style={{ cursor: 'pointer' }}>
              {uploading ? 'Uploading…' : draft.imageUrl ? '↺ Replace image' : '+ Image'}
              <input type="file" accept="image/*" onChange={upload} className="hidden" />
            </label>
            {draft.imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={draft.imageUrl} alt="" className="h-12 w-12 object-cover rounded-sm border border-ink/10" />
            )}
            {canMint && (
              <label className="flex items-center gap-2 font-mono text-[11px] text-ink/60 cursor-pointer">
                <input type="checkbox" checked={draft.mint} onChange={(e) => setDraft({ ...draft, mint: e.target.checked })} className="cursor-pointer" />
                ⛓ Also mint on In Process <span className="text-ink/35">(permanent, onchain)</span>
              </label>
            )}
          </div>
          <button onClick={post} disabled={saving || uploading || !draft.title.trim()} className={btnLime}>
            {saving ? (draft.mint ? 'Posting + minting…' : 'Posting…') : 'Post update'}
          </button>
        </div>
      )}

      {era.posts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: 'thin' }}>
          {era.posts.map((p) => (
            <div key={p.id} className="shrink-0 w-[150px] border border-ink/[0.08] rounded-sm overflow-hidden relative group">
              {p.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.imageUrl} alt="" className="w-full h-[84px] object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-[84px] flex items-center justify-center bg-ink/[0.04]">
                  <span className="font-mono text-[16px] text-ink/25">✦</span>
                </div>
              )}
              <div className="px-2 py-1.5">
                <p className="font-mono text-[10px] font-bold text-ink truncate">{p.title}</p>
                <p className="font-mono text-[9px] text-ink/40">
                  {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {p.mintedUrl && <a href={p.mintedUrl} target="_blank" rel="noopener noreferrer" className="ml-1.5 no-underline" style={{ color: '#FF5C34' }}>⛓ minted</a>}
                </p>
              </div>
              {isBuilder && (
                <button
                  onClick={() => remove(p.id)}
                  aria-label="Delete post"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-obsidian/70 text-bone border-none cursor-pointer text-[11px] leading-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
