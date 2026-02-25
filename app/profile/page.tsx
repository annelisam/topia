'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import { SocialIcon } from '../components/SocialIcons';

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
          // New user — pre-fill from Privy's Google data if available
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

  // Toggle a role tag
  const toggleRole = (slug: string) => {
    setSelectedRoles((prev) =>
      prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug]
    );
  };

  // Toggle a tool
  const toggleTool = (slug: string) => {
    setSelectedTools((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    );
  };

  // Filtered tools list for the search picker
  const filteredTools = allTools.filter((t) => {
    if (!toolSearch) return true;
    const q = toolSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.category?.toLowerCase().includes(q) ?? false)
    );
  });

  // Save all profile fields to DB
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

  // Avatar file upload → resize → base64
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

  // Unlink helpers
  const handleUnlink = async (type: string, fn: () => Promise<unknown>) => {
    if (!canUnlink) return;
    setUnlinking(type);
    try { await fn(); } finally { setUnlinking(null); }
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <p className="font-mono text-[13px] uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />

      <main className="container mx-auto max-w-2xl px-4 sm:px-6 pt-28 pb-16">

        {/* Header */}
        <div className="mb-10 border-b pb-6" style={{ borderColor: 'var(--foreground)' }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-mono text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-1" style={{ color: 'var(--foreground)' }}>
                YOUR PROFILE
              </h1>
              <p className="font-mono text-[13px] uppercase tracking-tight opacity-50" style={{ color: 'var(--foreground)' }}>
                Manage your identity on TOPIA
              </p>
            </div>
            {username && (
              <Link
                href={`/profile/${username}`}
                className="font-mono text-[13px] uppercase tracking-tight border px-3 py-1.5 hover:opacity-70 transition flex-shrink-0 mt-1"
                style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
              >
                VIEW PROFILE →
              </Link>
            )}
          </div>
        </div>

        {/* Avatar */}
        <section className="mb-10 flex items-center gap-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden border flex-shrink-0 hover:opacity-80 transition group"
            style={{ borderColor: 'var(--border-color)' }}
            title="Upload photo"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 7%, transparent)' }}>
                <span className="font-mono text-2xl" style={{ color: 'var(--foreground)', opacity: 0.27 }}>
                  {name ? name[0].toUpperCase() : '?'}
                </span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 53%, transparent)' }}>
              <span className="font-mono text-[9px] uppercase text-white tracking-tight">CHANGE</span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div>
            <p className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-1" style={{ color: 'var(--foreground)' }}>
              Profile Photo
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="font-mono text-[13px] uppercase tracking-tight border-b hover:opacity-70 transition"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              {avatarUrl ? 'CHANGE PHOTO' : '+ UPLOAD PHOTO'}
            </button>
            {avatarUrl && (
              <button
                onClick={() => setAvatarUrl('')}
                className="ml-4 font-mono text-[13px] uppercase tracking-tight opacity-30 hover:opacity-60 transition"
                style={{ color: 'var(--foreground)' }}
              >
                REMOVE
              </button>
            )}
          </div>
        </section>

        {/* Profile Info */}
        <section className="mb-10 space-y-6">
          <h2 className="font-mono text-[13px] uppercase tracking-tight opacity-50" style={{ color: 'var(--foreground)' }}>
            Profile Info
          </h2>

          <div>
            <label className="block font-mono text-[13px] uppercase tracking-tight mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              className="w-full border-b bg-transparent font-mono text-[13px] py-2 outline-none"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            />
          </div>

          <div>
            <label className="block font-mono text-[13px] uppercase tracking-tight mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>Username</label>
            <div className="flex items-center border-b" style={{ borderColor: 'var(--border-color)' }}>
              <span className="font-mono text-[13px] opacity-30 pr-0.5" style={{ color: 'var(--foreground)' }}>@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="handle"
                className="flex-1 bg-transparent font-mono text-[13px] py-2 outline-none"
                style={{ color: 'var(--foreground)' }}
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[13px] uppercase tracking-tight mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your story..."
              rows={3}
              className="w-full border-b bg-transparent font-mono text-[13px] py-2 outline-none resize-none"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            />
          </div>
        </section>

        {/* Role Tags */}
        <section className="mb-10">
          <h2 className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-1" style={{ color: 'var(--foreground)' }}>
            What You Do
          </h2>
          <p className="font-mono text-[12px] opacity-30 mb-4" style={{ color: 'var(--foreground)' }}>
            Select all that apply
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLE_TAGS.map(({ slug, label }) => {
              const isSelected = selectedRoles.includes(slug);
              return (
                <button
                  key={slug}
                  onClick={() => toggleRole(slug)}
                  className="font-mono text-[12px] uppercase tracking-tight px-3 py-1.5 border transition-colors"
                  style={{
                    borderColor:     'var(--foreground)',
                    backgroundColor: isSelected ? 'var(--foreground)' : 'transparent',
                    color:           isSelected ? 'var(--background)' : 'var(--foreground)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Tools */}
        <section className="mb-10">
          <h2 className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-1" style={{ color: 'var(--foreground)' }}>
            Tools You Use
          </h2>
          <p className="font-mono text-[12px] opacity-30 mb-4" style={{ color: 'var(--foreground)' }}>
            Select from the TOPIA tools library
          </p>

          {/* Selected tools as removable tags */}
          {selectedTools.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedTools.map((slug) => {
                const tool = allTools.find((t) => t.slug === slug);
                if (!tool) return null;
                return (
                  <button
                    key={slug}
                    onClick={() => toggleTool(slug)}
                    className="font-mono text-[12px] uppercase tracking-tight px-3 py-1.5 border flex items-center gap-2 transition-colors"
                    style={{ borderColor: 'var(--foreground)', backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
                    title="Click to remove"
                  >
                    {tool.name}
                    <span className="opacity-60">×</span>
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
            className="w-full border-b bg-transparent font-mono text-[13px] py-2 mb-3 outline-none"
            style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
          />

          {/* Scrollable tool list */}
          {toolsLoading ? (
            <p className="font-mono text-[12px] opacity-30" style={{ color: 'var(--foreground)' }}>Loading tools...</p>
          ) : filteredTools.length === 0 ? (
            <p className="font-mono text-[12px] opacity-30" style={{ color: 'var(--foreground)' }}>No tools match your search</p>
          ) : (
            <div
              className="border overflow-y-auto"
              style={{ borderColor: 'var(--border-color)', maxHeight: '220px' }}
            >
              {filteredTools.map((tool) => {
                const isSelected = selectedTools.includes(tool.slug);
                return (
                  <button
                    key={tool.slug}
                    onClick={() => toggleTool(tool.slug)}
                    className="w-full flex items-center justify-between px-4 py-2.5 border-b text-left transition-colors hover:opacity-70"
                    style={{
                      borderColor:     'var(--border-color)',
                      backgroundColor: isSelected ? 'color-mix(in srgb, var(--foreground) 3%, transparent)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 border flex-shrink-0 flex items-center justify-center"
                        style={{
                          borderColor:     'var(--foreground)',
                          backgroundColor: isSelected ? 'var(--foreground)' : 'transparent',
                        }}
                      >
                        {isSelected && <span className="text-[8px]" style={{ color: 'var(--background)' }}>✓</span>}
                      </span>
                      <span className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>{tool.name}</span>
                    </div>
                    {tool.category && (
                      <span className="font-mono text-[11px] opacity-30" style={{ color: 'var(--foreground)' }}>
                        {tool.category}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Social Links */}
        <section className="mb-10 space-y-5">
          <h2 className="font-mono text-[13px] uppercase tracking-tight opacity-50" style={{ color: 'var(--foreground)' }}>
            Social Links
          </h2>

          {[
            { label: 'Website',     value: socialWebsite,    set: setSocialWebsite,    placeholder: 'https://yoursite.com',              icon: <SocialIcon type="website" /> },
            { label: 'Twitter / X', value: socialTwitter,    set: setSocialTwitter,    placeholder: 'https://x.com/handle',              icon: <SocialIcon type="twitter" /> },
            { label: 'Instagram',   value: socialInstagram,  set: setSocialInstagram,  placeholder: 'https://instagram.com/handle',      icon: <SocialIcon type="instagram" /> },
            { label: 'SoundCloud',  value: socialSoundcloud, set: setSocialSoundcloud, placeholder: 'https://soundcloud.com/handle',     icon: <SocialIcon type="soundcloud" /> },
            { label: 'Spotify',     value: socialSpotify,    set: setSocialSpotify,    placeholder: 'https://open.spotify.com/artist/…', icon: <SocialIcon type="spotify" /> },
            { label: 'LinkedIn',    value: socialLinkedin,   set: setSocialLinkedin,   placeholder: 'https://linkedin.com/in/handle',    icon: <SocialIcon type="linkedin" /> },
            { label: 'Substack',    value: socialSubstack,   set: setSocialSubstack,   placeholder: 'https://handle.substack.com',       icon: <SocialIcon type="substack" /> },
          ].map(({ label, value, set, placeholder, icon }) => (
            <div key={label}>
              <label className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-tight mb-2 opacity-50" style={{ color: 'var(--foreground)' }}>
                {icon}
                {label}
              </label>
              <input
                type="url"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full border-b bg-transparent font-mono text-[13px] py-2 outline-none"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              />
            </div>
          ))}
        </section>

        {/* Connected Accounts */}
        <section className="mb-10">
          <h2 className="font-mono text-[13px] uppercase tracking-tight mb-1 opacity-50" style={{ color: 'var(--foreground)' }}>
            Connected Accounts
          </h2>
          {!canUnlink && (
            <p className="font-mono text-[12px] uppercase tracking-tight opacity-30 mb-4" style={{ color: 'var(--foreground)' }}>
              Add another account before removing this one
            </p>
          )}
          <div className="mt-4">
            <AccountRow label="EMAIL"  value={emailAccount?.address ?? null}   isLinked={!!emailAccount}  unlinking={unlinking === 'email'}  canUnlink={canUnlink} onConnect={linkEmail}  onUnlink={() => handleUnlink('email',  () => unlinkEmail(emailAccount!.address))} />
            <AccountRow label="PHONE"  value={phoneAccount?.number ?? null}    isLinked={!!phoneAccount}  unlinking={unlinking === 'phone'}  canUnlink={canUnlink} onConnect={linkPhone}  onUnlink={() => handleUnlink('phone',  () => unlinkPhone(phoneAccount!.number))} />
            <AccountRow label="GOOGLE" value={googleAccount?.email ?? (googleAccount ? 'Connected' : null)} isLinked={!!googleAccount} unlinking={unlinking === 'google'} canUnlink={canUnlink} onConnect={linkGoogle} onUnlink={() => handleUnlink('google', () => unlinkGoogle(googleAccount!.subject))} />
            <AccountRow label="WALLET" value={walletAccount ? `${walletAccount.address.slice(0,6)}...${walletAccount.address.slice(-4)}` : null} isLinked={!!walletAccount} unlinking={unlinking === 'wallet'} canUnlink={canUnlink} onConnect={linkWallet} onUnlink={() => handleUnlink('wallet', () => unlinkWallet(walletAccount!.address))} />
          </div>
        </section>

        {/* Actions */}
        {saveError && (
          <p
            className="font-mono text-[12px] uppercase tracking-tight mb-3"
            style={{ color: '#c0392b' }}
          >
            ✗ {saveError}
          </p>
        )}
        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="font-mono text-[13px] uppercase tracking-tight border px-4 py-2 hover:opacity-70 transition disabled:opacity-40"
            style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
          >
            {saving ? 'SAVING...' : saved ? 'SAVED ✓' : 'SAVE PROFILE'}
          </button>
          <button
            onClick={logout}
            className="font-mono text-[13px] uppercase tracking-tight opacity-40 hover:opacity-70 transition"
            style={{ color: 'var(--foreground)' }}
          >
            LOG OUT
          </button>
        </div>
      </main>
    </div>
  );
}

function AccountRow({ label, value, isLinked, unlinking, canUnlink, onConnect, onUnlink }: {
  label: string; value: string | null; isLinked: boolean; unlinking: boolean;
  canUnlink: boolean; onConnect: () => void; onUnlink: () => void;
}) {
  return (
    <div className="flex justify-between items-center border-b py-3" style={{ borderColor: 'var(--border-color)' }}>
      <span className="font-mono text-[13px] uppercase tracking-tight opacity-50" style={{ color: 'var(--foreground)' }}>{label}</span>
      <div className="flex items-center gap-4">
        {isLinked ? (
          <>
            <span className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>{value}</span>
            <button onClick={onUnlink} disabled={!canUnlink || unlinking}
              className="font-mono text-[12px] uppercase tracking-tight opacity-30 hover:opacity-70 transition disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ color: 'var(--foreground)' }}>
              {unlinking ? 'REMOVING...' : 'REMOVE'}
            </button>
          </>
        ) : (
          <button onClick={onConnect}
            className="font-mono text-[13px] uppercase tracking-tight hover:opacity-70 transition border-b"
            style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
            + CONNECT
          </button>
        )}
      </div>
    </div>
  );
}
