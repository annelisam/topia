'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageShell from '../components/PageShell';
import LoadingBar from '../components/LoadingBar';
import { SocialIcon } from '../components/SocialIcons';

const ACCENT_COLORS = ['#BFFF00','#3B82F6','#EC4899','#F97316','#22C55E','#E8E0D0'];

const ROLE_TAGS = [
  { slug: 'music',             label: 'Music' },
  { slug: 'dj',                label: 'DJ' },
  { slug: 'visual-artist',     label: 'Visual Artist' },
  { slug: 'filmmaker',         label: 'Filmmaker' },
  { slug: 'photographer',      label: 'Photographer' },
  { slug: 'writer',            label: 'Writer' },
  { slug: 'poet',              label: 'Poet' },
  { slug: 'dancer',            label: 'Dancer' },
  { slug: 'performer',         label: 'Performer' },
  { slug: 'producer',          label: 'Producer' },
  { slug: 'designer',          label: 'Designer' },
  { slug: 'illustrator',       label: 'Illustrator' },
  { slug: 'game-designer',     label: 'Game Designer' },
  { slug: 'architect',         label: 'Architect' },
  { slug: 'technologist',      label: 'Technologist' },
  { slug: 'curator',           label: 'Curator' },
  { slug: 'educator',          label: 'Educator' },
  { slug: 'community-builder', label: 'Community Builder' },
  { slug: 'entrepreneur',      label: 'Entrepreneur' },
  { slug: 'researcher',        label: 'Researcher' },
];

interface Tool {
  id: string;
  name: string;
  slug: string;
  category: string | null;
}

// Resize image to max 256×256 and return a base64 data URL
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 256;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ── Crosshatch SVG data URI ─────────────────────────── */
const CROSSHATCH = `url("data:image/svg+xml,%3Csvg width='8' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l8 8M8 0l-8 8' stroke='%23fff' stroke-opacity='0.04' stroke-width='0.5'/%3E%3C/svg%3E")`;

