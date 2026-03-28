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
      <h1 className="text-xl sm:text-2xl font-bold uppercase mb-6" style={{ color: 'var(--foreground)' }}>Members</h1>

      {!isBuilder && <ReadOnlyBanner />}

      {memberError && <p className="font-mono text-[11px] mb-4 px-3 py-2 rounded-lg border" style={{ color: '#FF5C34', borderColor: '#FF5C34', backgroundColor: 'color-mix(in srgb, #FF5C34 5%, transparent)' }}>{memberError}</p>}

      {/* Active members card */}
      <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
        <p className={labelCls} style={{ color: 'var(--foreground)' }}>Active Members</p>
        {sortedMembers.length > 0 ? (
          <div className="space-y-1.5">
            {sortedMembers.map(m => (
              <div key={m.userId} className="flex items-center gap-3 py-2 px-3 border rounded-lg" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background)' }}>
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-mono text-[10px]" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 12%, transparent)', color: 'var(--foreground)', opacity: 0.5 }}>
                  {(m.userName || m.userUsername)?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="font-mono text-[12px] flex-1 truncate" style={{ color: 'var(--foreground)' }}>
                  {m.userUsername ? `@${m.userUsername}` : m.userName || 'Unknown'}
                  {m.userId === currentUserId && <span className="opacity-40 ml-1">(you)</span>}
                </span>

                {/* Role badge / role changer */}
                {canChangeRole(m.role, m.userId) ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.userId, e.target.value)}
                    disabled={changingRole === m.userId}
                    className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border rounded-lg bg-transparent cursor-pointer outline-none"
                    style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)', opacity: changingRole === m.userId ? 0.4 : 0.7 }}
                  >
                    <option value="world_builder">Builder</option>
                    <option value="collaborator">Collab</option>
                  </select>
                ) : (
                  <span className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 border rounded-lg shrink-0 opacity-50" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    {roleBadge(m.role)}
                  </span>
                )}

                {/* Remove button */}
                {canRemove(m.role, m.userId) && (
                  <button onClick={() => removeMember(m.userId)} className="font-mono text-[12px] opacity-30 hover:opacity-100 transition shrink-0" style={{ color: 'var(--foreground)' }} title="Remove member">×</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="font-mono text-[12px] opacity-30" style={{ color: 'var(--foreground)' }}>No members yet.</p>
        )}
      </div>

      {/* Pending invites card — builders+ only */}
      {isBuilder && pendingInvites.length > 0 && (
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

      {/* Invite card — builders+ only */}
      {isBuilder && (
        <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
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
          {memberSuccess && <p className="font-mono text-[11px] mt-2" style={{ color: '#00AA55' }}>{memberSuccess}</p>}
        </div>
      )}

      {/* Leave world — builders and collaborators (not owner) */}
      {currentUserRole !== 'owner' && (
        <div className="border rounded-xl p-5 mb-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
          <p className={labelCls} style={{ color: 'var(--foreground)' }}>Leave World</p>
          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              Leave this world
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="font-mono text-[11px] opacity-60" style={{ color: 'var(--foreground)' }}>Are you sure?</p>
              <button
                onClick={() => removeMember(currentUserId)}
                className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-80 transition"
                style={{ backgroundColor: '#FF5C34', color: '#fff' }}
              >
                Yes, leave
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete world — owner only */}
      {isOwner && (
        <div className="border rounded-xl p-5" style={{ borderColor: '#FF5C34', backgroundColor: 'color-mix(in srgb, #FF5C34 3%, var(--surface))' }}>
          <p className="block font-mono text-[9px] uppercase tracking-[0.2em] mb-1.5 font-bold" style={{ color: '#FF5C34' }}>Danger Zone</p>
          <p className="font-mono text-[11px] opacity-60 mb-3" style={{ color: 'var(--foreground)' }}>
            Permanently delete this world and all its projects, members, and invitations. This cannot be undone.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="font-mono text-[10px] opacity-50 mb-1 block" style={{ color: 'var(--foreground)' }}>
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className={inputCls}
                style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)', maxWidth: '200px' }}
              />
            </div>
            <button
              onClick={deleteWorld}
              disabled={deleteConfirm !== 'DELETE' || deleting}
              className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg transition disabled:opacity-20 w-fit"
              style={{ backgroundColor: '#FF5C34', color: '#fff' }}
            >
              {deleting ? 'Deleting...' : 'Delete World'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
