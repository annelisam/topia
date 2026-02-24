'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import LoadingScreen from '../../components/LoadingScreen';

interface PublicProfile {
  name:            string | null;
  username:        string | null;
  bio:             string | null;
  avatarUrl:       string | null;
  socialWebsite:   string | null;
  socialTwitter:   string | null;
  socialInstagram: string | null;
  roleTags:        string | null;
  toolSlugs:       string | null;
  createdAt:       string;
}

interface ResolvedTool {
  name:     string;
  slug:     string;
  category: string | null;
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = params?.username as string;

  const [profile, setProfile]   = useState<PublicProfile | null>(null);
  const [tools, setTools]       = useState<ResolvedTool[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) { setFetchError(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (!data.user) { setNotFound(true); return; }
        setProfile(data.user);
        setTools(data.tools ?? []);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [username]);

  const roleTags = profile?.roleTags
    ? profile.roleTags.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  if (!loading && (notFound || fetchError)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#f5f0e8' }}>
        <Navigation />
        <p className="font-mono text-[13px] uppercase tracking-tight" style={{ color: '#1a1a1a' }}>
          {fetchError ? 'Could not load profile — please try again.' : 'Profile not found.'}
        </p>
        <Link
          href="/"
          className="font-mono text-[13px] uppercase tracking-tight border-b hover:opacity-70 transition"
          style={{ color: '#1a1a1a', borderColor: '#1a1a1a66' }}
        >
          ← Back to TOPIA
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8' }}>
      <LoadingScreen onComplete={() => setIsLoaded(true)} />
      <Navigation />

      <main
        className={`container mx-auto max-w-2xl px-4 sm:px-6 pt-28 pb-20 transition-opacity duration-500 ${isLoaded && !loading ? 'opacity-100' : 'opacity-0'}`}
      >
        {profile && (
          <>
            {/* Avatar + Identity */}
            <section className="mb-10 flex items-start gap-6 border-b pb-10" style={{ borderColor: '#1a1a1a22' }}>
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border"
                style={{ borderColor: '#1a1a1a22' }}
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name ?? username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a1a11' }}>
                    <span className="font-mono text-2xl" style={{ color: '#1a1a1a44' }}>
                      {profile.name ? profile.name[0].toUpperCase() : username[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {profile.name && (
                  <h1 className="font-mono text-xl sm:text-2xl font-bold uppercase tracking-tight mb-0.5" style={{ color: '#1a1a1a' }}>
                    {profile.name}
                  </h1>
                )}
                <p className="font-mono text-[13px] opacity-40 mb-3" style={{ color: '#1a1a1a' }}>
                  @{username}
                </p>
                {profile.bio && (
                  <p className="font-mono text-[13px] leading-relaxed" style={{ color: '#1a1a1a' }}>
                    {profile.bio}
                  </p>
                )}
              </div>
            </section>

            {/* Role Tags */}
            {roleTags.length > 0 && (
              <section className="mb-10">
                <h2 className="font-mono text-[12px] uppercase tracking-tight opacity-40 mb-3" style={{ color: '#1a1a1a' }}>
                  What They Do
                </h2>
                <div className="flex flex-wrap gap-2">
                  {roleTags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[12px] uppercase tracking-tight px-3 py-1.5 border"
                      style={{ borderColor: '#1a1a1a', color: '#1a1a1a' }}
                    >
                      {tag.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Tools */}
            {tools.length > 0 && (
              <section className="mb-10">
                <h2 className="font-mono text-[12px] uppercase tracking-tight opacity-40 mb-3" style={{ color: '#1a1a1a' }}>
                  Tools
                </h2>
                <div className="flex flex-wrap gap-2">
                  {tools.map((tool) => (
                    <span
                      key={tool.slug}
                      className="font-mono text-[12px] uppercase tracking-tight px-3 py-1.5 border"
                      style={{ borderColor: '#1a1a1a33', color: '#1a1a1a' }}
                      title={tool.category ?? undefined}
                    >
                      {tool.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Social Links */}
            {(profile.socialWebsite || profile.socialTwitter || profile.socialInstagram) && (
              <section className="mb-10">
                <h2 className="font-mono text-[12px] uppercase tracking-tight opacity-40 mb-3" style={{ color: '#1a1a1a' }}>
                  Links
                </h2>
                <div className="space-y-2">
                  {profile.socialWebsite && (
                    <a
                      href={profile.socialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-mono text-[13px] border-b hover:opacity-70 transition pb-1 truncate"
                      style={{ color: '#1a1a1a', borderColor: '#1a1a1a22' }}
                    >
                      {profile.socialWebsite.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {profile.socialTwitter && (
                    <a
                      href={profile.socialTwitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-mono text-[13px] border-b hover:opacity-70 transition pb-1 truncate"
                      style={{ color: '#1a1a1a', borderColor: '#1a1a1a22' }}
                    >
                      {profile.socialTwitter.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {profile.socialInstagram && (
                    <a
                      href={profile.socialInstagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-mono text-[13px] border-b hover:opacity-70 transition pb-1 truncate"
                      style={{ color: '#1a1a1a', borderColor: '#1a1a1a22' }}
                    >
                      {profile.socialInstagram.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Back link */}
            <div className="pt-6 border-t" style={{ borderColor: '#1a1a1a22' }}>
              <Link
                href="/"
                className="font-mono text-[13px] uppercase tracking-tight opacity-40 hover:opacity-70 transition border-b"
                style={{ color: '#1a1a1a', borderColor: '#1a1a1a44' }}
              >
                ← TOPIA
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