export default function ProfilePage() {
  const {
    ready, authenticated, user, logout,
    linkEmail, unlinkEmail,
    linkPhone, unlinkPhone,
    linkGoogle, unlinkGoogle,
    linkWallet, unlinkWallet,
  } = usePrivy();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [name, setName]                   = useState('');
  const [username, setUsername]           = useState('');
  const [bio, setBio]                     = useState('');
  const [avatarUrl, setAvatarUrl]         = useState('');
  const [socialWebsite, setSocialWebsite] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialSoundcloud, setSocialSoundcloud] = useState('');
  const [socialSpotify, setSocialSpotify] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialSubstack, setSocialSubstack] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  // Tools from DB
  const [allTools, setAllTools]     = useState<Tool[]>([]);
  const [toolSearch, setToolSearch] = useState('');
  const [toolsLoading, setToolsLoading] = useState(true);

  // UI state
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'identity'|'roles'|'tools'|'social'|'accounts'>('identity');

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) router.push('/');
  }, [ready, authenticated, router]);

  // Fetch all tools from DB on mount
  useEffect(() => {
    fetch('/api/tools')
      .then((r) => r.json())
      .then(({ tools }) => setAllTools(tools ?? []))
      .catch(console.error)
      .finally(() => setToolsLoading(false));
  }, []);

  // Load existing profile from DB on mount
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then(({ user: saved }) => {
        if (saved) {
          if (saved.name)            setName(saved.name);
          if (saved.username)        setUsername(saved.username);
          if (saved.bio)             setBio(saved.bio);
          if (saved.avatarUrl)       setAvatarUrl(saved.avatarUrl);
          if (saved.socialWebsite)    setSocialWebsite(saved.socialWebsite);
          if (saved.socialTwitter)    setSocialTwitter(saved.socialTwitter);
          if (saved.socialInstagram)  setSocialInstagram(saved.socialInstagram);
          if (saved.socialSoundcloud) setSocialSoundcloud(saved.socialSoundcloud);
          if (saved.socialSpotify)    setSocialSpotify(saved.socialSpotify);
          if (saved.socialLinkedin)   setSocialLinkedin(saved.socialLinkedin);
          if (saved.socialSubstack)   setSocialSubstack(saved.socialSubstack);
          if (saved.roleTags)        setSelectedRoles(saved.roleTags.split(',').map((s: string) => s.trim()).filter(Boolean));
          if (saved.toolSlugs)       setSelectedTools(saved.toolSlugs.split(',').map((s: string) => s.trim()).filter(Boolean));
        } else {
          const googleName   = user.google?.name;
          const googleAvatar = (user.google as any)?.picture ?? (user.google as any)?.photoUrl;
          if (googleName)   setName(googleName);
          if (googleAvatar) setAvatarUrl(googleAvatar);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready, authenticated, user]);

  // Linked accounts
  const linkedAccounts = user?.linkedAccounts ?? [];
  const canUnlink = linkedAccounts.length > 1;

  const emailAccount  = linkedAccounts.find((a) => a.type === 'email')        as { type: 'email';        address: string }                              | undefined;
  const phoneAccount  = linkedAccounts.find((a) => a.type === 'phone')        as { type: 'phone';        number: string }                               | undefined;
  const googleAccount = linkedAccounts.find((a) => a.type === 'google_oauth') as { type: 'google_oauth'; subject: string; email?: string }              | undefined;
  const walletAccount = linkedAccounts.find((a) => a.type === 'wallet')       as { type: 'wallet';       address: string }                              | undefined;

  const toggleRole = (slug: string) => {
    setSelectedRoles((prev) =>
      prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug]
    );
  };

  const toggleTool = (slug: string) => {
    setSelectedTools((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    );
  };

  const filteredTools = allTools.filter((t) => {
    if (!toolSearch) return true;
    const q = toolSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.category?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId:         user.id,
          email:           emailAccount?.address ?? googleAccount?.email ?? null,
          phone:           phoneAccount?.number ?? null,
          walletAddress:   walletAccount?.address ?? null,
          name,
          username,
          bio,
          avatarUrl,
          socialWebsite,
          socialTwitter,
          socialInstagram,
          socialSoundcloud,
          socialSpotify,
          socialLinkedin,
          socialSubstack,
          roleTags:  selectedRoles.join(',') || null,
          toolSlugs: selectedTools.join(',') || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError((body as { error?: string }).error ?? 'Save failed — please try again.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError('Network error — please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file);
      setAvatarUrl(resized);
    } catch {
      console.error('Failed to process image');
    }
  };

  const handleUnlink = async (type: string, fn: () => Promise<unknown>) => {
    if (!canUnlink) return;
    setUnlinking(type);
    try { await fn(); } finally { setUnlinking(null); }
  };

  // Random accent color for header
  const accent = ACCENT_COLORS[Math.floor((username || 'x').charCodeAt(0) % ACCENT_COLORS.length)];

  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <LoadingBar />
      </div>
    );
  }

  const TABS: { key: typeof activeSection; label: string }[] = [
    { key: 'identity', label: 'IDENTITY' },
    { key: 'roles',    label: 'ROLES' },
    { key: 'tools',    label: 'TOOLS' },
    { key: 'social',   label: 'SOCIAL' },
    { key: 'accounts', label: 'ACCOUNTS' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <PageShell>
        <main className="max-w-[900px] mx-auto px-3 sm:px-4 pt-4 pb-16">

          {/* ── PASSPORT CARD ─────────────────────────────────── */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)' }}>

            {/* ▸ Accent header strip */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2" style={{ backgroundColor: accent }}>
              <span style={{ fontFamily: 'Basement Grotesque, sans-serif', fontSize: 11, letterSpacing: '0.12em', color: '#0a0a0a', textTransform: 'uppercase' as const }}>
                TOPIA — EDIT PROFILE
              </span>
              <div className="flex items-center gap-3">
                {username && (
                  <Link
                    href={`/profile/${username}`}
                    style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 10, letterSpacing: '0.1em', color: '#0a0a0a', textTransform: 'uppercase' as const, opacity: 0.7 }}
                    className="hover:opacity-100 transition"
                  >
                    VIEW PROFILE →
                  </Link>
                )}
                <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 10, letterSpacing: '0.1em', color: '#0a0a0a', opacity: 0.5 }}>
                  {new Date().toISOString().slice(0, 10)}
                </span>
              </div>
            </div>

            {/* ▸ ID section: avatar + identity fields */}
            <div className="flex flex-col sm:flex-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

              {/* Avatar panel */}
              <div
                className="flex-shrink-0 flex items-center justify-center p-6 sm:p-8"
                style={{
                  width: 'auto',
                  minWidth: 180,
                  backgroundColor: '#111',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                  backgroundImage: CROSSHATCH,
                }}
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group"
                  title="Upload photo"
                  style={{ width: 120, height: 120 }}
                >
                  {/* Corner marks */}
                  <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: accent }} />
                  <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: accent }} />
                  <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: accent }} />
                  <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: accent }} />

                  <div className="w-full h-full rounded-full overflow-hidden border border-dashed" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
                        <span style={{ fontFamily: 'Basement Grotesque, sans-serif', fontSize: 32, color: 'rgba(255,255,255,0.15)' }}>
                          {name ? name[0].toUpperCase() : '?'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                  >
                    <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, letterSpacing: '0.12em', color: '#fff', textTransform: 'uppercase' as const }}>
                      {avatarUrl ? 'CHANGE' : 'UPLOAD'}
                    </span>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Identity fields */}
              <div className="flex-1 p-4 sm:p-6 space-y-4" style={{ backgroundColor: '#0f0f0f' }}>
                <div>
                  <label style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, display: 'block', marginBottom: 4 }}>
                    DISPLAY NAME
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your display name"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      fontFamily: 'Basement Grotesque, sans-serif',
                      fontSize: 18,
                      color: '#fff',
                      padding: '6px 0',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, display: 'block', marginBottom: 4 }}>
                    USERNAME
                  </label>
                  <div className="flex items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="handle"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        fontFamily: 'GT Zirkon, sans-serif',
                        fontSize: 13,
                        color: '#fff',
                        padding: '6px 0',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, display: 'block', marginBottom: 4 }}>
                    BIO / DECLARATION
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell your story..."
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      fontFamily: 'GT Zirkon, sans-serif',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.7)',
                      padding: '6px 0',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>
                {avatarUrl && (
                  <button
                    onClick={() => setAvatarUrl('')}
                    style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, background: 'none', border: 'none', cursor: 'pointer' }}
                    className="hover:opacity-70 transition"
                  >
                    REMOVE PHOTO
                  </button>
                )}
              </div>
            </div>

            {/* ▸ Section tabs */}
            <div
              className="flex overflow-x-auto"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#0a0a0a' }}
            >
              {TABS.map((tab, i) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  className="flex-shrink-0 transition-colors"
                  style={{
                    fontFamily: 'GT Zirkon, sans-serif',
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase' as const,
                    color: activeSection === tab.key ? '#fff' : 'rgba(255,255,255,0.3)',
                    padding: '10px 16px',
                    borderBottom: activeSection === tab.key ? `2px solid ${accent}` : '2px solid transparent',
                    borderRight: i < TABS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    background: activeSection === tab.key ? 'rgba(255,255,255,0.03)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ▸ Section content */}
            <div style={{ backgroundColor: '#0f0f0f', minHeight: 300 }}>

              {/* ── IDENTITY (same as above fields, but shown as read-only summary when not active) ── */}
              {activeSection === 'identity' && (
                <div className="p-4 sm:p-6 space-y-4" style={{ backgroundImage: CROSSHATCH }}>
                  <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    EDIT YOUR CORE IDENTITY FIELDS ABOVE. THIS SECTION SHOWS A PREVIEW.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>NAME</span>
                      <p style={{ fontFamily: 'Basement Grotesque, sans-serif', fontSize: 16, color: '#fff', marginTop: 2 }}>{name || '—'}</p>
                    </div>
                    <div>
                      <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>HANDLE</span>
                      <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 13, color: accent, marginTop: 2 }}>@{username || '...'}</p>
                    </div>
                  </div>
                  {bio && (
                    <div>
                      <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>DECLARATION</span>
                      <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>
                        &ldquo;{bio}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── ROLES ── */}
              {activeSection === 'roles' && (
                <div className="p-4 sm:p-6">
                  <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
                    SELECT ALL THAT APPLY — WHAT YOU DO
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_TAGS.map(({ slug, label }, i) => {
                      const isSelected = selectedRoles.includes(slug);
                      const tagColor = ACCENT_COLORS[i % ACCENT_COLORS.length];
                      return (
                        <button
                          key={slug}
                          onClick={() => toggleRole(slug)}
                          className="transition-all"
                          style={{
                            fontFamily: 'GT Zirkon, sans-serif',
                            fontSize: 11,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase' as const,
                            padding: '6px 14px',
                            border: `1px solid ${isSelected ? tagColor : 'rgba(255,255,255,0.12)'}`,
                            backgroundColor: isSelected ? tagColor : 'transparent',
                            color: isSelected ? '#0a0a0a' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TOOLS ── */}
              {activeSection === 'tools' && (
                <div className="p-4 sm:p-6">
                  <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
                    SELECT FROM THE TOPIA TOOLS LIBRARY
                  </p>

                  {/* Selected tools */}
                  {selectedTools.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedTools.map((slug, i) => {
                        const tool = allTools.find((t) => t.slug === slug);
                        if (!tool) return null;
                        const tagColor = ACCENT_COLORS[i % ACCENT_COLORS.length];
                        return (
                          <button
                            key={slug}
                            onClick={() => toggleTool(slug)}
                            title="Click to remove"
                            style={{
                              fontFamily: 'GT Zirkon, sans-serif',
                              fontSize: 11,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase' as const,
                              padding: '5px 12px',
                              border: `1px solid ${tagColor}`,
                              backgroundColor: tagColor,
                              color: '#0a0a0a',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {tool.name}
                            <span style={{ opacity: 0.6 }}>×</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Search input */}
                  <input
                    type="text"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Search tools..."
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      fontFamily: 'GT Zirkon, sans-serif',
                      fontSize: 12,
                      color: '#fff',
                      padding: '8px 0',
                      marginBottom: 12,
                      outline: 'none',
                    }}
                  />

                  {/* Ledger-style tool list */}
                  {toolsLoading ? (
                    <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Loading tools...</p>
                  ) : filteredTools.length === 0 ? (
                    <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No tools match your search</p>
                  ) : (
                    <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {filteredTools.map((tool) => {
                        const isSelected = selectedTools.includes(tool.slug);
                        return (
                          <button
                            key={tool.slug}
                            onClick={() => toggleTool(tool.slug)}
                            className="w-full flex items-center justify-between transition-colors hover:bg-white/[0.03]"
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                style={{
                                  width: 12,
                                  height: 12,
                                  flexShrink: 0,
                                  border: `1px solid ${isSelected ? accent : 'rgba(255,255,255,0.2)'}`,
                                  backgroundColor: isSelected ? accent : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {isSelected && <span style={{ fontSize: 8, color: '#0a0a0a' }}>✓</span>}
                              </span>
                              <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 12, color: '#fff' }}>{tool.name}</span>
                            </div>
                            {tool.category && (
                              <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                                {tool.category}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── SOCIAL ── */}
              {activeSection === 'social' && (
                <div className="p-4 sm:p-6 space-y-5">
                  <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    SOCIAL LINKS — CONNECT YOUR WORLD
                  </p>
                  {[
                    { label: 'Website',     value: socialWebsite,    set: setSocialWebsite,    placeholder: 'https://yoursite.com',              icon: <SocialIcon type="website" /> },
                    { label: 'Twitter / X', value: socialTwitter,    set: setSocialTwitter,    placeholder: 'https://x.com/handle',              icon: <SocialIcon type="twitter" /> },
                    { label: 'Instagram',   value: socialInstagram,  set: setSocialInstagram,  placeholder: 'https://instagram.com/handle',      icon: <SocialIcon type="instagram" /> },
                    { label: 'SoundCloud',  value: socialSoundcloud, set: setSocialSoundcloud, placeholder: 'https://soundcloud.com/handle',     icon: <SocialIcon type="soundcloud" /> },
                    { label: 'Spotify',     value: socialSpotify,    set: setSocialSpotify,    placeholder: 'https://open.spotify.com/artist/…', icon: <SocialIcon type="spotify" /> },
                    { label: 'LinkedIn',    value: socialLinkedin,   set: setSocialLinkedin,   placeholder: 'https://linkedin.com/in/handle',    icon: <SocialIcon type="linkedin" /> },
                    { label: 'Substack',    value: socialSubstack,   set: setSocialSubstack,   placeholder: 'https://handle.substack.com',       icon: <SocialIcon type="substack" /> },
                  ].map(({ label, value, set, placeholder, icon }, i) => (
                    <div key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
                      <label className="flex items-center gap-2" style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, marginBottom: 6 }}>
                        <span style={{ color: ACCENT_COLORS[i % ACCENT_COLORS.length], opacity: 0.7 }}>{icon}</span>
                        {label}
                      </label>
                      <input
                        type="url"
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        placeholder={placeholder}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          fontFamily: 'GT Zirkon, sans-serif',
                          fontSize: 12,
                          color: '#fff',
                          padding: '4px 0',
                          outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* ── ACCOUNTS ── */}
              {activeSection === 'accounts' && (
                <div className="p-4 sm:p-6">
                  <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    CONNECTED ACCOUNTS — AUTHENTICATION METHODS
                  </p>
                  {!canUnlink && (
                    <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>
                      Add another account before removing this one
                    </p>
                  )}
                  <div>
                    <AccountRow label="EMAIL"  value={emailAccount?.address ?? null}   isLinked={!!emailAccount}  unlinking={unlinking === 'email'}  canUnlink={canUnlink} onConnect={linkEmail}  onUnlink={() => handleUnlink('email',  () => unlinkEmail(emailAccount!.address))} accent={accent} />
                    <AccountRow label="PHONE"  value={phoneAccount?.number ?? null}    isLinked={!!phoneAccount}  unlinking={unlinking === 'phone'}  canUnlink={canUnlink} onConnect={linkPhone}  onUnlink={() => handleUnlink('phone',  () => unlinkPhone(phoneAccount!.number))} accent={accent} />
                    <AccountRow label="GOOGLE" value={googleAccount?.email ?? (googleAccount ? 'Connected' : null)} isLinked={!!googleAccount} unlinking={unlinking === 'google'} canUnlink={canUnlink} onConnect={linkGoogle} onUnlink={() => handleUnlink('google', () => unlinkGoogle(googleAccount!.subject))} accent={accent} />
                    <AccountRow label="WALLET" value={walletAccount ? `${walletAccount.address.slice(0,6)}...${walletAccount.address.slice(-4)}` : null} isLinked={!!walletAccount} unlinking={unlinking === 'wallet'} canUnlink={canUnlink} onConnect={linkWallet} onUnlink={() => handleUnlink('wallet', () => unlinkWallet(walletAccount!.address))} accent={accent} />
                  </div>
                </div>
              )}
            </div>

            {/* ▸ Action bar */}
            {saveError && (
              <div className="px-4 py-2" style={{ backgroundColor: 'rgba(192,57,43,0.15)', borderTop: '1px solid rgba(192,57,43,0.3)' }}>
                <p style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 11, color: '#e74c3c', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                  ✗ {saveError}
                </p>
              </div>
            )}
            <div
              className="flex items-center justify-between px-3 sm:px-4 py-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#0a0a0a' }}
            >
              <button
                onClick={handleSave}
                disabled={saving}
                className="transition-all hover:brightness-110 disabled:opacity-40"
                style={{
                  fontFamily: 'GT Zirkon, sans-serif',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                  padding: '8px 20px',
                  backgroundColor: accent,
                  color: '#0a0a0a',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'SAVING...' : saved ? 'SAVED ✓' : 'SAVE PROFILE'}
              </button>
              <button
                onClick={logout}
                className="hover:opacity-70 transition"
                style={{
                  fontFamily: 'GT Zirkon, sans-serif',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: 'rgba(255,255,255,0.3)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                LOG OUT
              </button>
            </div>

            {/* ▸ MRZ barcode strip */}
            <div
              className="px-3 py-2 overflow-hidden"
              style={{
                backgroundColor: '#111',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontFamily: 'monospace',
                fontSize: 9,
                letterSpacing: '0.25em',
                color: 'rgba(255,255,255,0.12)',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
              }}
            >
              {(() => {
                const src = (username || 'TOPIA').toUpperCase();
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';
                let line = 'P<TOPIA<';
                for (let i = 0; i < 50; i++) line += chars[(src.charCodeAt(i % src.length) * 7 + i * 13) % chars.length];
                return <>{line}<br />{line.split('').reverse().join('')}</>;
              })()}
            </div>
          </div>
        </main>
      </PageShell>
    </div>
  );
}

function AccountRow({ label, value, isLinked, unlinking, canUnlink, onConnect, onUnlink, accent }: {
  label: string; value: string | null; isLinked: boolean; unlinking: boolean;
  canUnlink: boolean; onConnect: () => void; onUnlink: () => void; accent: string;
}) {
  return (
    <div className="flex justify-between items-center py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const }}>
        {label}
      </span>
      <div className="flex items-center gap-4">
        {isLinked ? (
          <>
            <span style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 11, color: '#fff' }}>{value}</span>
            <button
              onClick={onUnlink}
              disabled={!canUnlink || unlinking}
              className="transition hover:opacity-70 disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {unlinking ? 'REMOVING...' : 'REMOVE'}
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="transition hover:brightness-110"
            style={{
              fontFamily: 'GT Zirkon, sans-serif',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: accent,
              background: 'none',
              border: `1px solid ${accent}`,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            + CONNECT
          </button>
        )}
      </div>
    </div>
  );
}
