'use client';

import { useState } from 'react';
import { ProjectEditor } from '../../../_components/ProjectEditor';
import { ProjectItem } from '../../../_components/types';
import { ReadOnlyBanner } from '../../../_components/ReadOnlyBanner';
import { useWorldDashboard } from '../layout';

export default function WorldProjectsPage() {
  const { world, projects, setProjects, allTools, privyId, isBuilder } = useWorldDashboard();
  const [editingProject, setEditingProject] = useState<ProjectItem | null | 'new'>(null);

  const deleteProject = async (id: string) => {
    if (!world || !isBuilder) return;
    try {
      const res = await fetch('/api/worlds/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: id, worldId: world.id, privyId }) });
      if (res.ok) setProjects(p => p.filter(x => x.id !== id));
    } catch { /* */ }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold uppercase" style={{ color: 'var(--foreground)' }}>Projects</h1>
        {isBuilder && !editingProject && (
          <button onClick={() => setEditingProject('new')} className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-80 transition cursor-pointer" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
            + Add Project
          </button>
        )}
      </div>

      {!isBuilder && <ReadOnlyBanner />}

      {/* Editor — builders only */}
      {isBuilder && editingProject && (
        <div className="mb-6">
          <ProjectEditor
            project={editingProject === 'new' ? null : editingProject}
            worldId={world.id}
            privyId={privyId}
            allTools={allTools}
            onSave={(p) => {
              if (editingProject === 'new') setProjects(prev => [...prev, p]);
              else setProjects(prev => prev.map(x => x.id === p.id ? p : x));
              setEditingProject(null);
            }}
            onCancel={() => setEditingProject(null)}
          />
        </div>
      )}

      {/* Card grid */}
      {projects.length > 0 && !editingProject && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const pTags = ((p.tags as string[]) || []).filter(t => !t.startsWith('tool:'));
            const pTools = ((p.tags as string[]) || []).filter(t => t.startsWith('tool:')).map(t => t.replace('tool:', ''));
            return (
              <div key={p.id} className="border rounded-xl overflow-hidden group relative" style={{ borderColor: 'var(--border-color)' }}>
                {/* Image */}
                {p.imageUrl ? (
                  <div className="w-full h-32 overflow-hidden">
                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-20 flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-15" style={{ color: 'var(--foreground)' }}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  </div>
                )}
                {/* Info */}
                <div className="p-3">
                  <h4 className="font-mono text-[13px] font-bold uppercase truncate mb-0.5" style={{ color: 'var(--foreground)' }}>{p.name}</h4>
                  {p.description && <p className="font-mono text-[10px] opacity-50 truncate mb-2" style={{ color: 'var(--foreground)' }}>{p.description}</p>}
                  {(pTags.length > 0 || pTools.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {pTags.map(t => <span key={t} className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full border" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>{t}</span>)}
                      {pTools.map(t => <span key={t} className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ color: 'var(--background)', backgroundColor: 'var(--foreground)', opacity: 0.6 }}>{t}</span>)}
                    </div>
                  )}
                </div>
                {/* Hover actions — builders only */}
                {isBuilder && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingProject(p)} className="font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg hover:opacity-80 transition" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>Edit</button>
                    <button onClick={() => { if (confirm('Delete this project?')) deleteProject(p.id); }} className="font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg hover:opacity-80 transition" style={{ backgroundColor: '#FF5C34', color: '#fff' }}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {projects.length === 0 && !editingProject && (
        <div className="border-2 border-dashed rounded-xl py-12 text-center" style={{ borderColor: 'var(--border-color)' }}>
          <p className="font-mono text-[12px] opacity-30 mb-3" style={{ color: 'var(--foreground)' }}>No projects yet</p>
          {isBuilder && (
            <button onClick={() => setEditingProject('new')} className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-80 transition cursor-pointer" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
              + Add Your First Project
            </button>
          )}
        </div>
      )}
    </div>
  );
}
