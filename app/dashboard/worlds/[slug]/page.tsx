'use client';

import Link from 'next/link';
import WorldGlobe from '../../../components/WorldGlobe';
import { labelCls } from '../../_components/sharedStyles';
import { ReadOnlyBanner } from '../../_components/ReadOnlyBanner';
import { useWorldDashboard } from './layout';

export default function WorldOverviewPage() {
  const { projects, members, pendingInvites, isBuilder } = useWorldDashboard();

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold uppercase mb-6" style={{ color: 'var(--foreground)' }}>Overview</h1>

      {!isBuilder && <ReadOnlyBanner />}

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

      {/* Quick actions — builders only */}
      {isBuilder && (
        <div className="mb-8">
          <p className={labelCls} style={{ color: 'var(--foreground)' }}>Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <Link href="./projects" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition cursor-pointer" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
              + Add Project
            </Link>
            <Link href="./members" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition cursor-pointer" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
              + Invite Member
            </Link>
            <Link href="./details" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition cursor-pointer" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
              Edit Details
            </Link>
          </div>
        </div>
      )}

      {/* Globe preview */}
      {projects.length > 0 && (
        <div className="border rounded-xl overflow-hidden relative" style={{ borderColor: 'var(--border-color)', height: '320px' }}>
          <div className="absolute inset-0">
            <WorldGlobe projects={projects} />
          </div>
        </div>
      )}
    </div>
  );
}
