'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { WorldConfig } from './worldConfig';
import { eraDateRange } from '../../../lib/eraDates';
import { POST_KINDS, postKindGlyph, linkThumbnail, type PostKind } from '../../../lib/processPosts';
import { EraDateField, ImageField, inputCls, labelCls, btnLime, btnGhost, MILESTONE_STATUSES, type Precision } from './InProcessFields';

/* The IN PROCESS roadmap — Latashá's Turn-2 mockup, minus funding.
 *
 * Structure follows her model: each PROJECT carries its own roadmap (the
 * "era" — ORBIT ONE the era IS ORBIT ONE the project), drawn as a horizontal
 * node timeline: filled orange nodes for DONE, a ring on NOW with its card
 * highlighted, hollow nodes ahead. A process log of typed posts (moment /
 * thought / link / embed) runs underneath, merged with the moments synced
 * from inprocess.world.
 *
 * This component is ALSO the editor: builders add and edit everything right
 * here on the world page — no dashboard round-trip. */

export interface EraMilestoneView { id: string; title: string; description: string | null; startDate: string | null; endDate: string | null; startPrecision: string | null; endPrecision: string | null; dateLabel: string | null; status: string; imageUrl: string | null; }
export interface EraPostView { id: string; kind: string; title: string; body: string | null; imageUrl: string | null; linkUrl: string | null; mintedUrl: string | null; milestoneId?: string | null; createdAt: string; }

/* One process-log card's data, whether it's a native post or a synced
 * In Process moment — what the PostModal renders. */
interface LogEntry {
  id: string; postId: string | null; kind: string | null; glyph: string;
  title: string; body: string | null; imageUrl: string | null;
  date: string | null; linkUrl: string | null; mintedUrl: string | null;
  milestoneId: string | null;
}
export interface EraView { id: string; title: string; description: string | null; projectId?: string | null; projectName?: string | null; projectSlug?: string | null; startDate: string | null; endDate: string | null; startPrecision: string | null; endPrecision: string | null; startLabel: string | null; endLabel: string | null; status: string; inProcessUrl: string | null; milestones: EraMilestoneView[]; posts: EraPostView[]; }
export interface ProjectOption { id: string; name: string; slug: string; }
interface Moment { id: string; name: string | null; imageUrl: string | null; mime: string | null; createdAt: string | null; collectUrl: string | null; }

const ORANGE = 'var(--orange, #FF5C34)';
const STATUS_META: Record<string, string> = { done: 'DONE ✓', now: 'NOW', upcoming: 'UPCOMING', paused: 'PAUSED' };

/* ── Timeline node ─────────────────────────────────────────────────── */
function Node({ state, small }: { state: 'done' | 'now' | 'future'; small?: boolean }) {
  const s = small ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  const sNow = small ? 'w-3 h-3 border-2' : 'w-4 h-4 border-[3px]';
  if (state === 'done') return <span className={`${s} rounded-full shrink-0 z-[1]`} style={{ backgroundColor: ORANGE }} />;
  if (state === 'now') return <span className={`${sNow} rounded-full shrink-0 z-[1] bg-[var(--page-bg)]`} style={{ borderColor: ORANGE, borderStyle: 'solid' }} />;
  return <span className={`${s} rounded-full shrink-0 z-[1] border-2 border-ink/25 bg-[var(--page-bg)]`} />;
}

/* ── Masthead ──────────────────────────────────────────────────────
 * One branded header for the whole section. A first-time visitor
 * should get the entire system from this alone: what they're looking
 * at, what the node states mean, what ⛓ means, and that In Process
 * (inprocess.world) is the onchain side of it. */
function Masthead({ canEdit, canMint }: { canEdit: boolean; canMint: boolean }) {
  return (
    <div className="border-b pb-4" style={{ borderColor: 'color-mix(in srgb, #FF5C34 55%, transparent)' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-basement font-black text-[clamp(18px,2.6vw,24px)] uppercase leading-none text-ink">
          In<span style={{ color: ORANGE }}>•</span>Process
        </h2>
        <a
          href="https://inprocess.world"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] uppercase tracking-[2px] no-underline text-ink/40 hover:text-ink/70 transition-colors"
        >
          an inprocess.world integration ↗
        </a>
      </div>
      <p className="font-mono text-[12px] text-ink/55 mt-1.5 max-w-2xl">
        Build in public. Each project&apos;s journey, told as a roadmap of milestones and a live log of the
        process — tap any milestone to see the updates behind it.
      </p>

      {/* Legend — the timeline reads itself */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px] text-ink/55"><Node state="done" small /> Done</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px] text-ink/55"><Node state="now" small /> In motion</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px] text-ink/55"><Node state="future" small /> Up next</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px]" style={{ color: ORANGE }}>⛓ Minted onchain — collectible</span>
      </div>

      {canEdit && (
        <p className="font-mono text-[10px] text-ink/40 mt-3">
          {canMint
            ? <>⛓ Minting is on — any update you post can also publish to your In Process timeline.</>
            : <>Want your updates minted onchain too? <Link href="/profile" className="underline text-ink/60">Connect In Process in your profile</Link>.</>}
        </p>
      )}
    </div>
  );
}

/* ── Milestone add/edit modal (builders only) ──────────────────────
 * Reading a milestone happens inline on the timeline — selecting a
 * card opens its detail panel and filters the log. This modal is
 * purely the form. */
