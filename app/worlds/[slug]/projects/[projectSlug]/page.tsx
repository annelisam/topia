'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import PageShell from '../../../../components/PageShell';
import LoadingBar from '../../../../components/LoadingBar';
import ProjectContent from '../../../../components/ProjectContent';
import type { ProjectItem } from '../../../../components/ProjectContent';

interface WorldBasic {
  id: string;
  title: string;
  slug: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ slug: string; projectSlug: string }> }) {
  const { slug, projectSlug } = use(params);
  const [world, setWorld] = useState<WorldBasic | null>(null);
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/worlds?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (!data.worlds?.length) { setError(true); setLoading(false); return; }
        const w = data.worlds[0];
        setWorld({ id: w.id, title: w.title, slug: w.slug });

        return fetch(`/api/worlds/projects?worldId=${w.id}&slug=${projectSlug}`)
          .then(r => r.json())
          .then(d => {
            if (cancelled) return;
            if (d.project) setProject(d.project);
            else setError(true);
          });
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug, projectSlug]);

  if (loading) {
    return (
      <PageShell>
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-bg)' }}>
        <LoadingBar />
      </div>
      </PageShell>
    );
  }

  if (error || !world || !project) {
    return (
      <PageShell>
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'var(--page-bg)' }}>
        <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>Project not found.</p>
        <Link href={`/worlds/${slug}`} className="font-mono text-[12px] underline" style={{ color: 'var(--foreground)' }}>← Back to world</Link>
      </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>

      <div className="pt-20 sm:pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-8">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--foreground)' }}>
            <Link href="/worlds" className="opacity-40 hover:opacity-70 transition">Worlds</Link>
            <span className="opacity-20">/</span>
            <Link href={`/worlds/${world.slug}`} className="opacity-40 hover:opacity-70 transition">{world.title}</Link>
            <span className="opacity-20">/</span>
            <span className="opacity-70">{project.name}</span>
          </div>
        </div>

        {/* Project title */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
            {project.name}
          </h1>
        </div>

        {/* Project content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <ProjectContent project={project} maxImageHeight="400px" />
        </div>
      </div>
    </div>
    </PageShell>
  );
}
