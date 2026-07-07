'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { inputCls, labelCls } from '../../../_components/sharedStyles';
import { SearchUser } from '../../../_components/types';
import { ReadOnlyBanner } from '../../../_components/ReadOnlyBanner';
import { useWorldDashboard } from '../layout';

function roleBadge(role: string) {
  if (role === 'owner') return 'Owner';
  if (role === 'world_builder') return 'Builder';
  return 'Collab';
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-ink/[0.08] rounded-lg overflow-hidden mb-5">
      <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40">{title}</span>
      </div>
      <div className="bg-[var(--page-bg)] p-4 sm:p-5">{children}</div>
    </div>
  );
}

export default function WorldMembersPage() {
  const { user } = usePrivy();
  const router = useRouter();
  const {
    world, members, setMembers, pendingInvites, setPendingInvites,
    privyId, isBuilder, isOwner, currentUserId, currentUserRole,
  } = useWorldDashboard();

  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<SearchUser[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [memberRole, setMemberRole] = useState<'world_builder' | 'collaborator'>('collaborator');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  /* Member search debounce */
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

  const addMember = async (target: SearchUser) => {
    if (!world || !user || !isBuilder) return;
    setAddingMember(true); setMemberError(''); setMemberSuccess('');
    try {
      const res = await fetch('/api/worlds/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privyId, worldId: world.id, targetUserId: target.id, role: memberRole }) });
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
      const res = await fetch('/api/worlds/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privyId, worldId: world.id, targetUserId }) });
      const data = await res.json();
      if (!res.ok) { setMemberError(data.error || 'Failed'); return; }
      // If removing self (leaving), redirect to dashboard
      if (targetUserId === currentUserId) {
        router.push('/dashboard');
        return;
      }
      setMembers(p => p.filter(m => m.userId !== targetUserId));
    } catch { setMemberError('Failed'); }
  };

  const changeRole = async (targetUserId: string, newRole: string) => {
    if (!world || !user) return; setMemberError('');
    setChangingRole(targetUserId);
    try {
      const res = await fetch('/api/worlds/members', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privyId, worldId: world.id, targetUserId, newRole }) });
      const data = await res.json();
      if (!res.ok) { setMemberError(data.error || 'Failed'); return; }
      setMembers(p => p.map(m => m.userId === targetUserId ? { ...m, role: newRole } : m));
    } catch { setMemberError('Failed'); } finally { setChangingRole(null); }
  };

  const deleteWorld = async () => {
    if (!world || !isOwner) return;
    setDeleting(true); setMemberError('');
    try {
      const res = await fetch('/api/worlds/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ privyId, worldId: world.id }) });
      const data = await res.json();
      if (!res.ok) { setMemberError(data.error || 'Failed to delete'); setDeleting(false); return; }
      router.push('/dashboard');
    } catch { setMemberError('Failed to delete'); setDeleting(false); }
  };

  /* Permission helpers */
  const canRemove = (targetRole: string, targetUserId: string) => {
    if (targetUserId === currentUserId) return false; // Use "leave" for self
    if (isOwner) return targetRole !== 'owner';
    if (currentUserRole === 'world_builder') return targetRole === 'collaborator';
    return false;
  };

  const canChangeRole = (targetRole: string, targetUserId: string) => {
    if (targetUserId === currentUserId) return false;
    if (targetRole === 'owner') return false;
    if (isOwner) return true;
    if (currentUserRole === 'world_builder') return targetRole === 'collaborator';
    return false;
  };

  // Sort: owner first, then builders, then collabs
  const sortedMembers = [...members].sort((a, b) => {
    const priority = (r: string) => r === 'owner' ? 0 : r === 'world_builder' ? 1 : 2;
    return priority(a.role) - priority(b.role);
  });

  return (
    <div>
      {!isBuilder && <ReadOnlyBanner />}

      {memberError && (
        <p className="font-mono text-[11px] text-orange mb-4 px-3 py-2 rounded-lg border border-orange/40 bg-orange/5">{memberError}</p>
      )}

      {/* Invite — builders+ only, FIRST: it's the page's primary action */}
      {isBuilder && (
        <SectionCard title="Invite member">
          <div className="flex gap-1 mb-3">
            {(['collaborator', 'world_builder'] as const).map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setMemberRole(role)}
                className={`font-mono text-[11px] uppercase tracking-[1px] px-2.5 py-1 rounded-sm transition cursor-pointer border ${
                  memberRole === role
                    ? 'bg-lime text-obsidian border-lime font-bold'
                    : 'bg-transparent text-ink/40 border-ink/15 hover:text-ink hover:border-ink/40'
                }`}
              >
                {role === 'world_builder' ? 'Builder' : 'Collaborator'}
              </button>
            ))}
          </div>
          <p className="font-mono text-[11px] text-ink/40 mb-3">
            {memberRole === 'world_builder'
              ? 'Builders can edit the world, its projects, and invite others.'
              : 'Collaborators are listed on the world but can’t edit it.'}
          </p>
          <div className="relative">
            <input
              type="text"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search by username…"
              className={inputCls}
              disabled={addingMember}
            />
            {memberSearch.length >= 2 && (memberSearchResults.length > 0 || memberSearching) && (
              <div className="absolute left-0 right-0 top-full mt-1 border border-ink/15 rounded-sm z-10 max-h-40 overflow-y-auto shadow-lg bg-[var(--page-bg)]">
                {memberSearching ? (
                  <div className="px-3 py-2"><span className="font-mono text-[11px] text-ink/30">Searching…</span></div>
                ) : (
                  memberSearchResults.filter(u => !members.some(m => m.userId === u.id) && !pendingInvites.some(i => i.inviteeId === u.id)).map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addMember(u)}
                      disabled={addingMember}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-ink/[0.04] transition text-left border-b border-ink/[0.06] last:border-b-0 disabled:opacity-40 cursor-pointer bg-transparent"
                    >
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-mono text-[12px] bg-ink/10 text-ink/60">
                        {(u.name || u.username)?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="font-mono text-[12px] text-ink truncate">
                        {u.username ? <strong>@{u.username}</strong> : u.name}
                        {u.name && u.username && <span className="text-ink/40 ml-1.5">{u.name}</span>}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {memberSuccess && <p className="font-mono text-[11px] mt-2" style={{ color: 'var(--accent-ink)' }}>{memberSuccess}</p>}
        </SectionCard>
      )}

      {/* Active members */}
      <SectionCard title={`Members · ${sortedMembers.length}`}>
        {sortedMembers.length > 0 ? (
          <div className="divide-y divide-ink/[0.05]">
            {sortedMembers.map(m => (
              <div key={m.userId} className="flex items-center gap-3 py-2.5">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-mono text-[12px] bg-ink/10 text-ink/60">
                  {(m.userName || m.userUsername)?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="font-mono text-[12px] text-ink flex-1 truncate">
                  {m.userUsername ? `@${m.userUsername}` : m.userName || 'Unknown'}
                  {m.userId === currentUserId && <span className="text-ink/40 ml-1">(you)</span>}
                </span>

                {/* Role badge / role changer */}
                {canChangeRole(m.role, m.userId) ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.userId, e.target.value)}
                    disabled={changingRole === m.userId}
                    className={`font-mono text-[11px] uppercase tracking-[1px] px-2 py-1 border border-ink/15 rounded-sm bg-transparent text-ink/70 cursor-pointer outline-none ${changingRole === m.userId ? 'opacity-40' : ''}`}
                  >
                    <option value="world_builder">Builder</option>
                    <option value="collaborator">Collab</option>
                  </select>
                ) : (
                  <span className={`font-mono text-[10px] uppercase tracking-[1px] px-2 py-0.5 rounded-sm shrink-0 ${
                    m.role === 'owner' ? 'bg-lime text-obsidian font-bold' : 'border border-ink/15 text-ink/50'
                  }`}>
                    {roleBadge(m.role)}
                  </span>
                )}

                {/* Remove button */}
                {canRemove(m.role, m.userId) && (
                  <button
                    onClick={() => removeMember(m.userId)}
                    className="font-mono text-[14px] text-ink/30 hover:text-orange transition shrink-0 bg-transparent border-none cursor-pointer leading-none"
                    title="Remove member"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="font-mono text-[12px] text-ink/30">No members yet.</p>
        )}
      </SectionCard>

      {/* Pending invites — builders+ only */}
      {isBuilder && pendingInvites.length > 0 && (
        <SectionCard title={`Pending invites · ${pendingInvites.length}`}>
          <div className="divide-y divide-ink/[0.05]">
            {pendingInvites.map(inv => (
              <div key={inv.invitationId} className="flex items-center gap-3 py-2.5 opacity-70">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-mono text-[12px] bg-ink/[0.06] text-ink/40">
                  {(inv.inviteeName || inv.inviteeUsername)?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="font-mono text-[12px] text-ink flex-1 truncate">{inv.inviteeUsername ? `@${inv.inviteeUsername}` : inv.inviteeName || 'Unknown'}</span>
                <span className="font-mono text-[10px] uppercase tracking-[1px] px-2 py-0.5 rounded-sm border border-ink/15 text-ink/40">
                  {inv.role === 'world_builder' ? 'Builder' : 'Collab'} · Pending
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Leave world — builders and collaborators (not owner) */}
      {currentUserRole !== 'owner' && (
        <SectionCard title="Leave world">
          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              className="font-mono text-[11px] uppercase tracking-[2px] text-ink/60 border border-ink/15 hover:border-ink/40 hover:text-ink px-4 py-2 rounded-sm transition cursor-pointer bg-transparent"
            >
              Leave this world
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <p className="font-mono text-[11px] text-ink/60">Are you sure?</p>
              <button
                onClick={() => removeMember(currentUserId)}
                className="font-mono text-[11px] uppercase tracking-[2px] bg-orange text-obsidian font-bold px-4 py-2 rounded-sm hover:opacity-90 transition cursor-pointer border-none"
              >
                Yes, leave
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="font-mono text-[11px] uppercase tracking-[2px] text-ink/60 border border-ink/15 hover:border-ink/40 hover:text-ink px-4 py-2 rounded-sm transition cursor-pointer bg-transparent"
              >
                Cancel
              </button>
            </div>
          )}
        </SectionCard>
      )}

      {/* Delete world — owner only */}
      {isOwner && (
        <div className="border border-orange/40 rounded-lg overflow-hidden">
          <div className="bg-orange/5 border-b border-orange/20 px-4 py-2">
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-orange font-bold">Danger zone</span>
          </div>
          <div className="bg-[var(--page-bg)] p-4 sm:p-5">
            <p className="font-mono text-[11px] text-ink/60 mb-3">
              Permanently delete this world and all its projects, members, and invitations. This cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>
                  Type <strong className="text-ink">DELETE</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className={inputCls}
                  style={{ maxWidth: '200px' }}
                />
              </div>
              <button
                onClick={deleteWorld}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                className="font-mono text-[11px] uppercase tracking-[2px] bg-orange text-obsidian font-bold px-4 py-2 rounded-sm transition disabled:opacity-20 w-fit cursor-pointer border-none"
              >
                {deleting ? 'Deleting…' : 'Delete world'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