function MilestoneModal({ eraId, existing, nextIndex, privyId, onClose, onChanged }: {
  eraId: string; existing?: EraMilestoneView; nextIndex?: number; privyId: string;
  onClose: () => void; onChanged: () => void;
}) {
  const [draft, setDraft] = useState({
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    startDate: existing?.startDate ?? '',
    endDate: existing?.endDate ?? '',
    startPrecision: (existing?.startPrecision ?? 'month') as Precision,
    endPrecision: (existing?.endPrecision ?? 'month') as Precision,
    status: existing?.status ?? 'upcoming',
    imageUrl: existing?.imageUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!draft.title.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/worlds/eras/milestones', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing
          ? { privyId, milestoneId: existing.id, ...draft }
          : { privyId, eraId, ...draft, sortOrder: nextIndex ?? 0 }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Could not save.'); return; }
      onChanged();
      onClose();
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!existing) return;
    await fetch(`/api/worlds/eras/milestones?milestoneId=${existing.id}&privyId=${encodeURIComponent(privyId)}`, { method: 'DELETE' });
    onChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2300] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.72)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 bg-[var(--page-bg)] border border-ink/[0.1] max-h-[88lvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-ink/50">
            {existing ? 'Edit milestone' : 'New milestone'}
          </p>
          <button onClick={onClose} aria-label="Close" className="bg-transparent border-none cursor-pointer text-[18px] leading-none p-0 text-ink/50">×</button>
        </div>
        <div className="space-y-2.5">
          <div>
            <label className={labelCls}>What&apos;s the milestone?</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Album Production" className={inputCls} autoFocus />
          </div>
          <div>
            <label className={labelCls}>One line about it (optional)</label>
            <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this stage is" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <EraDateField label="Starts" value={draft.startDate} precision={draft.startPrecision}
              onChange={(n) => setDraft({ ...draft, startDate: n.value, startPrecision: n.precision })} />
            <EraDateField label="Ends (optional)" value={draft.endDate} precision={draft.endPrecision}
              onChange={(n) => setDraft({ ...draft, endDate: n.value, endPrecision: n.precision })} />
          </div>
          <div>
            <label className={labelCls}>Where is it?</label>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputCls} appearance-none cursor-pointer`}>
              {MILESTONE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <ImageField value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
          {error && <p className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</p>}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button onClick={save} disabled={saving || !draft.title.trim()} className={btnLime}>
              {saving ? 'Saving…' : existing ? 'Save' : 'Add milestone'}
            </button>
            <button onClick={onClose} className={btnGhost}>Cancel</button>
            {existing && (
              confirmingDelete
                ? <button onClick={remove} className="font-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded-sm cursor-pointer border-none font-bold" style={{ backgroundColor: '#FF5C34', color: '#fff' }}>Really delete?</button>
                : <button onClick={() => setConfirmingDelete(true)} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none" style={{ color: '#FF5C34' }}>Delete</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Era (roadmap) create/edit form ────────────────────────────────── */
const NEW_PROJECT = '__new__';

function EraForm({ worldId, projects, existing, privyId, onClose, onChanged }: {
  worldId: string; projects: ProjectOption[]; existing?: EraView; privyId: string;
  onClose: () => void; onChanged: () => void;
}) {
  const [draft, setDraft] = useState({
    // Roadmaps belong to projects — creating one defaults to the first
    // project, or straight into "make a new project" when there are none.
    projectId: existing ? (existing.projectId ?? '') : (projects[0]?.id ?? NEW_PROJECT),
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    startDate: existing?.startDate ?? '',
    endDate: existing?.endDate ?? '',
    startPrecision: (existing?.startPrecision ?? 'month') as Precision,
    endPrecision: (existing?.endPrecision ?? 'month') as Precision,
    status: existing?.status ?? 'active',
    inProcessUrl: existing?.inProcessUrl ?? '',
  });
  const [newProjectName, setNewProjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const makingProject = draft.projectId === NEW_PROJECT;

  const pickProject = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    // Prefill the roadmap title with the project name until the builder types their own.
    const titleUntouched = !draft.title.trim() || projects.some((x) => x.name === draft.title) || draft.title === newProjectName;
    setDraft({ ...draft, projectId, title: titleUntouched && p ? p.name : draft.title });
  };

  const typeNewProjectName = (name: string) => {
    const titleUntouched = !draft.title.trim() || projects.some((x) => x.name === draft.title) || draft.title === newProjectName;
    setNewProjectName(name);
    if (titleUntouched) setDraft({ ...draft, title: name });
  };

  const save = async () => {
    if (!draft.title.trim() || (makingProject && !newProjectName.trim())) return;
    setSaving(true); setError('');
    try {
      // Project-first: a brand-new project is created right here, then the
      // roadmap attaches to it — no dashboard round-trip.
      let projectId: string | null = draft.projectId || null;
      if (makingProject) {
        const pRes = await fetch('/api/worlds/projects', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId, worldId, name: newProjectName.trim() }),
        });
        const pData = await pRes.json().catch(() => ({}));
        if (!pRes.ok || !pData.project?.id) { setError(pData.error || 'Could not create the project.'); return; }
        projectId = pData.project.id;
      }
      const res = await fetch('/api/worlds/eras', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing
          ? { privyId, eraId: existing.id, ...draft, projectId }
          : { privyId, worldId, ...draft, projectId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Could not save.'); return; }
      onChanged();
      onClose();
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!existing) return;
    await fetch(`/api/worlds/eras?eraId=${existing.id}&privyId=${encodeURIComponent(privyId)}`, { method: 'DELETE' });
    onChanged();
    onClose();
  };

  return (
    <div className="border-2 border-dashed border-ink/15 rounded-lg p-4 space-y-2.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-ink/50">
        {existing ? 'Edit roadmap' : 'Start a roadmap'}
      </p>
      <div>
        <label className={labelCls}>Which project is this the roadmap for?</label>
        <p className="font-mono text-[10px] text-ink/40 mb-1.5 -mt-0.5">
          Roadmaps belong to projects — pick one, or spin up a new project right here.
        </p>
        <select value={draft.projectId} onChange={(e) => e.target.value === NEW_PROJECT ? setDraft({ ...draft, projectId: NEW_PROJECT }) : pickProject(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value={NEW_PROJECT}>+ New project…</option>
          <option value="">No project — a world-wide roadmap</option>
        </select>
      </div>
      {makingProject && (
        <div className="border-l-2 pl-3" style={{ borderColor: ORANGE }}>
          <label className={labelCls}>Name the new project</label>
          <input value={newProjectName} onChange={(e) => typeNewProjectName(e.target.value)} placeholder="e.g. Debut Album, Short Film, Community Zine" className={inputCls} autoFocus={!projects.length} />
          <p className="font-mono text-[10px] text-ink/40 mt-1">
            It&apos;s created with this roadmap and appears under Projects — add images and details anytime from the project page.
          </p>
        </div>
      )}
      <div>
        <label className={labelCls}>Roadmap title</label>
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="ORBIT ONE" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>One-liner (optional)</label>
        <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="debut album era" className={inputCls} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <EraDateField label="Starts" value={draft.startDate} precision={draft.startPrecision}
          onChange={(n) => setDraft({ ...draft, startDate: n.value, startPrecision: n.precision })} />
        <EraDateField label="Ends (optional)" value={draft.endDate} precision={draft.endPrecision}
          onChange={(n) => setDraft({ ...draft, endDate: n.value, endPrecision: n.precision })} />
      </div>
      {existing && (
        <div>
          <label className={labelCls}>Status</label>
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputCls} appearance-none cursor-pointer`}>
            <option value="active">Active — shown on the world page</option>
            <option value="complete">Complete — shown as a past era</option>
            <option value="archived">Archived — hidden from visitors</option>
          </select>
        </div>
      )}
      <div>
        <label className={labelCls}>Already on In Process? (optional)</label>
        <input value={draft.inProcessUrl} onChange={(e) => setDraft({ ...draft, inProcessUrl: e.target.value })} placeholder="https://inprocess.world/0x…" className={inputCls} />
        <p className="font-mono text-[10px] text-ink/40 mt-1">
          Paste your inprocess.world artist link and the moments you mint there show up in this process log automatically.
        </p>
      </div>
      {error && <p className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={save} disabled={saving || !draft.title.trim() || (makingProject && !newProjectName.trim())} className={btnLime}>
          {saving ? 'Saving…' : existing ? 'Save' : makingProject ? 'Create project + roadmap' : 'Create roadmap'}
        </button>
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        {existing && (
          confirmingDelete
            ? <button onClick={remove} className="font-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded-sm cursor-pointer border-none font-bold" style={{ backgroundColor: '#FF5C34', color: '#fff' }}>Really delete everything?</button>
            : <button onClick={() => setConfirmingDelete(true)} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none" style={{ color: '#FF5C34' }}>Delete roadmap</button>
        )}
      </div>
    </div>
  );
}

/* ── Plain-language explainer ──────────────────────────────────────
 * "What is In Process?" — one collapsible card that a first-time visitor
 * or a brand-new builder can read and fully get the integration. */
function HowThisWorks({ canEdit }: { canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-ink/[0.08] rounded-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-transparent border-none cursor-pointer text-left"
      >
        <span className="font-mono text-[11px] font-bold uppercase tracking-[2px] text-ink/60">
          ⓘ How this works — what is In Process?
        </span>
        <span className="font-mono text-[13px] text-ink/40">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] mb-1" style={{ color: ORANGE }}>1 · The roadmap lives on Topia</p>
            <p className="font-mono text-[12px] text-ink/65 leading-relaxed">
              Each project tells its story as milestones — done ✓, in motion now, up next — plus a process log of
              updates (images, thoughts, links). Everything here is Topia-native: no other account needed.
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] mb-1" style={{ color: ORANGE }}>2 · In Process is an optional companion</p>
            <p className="font-mono text-[12px] text-ink/65 leading-relaxed">
              <a href="https://inprocess.world" target="_blank" rel="noopener noreferrer" className="underline text-ink">In Process</a> is
              an onchain journal for creatives: you publish (&ldquo;mint&rdquo;) moments of your process permanently,
              and supporters can collect them. A <span style={{ color: ORANGE }}>⛓</span> on a card here means that
              update is minted — open the card to collect it there.
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] mb-1" style={{ color: ORANGE }}>3 · How they connect</p>
            <p className="font-mono text-[12px] text-ink/65 leading-relaxed">
              {canEdit ? (
                <>
                  Two directions, both optional. <strong>Mint from Topia:</strong> connect once in your{' '}
                  <Link href="/profile" className="underline text-ink">profile</Link> (&ldquo;Sign in with In•Process&rdquo;) and
                  every update you post here gets a ⛓ mint checkbox. <strong>Sync to Topia:</strong> paste your
                  inprocess.world link on a roadmap and moments you mint over there appear in this log automatically.
                </>
              ) : (
                <>
                  Builders can post updates straight from Topia and optionally mint them onchain, or sync in the
                  moments they already mint on inprocess.world — the log shows both in one place.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Typed post composer (moment / thought / link / embed) ─────────── */
function PostComposer({ era, privyId, canMint, initialMilestoneId = '', onClose, onChanged }: {
  era: EraView; privyId: string; canMint: boolean; initialMilestoneId?: string;
  onClose: () => void; onChanged: () => void;
}) {
  const { getAccessToken } = usePrivy();
  const blank = { kind: 'moment' as PostKind, title: '', body: '', imageUrl: '', linkUrl: '', milestoneId: initialMilestoneId, mint: false };
  const [draft, setDraft] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const needsLink = draft.kind === 'link' || draft.kind === 'embed';
  const ready = needsLink ? !!draft.linkUrl.trim() : !!draft.title.trim();

  const post = async () => {
    if (!ready) return;
    setSaving(true); setError('');
    try {
      const accessToken = draft.mint ? await getAccessToken().catch(() => null) : null;
      const res = await fetch('/api/worlds/eras/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId, accessToken, eraId: era.id,
          kind: draft.kind,
          title: draft.title.trim() || undefined,
          body: draft.body.trim() || undefined,
          imageUrl: draft.imageUrl.trim() || undefined,
          linkUrl: draft.linkUrl.trim() || undefined,
          milestoneId: draft.milestoneId || undefined,
          mintToInProcess: draft.mint,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not post.'); return; }
      onChanged();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="border-2 border-dashed border-ink/15 rounded-sm p-3 mt-3 space-y-2.5">
      <div className="flex gap-1.5 flex-wrap">
        {POST_KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setDraft({ ...draft, kind: k.id })}
            className={`font-mono text-[11px] uppercase tracking-[1px] px-2.5 py-1.5 rounded-sm cursor-pointer transition ${
              draft.kind === k.id ? 'bg-lime text-obsidian font-bold border-none' : 'bg-transparent text-ink/55 border border-ink/15 hover:border-ink/40'
            }`}
          >
            {k.glyph} {k.label}
          </button>
        ))}
      </div>
      <p className="font-mono text-[10px] text-ink/35">{POST_KINDS.find((k) => k.id === draft.kind)?.hint} · posts to “{era.title}”</p>

      {draft.kind === 'moment' && (
        <>
          <ImageField value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} label="Image" />
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="What happened? (e.g. Mix 01 done)" className={inputCls} />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={2} placeholder="A few words of process (optional)" className={inputCls} />
        </>
      )}
      {draft.kind === 'thought' && (
        <>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="this is the time when…" className={inputCls} />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={4} placeholder="Write it out" className={inputCls} />
        </>
      )}
      {needsLink && (
        <>
          <input value={draft.linkUrl} onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
            placeholder={draft.kind === 'link' ? 'Paste any link from the internet' : 'Paste a YouTube / SoundCloud / Spotify link'} className={inputCls} />
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title (optional — uses the site name)" className={inputCls} />
        </>
      )}

      {era.milestones.length > 0 && (
        <div>
          <label className={labelCls}>Ties to a milestone (optional)</label>
          <select
            value={draft.milestoneId}
            onChange={(e) => setDraft({ ...draft, milestoneId: e.target.value })}
            className={`${inputCls} appearance-none cursor-pointer`}
          >
            <option value="">Whole roadmap — no specific milestone</option>
            {era.milestones.map((m, i) => (
              <option key={m.id} value={m.id}>M{String(i + 1).padStart(2, '0')} · {m.title}</option>
            ))}
          </select>
        </div>
      )}

      {canMint ? (
        <label className="flex items-center gap-2 font-mono text-[11px] text-ink/60 cursor-pointer">
          <input type="checkbox" checked={draft.mint} onChange={(e) => setDraft({ ...draft, mint: e.target.checked })} className="cursor-pointer" />
          ⛓ Also mint on In Process <span className="text-ink/35">(permanent, onchain)</span>
        </label>
      ) : (
        <p className="font-mono text-[10px] text-ink/35">
          This posts to Topia. Want it minted onchain too? <Link href="/profile" className="underline text-ink/60">Connect In Process in your profile</Link> and a ⛓ mint option appears here.
        </p>
      )}
      {error && <p className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={post} disabled={saving || !ready} className={btnLime}>
          {saving ? (draft.mint ? 'Posting + minting…' : 'Posting…') : 'Post'}
        </button>
        <button onClick={onClose} className={btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Post detail modal ─────────────────────────────────────────────
 * Every process-log card opens here first — links and collect pages
 * are an explicit button inside, never a surprise navigation. */
function PostModal({ entry, milestones, canEdit, onDelete, onClose }: {
  entry: LogEntry; milestones: EraMilestoneView[]; canEdit: boolean;
  onDelete: (postId: string) => Promise<void>; onClose: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const msIndex = entry.milestoneId ? milestones.findIndex((m) => m.id === entry.milestoneId) : -1;
  const milestone = msIndex >= 0 ? milestones[msIndex] : null;
  const minted = !!entry.mintedUrl;
  const kindLabel = entry.kind
    ? POST_KINDS.find((k) => k.id === entry.kind)?.label ?? entry.kind
    : 'In Process moment';
  const linkHost = entry.linkUrl ? (() => { try { return new URL(entry.linkUrl!).hostname.replace(/^www\./, ''); } catch { return null; } })() : null;

  const remove = async () => {
    if (!entry.postId) return;
    setDeleting(true);
    try { await onDelete(entry.postId); onClose(); } finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-[2300] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.72)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 bg-[var(--page-bg)] border border-ink/[0.1] max-h-[88lvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-ink/50">
            {entry.glyph} {kindLabel}
            {minted && <span className="ml-1.5" style={{ color: ORANGE }}>⛓ minted</span>}
          </p>
          <button onClick={onClose} aria-label="Close" className="bg-transparent border-none cursor-pointer text-[18px] leading-none p-0 text-ink/50">×</button>
        </div>
        <h4 className="font-basement font-black text-[20px] uppercase leading-tight text-ink mt-2">{entry.title}</h4>
        {entry.date && (
          <p className="font-mono text-[11px] uppercase tracking-[1px] text-ink/45 mt-1">
            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {milestone && (
          <p className="inline-block font-mono text-[9px] font-bold uppercase tracking-[2px] px-2 py-0.5 rounded-sm mt-2 border" style={{ color: ORANGE, borderColor: ORANGE }}>
            M{String(msIndex + 1).padStart(2, '0')} · {milestone.title}
          </p>
        )}
        {entry.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={entry.imageUrl} alt="" className="w-full max-h-[280px] object-cover rounded-sm mt-3" />
        )}
        {entry.body && <p className="font-mono text-[13px] text-ink/70 leading-relaxed mt-3 whitespace-pre-wrap">{entry.body}</p>}

        {(entry.linkUrl || entry.mintedUrl || (canEdit && entry.postId)) && (
          <div className="flex items-center gap-3 flex-wrap mt-4 pt-3 border-t border-ink/[0.08]">
            {entry.linkUrl && (
              <a href={entry.linkUrl} target="_blank" rel="noopener noreferrer" className={`${btnLime} no-underline inline-block`}>
                Open {linkHost ?? 'link'} ↗
              </a>
            )}
            {entry.mintedUrl && (
              <a href={entry.mintedUrl} target="_blank" rel="noopener noreferrer" className={`${entry.linkUrl ? btnGhost : btnLime} no-underline inline-block`}>
                Collect on In Process ↗
              </a>
            )}
            {canEdit && entry.postId && (
              confirmingDelete
                ? <button onClick={remove} disabled={deleting} className="font-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded-sm cursor-pointer border-none font-bold" style={{ backgroundColor: '#FF5C34', color: '#fff' }}>{deleting ? 'Deleting…' : 'Really delete?'}</button>
                : <button onClick={() => setConfirmingDelete(true)} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none" style={{ color: '#FF5C34' }}>Delete</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Process log strip (native posts + synced moments) ─────────────── */
function ProcessLog({ era, privyId, canEdit, onChanged, filter, onClearFilter }: {
  era: EraView; privyId: string; canEdit: boolean; onChanged: () => void;
  /** Set when a milestone is selected on the timeline — the log shows only its updates. */
  filter?: { id: string; index: number; title: string } | null;
  onClearFilter?: () => void;
}) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [viewing, setViewing] = useState<LogEntry | null>(null);

  useEffect(() => {
    if (!era.inProcessUrl) return;
    let cancelled = false;
    fetch(`/api/in-process/timeline?artist=${encodeURIComponent(era.inProcessUrl)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setMoments(d?.moments ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [era.inProcessUrl]);

  const mintedUrls = new Set(era.posts.map((p) => p.mintedUrl).filter(Boolean));
  const entries: LogEntry[] = [
    ...era.posts.map((p) => ({
      id: `p-${p.id}`, postId: p.id, kind: p.kind as string | null, title: p.title,
      imageUrl: p.imageUrl ?? linkThumbnail(p.linkUrl),
      body: p.body,
      date: p.createdAt as string | null, linkUrl: p.linkUrl, mintedUrl: p.mintedUrl,
      milestoneId: p.milestoneId ?? null,
      glyph: postKindGlyph(p.kind),
    })),
    ...moments
      .filter((m) => !m.collectUrl || !mintedUrls.has(m.collectUrl))
      .map((m) => ({
        id: `m-${m.id}`, postId: null as string | null, kind: null as string | null, title: m.name || 'Moment',
        imageUrl: m.imageUrl, body: null as string | null,
        date: m.createdAt, linkUrl: null as string | null, mintedUrl: m.collectUrl,
        milestoneId: null as string | null,
        glyph: m.mime?.startsWith('audio') ? '♫' : '✦',
      })),
  ]
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 14);

  const removePost = async (postId: string) => {
    await fetch(`/api/worlds/eras/posts?postId=${postId}&privyId=${encodeURIComponent(privyId)}`, { method: 'DELETE' });
    onChanged();
  };

  // A selected milestone narrows the strip to its updates.
  const shown = filter ? entries.filter((e) => e.milestoneId === filter.id) : entries;

  if (entries.length === 0 && !canEdit && !filter) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-ink/40 inline-flex items-center gap-2 flex-wrap">
          Process log{!filter && era.inProcessUrl ? ' · synced with In Process' : ''}
          {filter && (
            <button
              onClick={onClearFilter}
              className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[2px] px-2 py-0.5 rounded-sm cursor-pointer border bg-transparent hover:opacity-75 transition-opacity"
              style={{ color: ORANGE, borderColor: 'color-mix(in srgb, #FF5C34 55%, transparent)' }}
              title="Show all updates"
            >
              M{String(filter.index + 1).padStart(2, '0')} · {filter.title} ✕
            </button>
          )}
        </span>
        {filter ? (
          <button onClick={onClearFilter} className="font-mono text-[10px] uppercase tracking-[1px] underline cursor-pointer bg-transparent border-none text-ink/45">
            Show all ({entries.length})
          </button>
        ) : era.inProcessUrl ? (
          <a href={era.inProcessUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-[1px] no-underline" style={{ color: ORANGE }}>
            Full timeline ↗
          </a>
        ) : null}
      </div>
      {shown.length === 0 ? (
        <p className="font-mono text-[11px] text-ink/35">
          {filter
            ? <>No updates tied to this milestone yet{canEdit ? ' — post one below and it files here.' : '.'}</>
            : <>Nothing logged yet — post the first update below.</>}
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          {shown.map((e) => {
            const msIndex = e.milestoneId ? era.milestones.findIndex((m) => m.id === e.milestoneId) : -1;
            return (
              <button
                key={e.id}
                onClick={() => setViewing(e)}
                className="shrink-0 w-[132px] border border-ink/[0.08] rounded-sm overflow-hidden bg-transparent p-0 text-left cursor-pointer hover:border-ink/30 transition"
              >
                {e.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={e.imageUrl} alt="" className="w-full h-[88px] object-cover block" loading="lazy" />
                ) : e.body ? (
                  <div className="w-full h-[88px] px-2 py-1.5 bg-ink/[0.03] overflow-hidden">
                    <p className="font-mono text-[9px] leading-snug text-ink/55 line-clamp-5">{e.body}</p>
                  </div>
                ) : (
                  <div className="w-full h-[88px] flex items-center justify-center bg-ink/[0.04]">
                    <span className="font-mono text-[16px] text-ink/25">{e.glyph}</span>
                  </div>
                )}
                <div className="px-2 py-1.5">
                  <p className="font-mono text-[10px] font-bold text-ink truncate">{e.glyph} {e.title}</p>
                  <p className="font-mono text-[9px] text-ink/40">
                    {e.date && new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {msIndex >= 0 && <span className="ml-1.5 font-bold" style={{ color: ORANGE }}>M{String(msIndex + 1).padStart(2, '0')}</span>}
                    {!!e.mintedUrl && <span className="ml-1.5" style={{ color: ORANGE }}>⛓</span>}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {viewing && (
        <PostModal
          entry={viewing}
          milestones={era.milestones}
          canEdit={canEdit}
          onDelete={removePost}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

/* ── Inline milestone detail — appears under the timeline when a node
 * card is selected; the process log below filters to match. ─────────── */
function MilestoneDetail({ m, index, updateCount, canEdit, onEdit, onClose }: {
  m: EraMilestoneView; index: number; updateCount: number; canEdit: boolean;
  onEdit: () => void; onClose: () => void;
}) {
  const accent = m.status === 'done' || m.status === 'now';
  return (
    <div className="mt-3 rounded-lg border-l-[3px] border border-ink/[0.1] p-4" style={{ borderLeftColor: 'color-mix(in srgb, #FF5C34 70%, transparent)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[2px]" style={{ color: accent ? ORANGE : 'color-mix(in srgb, var(--page-text) 45%, transparent)' }}>
            M{String(index + 1).padStart(2, '0')} · {STATUS_META[m.status] ?? m.status.toUpperCase()}
          </p>
          <h4 className="font-basement font-black text-[18px] uppercase leading-tight text-ink mt-1">{m.title}</h4>
          {(eraDateRange(m) ?? m.dateLabel) && (
            <p className="font-mono text-[11px] uppercase tracking-[1px] text-ink/45 mt-1">{eraDateRange(m) ?? m.dateLabel}</p>
          )}
        </div>
        <button onClick={onClose} aria-label="Close milestone" className="bg-transparent border-none cursor-pointer text-[18px] leading-none p-0 text-ink/50">×</button>
      </div>
      <div className="flex flex-wrap gap-4 mt-2 items-start">
        {m.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={m.imageUrl} alt="" className="w-full sm:w-[220px] max-h-[160px] object-cover rounded-sm" />
        )}
        {m.description && <p className="font-mono text-[12.5px] text-ink/70 leading-relaxed flex-1 min-w-[200px]">{m.description}</p>}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-ink/[0.06]">
        <span className="font-mono text-[10px] uppercase tracking-[1px] text-ink/45">
          {updateCount > 0 ? <>↓ {updateCount} update{updateCount === 1 ? '' : 's'} in the log below</> : 'No updates logged for this yet'}
        </span>
        {canEdit && (
          <button onClick={onEdit} className="font-mono text-[10px] uppercase tracking-[1px] underline cursor-pointer bg-transparent border-none text-ink/50">✎ Edit</button>
        )}
      </div>
    </div>
  );
}

/* ── One era section: header + node timeline + log ─────────────────── */
function EraSection({ era, worldId, worldSlug, projects, privyId, canEdit, canMint, onChanged, hideProjectChip }: {
  era: EraView; worldId: string; worldSlug: string; projects: ProjectOption[]; privyId: string;
  canEdit: boolean; canMint: boolean; onChanged: () => void; hideProjectChip?: boolean;
}) {
  const [editingEra, setEditingEra] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState<{ existing?: EraMilestoneView } | null>(null);
  const [selectedMsId, setSelectedMsId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const nowIndex = era.milestones.findIndex((m) => m.status === 'now');
  const lastDone = era.milestones.reduce((acc, m, i) => (m.status === 'done' ? i : acc), -1);
  const litThrough = nowIndex >= 0 ? nowIndex : lastDone; // connector lights up to here

  const selectedIndex = selectedMsId ? era.milestones.findIndex((m) => m.id === selectedMsId) : -1;
  const selectedMs = selectedIndex >= 0 ? era.milestones[selectedIndex] : null;
  const selectedUpdateCount = selectedMs ? era.posts.filter((p) => p.milestoneId === selectedMs.id).length : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          {!hideProjectChip && era.projectName && era.projectSlug && (
            <Link
              href={`/worlds/${worldSlug}/projects/${era.projectSlug}`}
              className="inline-block font-mono text-[9px] font-bold uppercase tracking-[2px] px-2 py-0.5 rounded-sm no-underline border hover:opacity-75 transition-opacity"
              style={{ color: ORANGE, borderColor: 'color-mix(in srgb, #FF5C34 55%, transparent)' }}
            >
              Project · {era.projectName}
            </Link>
          )}
          <h3 className="font-basement font-black text-[clamp(20px,3vw,30px)] uppercase leading-none text-ink mt-1">
            {era.title}
          </h3>
          {era.description && <p className="font-mono text-[12px] text-ink/55 mt-1">{era.description}</p>}
        </div>
        <div className="text-right shrink-0">
          {eraDateRange(era) && (
            <p className="font-mono text-[11px] uppercase tracking-[1px] text-ink/45">{eraDateRange(era)}</p>
          )}
          {era.status === 'active' && nowIndex >= 0 && (
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] mt-0.5" style={{ color: ORANGE }}>● In motion</p>
          )}
          {era.status === 'complete' && (
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] mt-0.5 text-ink/40">✓ Past era</p>
          )}
          {era.status === 'archived' && (
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] mt-0.5" style={{ color: ORANGE }}>Archived — only builders see this</p>
          )}
          {canEdit && (
            <button onClick={() => setEditingEra((e) => !e)} className="font-mono text-[10px] uppercase tracking-[1px] underline cursor-pointer bg-transparent border-none text-ink/50 mt-1">
              {editingEra ? 'Close' : '✎ Edit'}
            </button>
          )}
        </div>
      </div>

      {editingEra && (
        <div className="mt-3">
          <EraForm worldId={worldId} projects={projects} existing={era} privyId={privyId}
            onClose={() => setEditingEra(false)} onChanged={onChanged} />
        </div>
      )}

      {/* Node timeline — the mockup's connected dots + cards */}
      <div className="overflow-x-auto mt-5 pb-1" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex min-w-max">
          {era.milestones.map((m, i) => {
            const isNow = m.status === 'now';
            const nodeState = m.status === 'done' ? 'done' : isNow ? 'now' : 'future';
            const lit = i <= litThrough;
            return (
              <div key={m.id} className="w-[236px] shrink-0 pr-3">
                {/* node + connector */}
                <div className="relative h-5 flex items-center">
                  <Node state={nodeState} />
                  {i < era.milestones.length - 1 && (
                    <span className="absolute top-1/2 -translate-y-1/2 h-[2px]" style={{ left: 18, right: -12, backgroundColor: lit && i < litThrough + (nowIndex >= 0 ? 0 : 1) ? ORANGE : 'color-mix(in srgb, var(--page-text) 14%, transparent)' }} />
                  )}
                </div>
                {/* card — tap to select: detail opens below, log filters to it */}
                <button
                  onClick={() => setSelectedMsId((prev) => (prev === m.id ? null : m.id))}
                  aria-pressed={selectedMsId === m.id}
                  className="block w-full text-left mt-2 rounded-sm px-3.5 py-3 cursor-pointer transition-colors hover:bg-ink/[0.04]"
                  style={{
                    border: `${isNow || selectedMsId === m.id ? 2 : 1}px solid ${isNow || selectedMsId === m.id ? ORANGE : 'color-mix(in srgb, var(--page-text) 10%, transparent)'}`,
                    backgroundColor: selectedMsId === m.id ? 'color-mix(in srgb, #FF5C34 9%, transparent)' : 'transparent',
                    opacity: m.status === 'paused' ? 0.55 : 1,
                  }}
                >
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[2px]" style={{ color: m.status === 'done' || isNow ? ORANGE : 'color-mix(in srgb, var(--page-text) 40%, transparent)' }}>
                    M{String(i + 1).padStart(2, '0')} · {STATUS_META[m.status] ?? m.status.toUpperCase()}
                  </p>
                  <p className="font-mono text-[14px] font-bold text-ink leading-tight mt-1.5">{m.title}</p>
                  {(eraDateRange(m) ?? m.dateLabel) && (
                    <p className="font-mono text-[10px] uppercase tracking-[1px] text-ink/40 mt-1">{eraDateRange(m) ?? m.dateLabel}</p>
                  )}
                  {isNow && m.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.imageUrl} alt="" className="w-full h-[96px] object-cover rounded-sm mt-2" loading="lazy" />
                  )}
                  {m.description && <p className="font-mono text-[11px] text-ink/50 mt-2 line-clamp-3">{m.description}</p>}
                </button>
              </div>
            );
          })}

          {/* Add-milestone ghost card */}
          {canEdit && (
            <div className="w-[180px] shrink-0">
              <div className="relative h-5 flex items-center">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-ink/25 shrink-0" />
              </div>
              <button
                onClick={() => setMilestoneModal({})}
                className="w-full mt-2 rounded-sm border-2 border-dashed border-ink/20 px-3.5 py-6 bg-transparent cursor-pointer font-mono text-[11px] uppercase tracking-[1px] text-ink/45 hover:border-ink/40 hover:text-ink/70 transition"
              >
                + Milestone
              </button>
            </div>
          )}
        </div>
      </div>
      {era.milestones.length === 0 && !canEdit && (
        <p className="font-mono text-[11px] text-ink/35 mt-2">No milestones yet.</p>
      )}

      {selectedMs && (
        <MilestoneDetail
          m={selectedMs}
          index={selectedIndex}
          updateCount={selectedUpdateCount}
          canEdit={canEdit}
          onEdit={() => setMilestoneModal({ existing: selectedMs })}
          onClose={() => setSelectedMsId(null)}
        />
      )}

      <ProcessLog
        era={era}
        privyId={privyId}
        canEdit={canEdit}
        onChanged={onChanged}
        filter={selectedMs ? { id: selectedMs.id, index: selectedIndex, title: selectedMs.title } : null}
        onClearFilter={() => setSelectedMsId(null)}
      />

      {canEdit && !composing && (
        <button onClick={() => setComposing(true)} className={`${btnGhost} mt-3`}>
          + Post an update{selectedMs ? ` to M${String(selectedIndex + 1).padStart(2, '0')}` : ''}
        </button>
      )}
      {composing && (
        <PostComposer
          era={era}
          privyId={privyId}
          canMint={canMint}
          initialMilestoneId={selectedMs?.id ?? ''}
          onClose={() => setComposing(false)}
          onChanged={onChanged}
        />
      )}

      {milestoneModal && (
        <MilestoneModal
          eraId={era.id}
          existing={milestoneModal.existing}
          nextIndex={era.milestones.length}
          privyId={privyId}
          onClose={() => setMilestoneModal(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

/* ── The layer ─────────────────────────────────────────────────────── */
export default function InProcessLayer({
  eras, worldId, slug: _slug, projects, canEdit, onChanged, projectScope,
}: {
  config?: WorldConfig;
  eras: EraView[];
  worldId: string;
  slug: string;
  projects: ProjectOption[];
  canEdit: boolean;
  onChanged: () => void;
  /** When set, this renders on a project page: only that project's roadmap,
   * no project chips, and new roadmaps are created pre-linked. */
  projectScope?: string;
}) {
  const { user } = usePrivy();
  const privyId = user?.id ?? '';
  const [creating, setCreating] = useState(false);
  const [canMint, setCanMint] = useState(false);

  useEffect(() => {
    if (!canEdit || !privyId) return;
    fetch(`/api/in-process/connect?privyId=${encodeURIComponent(privyId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCanMint(!!(d?.configured && d?.connected)))
      .catch(() => {});
  }, [canEdit, privyId]);

  const scoped = projectScope ? eras.filter((e) => e.projectId === projectScope) : eras;
  const visible = scoped.filter((e) => e.status !== 'archived' || canEdit);
  const creatableProjects = projectScope ? projects.filter((p) => p.id === projectScope) : projects;

  const startCreate = useCallback(() => setCreating(true), []);

  // With several projects carrying roadmaps, the tab becomes a switcher:
  // one project's full roadmap at a time instead of an endless stack.
  // Single-roadmap worlds see no pills — nothing changes for them.
  const [pickedGroup, setPickedGroup] = useState<string | null>(null);
  const groupOrder: string[] = [];
  const byGroup: Record<string, EraView[]> = {};
  for (const e of visible) {
    const k = e.projectId ?? '__world__';
    if (!byGroup[k]) { byGroup[k] = []; groupOrder.push(k); }
    byGroup[k].push(e);
  }
  const hasSwitcher = !projectScope && groupOrder.length > 1;
  // Default to whichever project is actively in motion.
  const defaultGroup = groupOrder.find((k) =>
    byGroup[k].some((e) => e.status === 'active' && e.milestones.some((m) => m.status === 'now'))
  ) ?? groupOrder[0];
  const currentGroup = pickedGroup && byGroup[pickedGroup] ? pickedGroup : defaultGroup;
  const shownEras = hasSwitcher ? byGroup[currentGroup] : visible;
  const groupLabel = (k: string) => (k === '__world__' ? 'This world' : byGroup[k][0].projectName ?? byGroup[k][0].title);
  const groupInMotion = (k: string) => byGroup[k].some((e) => e.status === 'active' && e.milestones.some((m) => m.status === 'now'));

  if (visible.length === 0 && !creating) {
    return (
      <div className="bg-[var(--page-bg)] p-4">
        <Masthead canEdit={canEdit} canMint={canMint} />
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
          <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">No roadmap yet</span>
          {canEdit && (
            <>
              <p className="font-mono text-[11px] text-ink/40 max-w-sm">
                A roadmap tells the story of {projectScope ? 'this project' : 'a project'} in milestones — what&apos;s done,
                what&apos;s in motion, what&apos;s next. {!projectScope && 'No project yet? You can make one as you go.'}
              </p>
              <button onClick={startCreate} className={btnLime}>+ Start a roadmap</button>
            </>
          )}
        </div>
        <HowThisWorks canEdit={canEdit} />
      </div>
    );
  }

  return (
    <div className="bg-[var(--page-bg)] p-4 flex flex-col gap-10">
      <div className="flex flex-col gap-0">
        <Masthead canEdit={canEdit} canMint={canMint} />
        {hasSwitcher && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3.5">
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-ink/35 mr-1.5">Roadmaps</span>
            {groupOrder.map((k) => {
              const active = k === currentGroup;
              return (
                <button
                  key={k}
                  onClick={() => setPickedGroup(k)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px] px-2.5 py-1.5 rounded-full cursor-pointer transition ${
                    active
                      ? 'bg-lime text-obsidian font-bold border-none'
                      : 'bg-transparent text-ink/55 border border-ink/15 hover:border-ink/40 hover:text-ink/80'
                  }`}
                >
                  {groupLabel(k)}
                  {groupInMotion(k) && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: active ? '#1a1a1a' : ORANGE }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {creating && (
        <EraForm
          worldId={worldId}
          projects={creatableProjects}
          privyId={privyId}
          onClose={() => setCreating(false)}
          onChanged={onChanged}
        />
      )}
      {shownEras.map((era) => (
        <EraSection
          key={era.id}
          era={era}
          worldId={worldId}
          worldSlug={_slug}
          projects={projects}
          privyId={privyId}
          canEdit={canEdit}
          canMint={canMint}
          onChanged={onChanged}
          hideProjectChip={!!projectScope}
        />
      ))}
      {canEdit && !creating && visible.length > 0 && !projectScope && (
        <button onClick={startCreate} className={`${btnGhost} self-start`}>+ Roadmap for another project</button>
      )}
      <HowThisWorks canEdit={canEdit} />
    </div>
  );
}
