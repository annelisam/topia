'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../components/Navigation';

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f0e8' }}>
        <p className="font-mono text-[13px] uppercase tracking-tight" style={{ color: '#1a1a1a' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8' }}>
      <Navigation />

      <main className="container mx-auto max-w-2xl px-4 sm:px-6 pt-28 pb-16">

        {/* Header */}
        <div className="mb-10 border-b pb-6" style={{ borderColor: '#1a1a1a' }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-mono text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-1" style={{ color: '#1a1a1a' }}>
                YOUR PROFILE
              </h1>
              <p className="font-mono text-[13px] uppercase tracking-tight opacity-50" style={{ color: '#1a1a1a' }}>
                Manage your identity on TOPIA
              </p>
            </div>
            {username && (
              <Link
                href={`/profile/${username}`}
                className="font-mono text-[13px] uppercase tracking-tight border px-3 py-1.5 hover:opacity-70 transition flex-shrink-0 mt-1"
                style={{ color: '#1a1a1a', borderColor: '#1a1a1a' }}
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
            style={{ borderColor: '#1a1a1a33' }}
            title="Upload photo"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a1a11' }}>
                <span className="font-mono text-2xl" style={{ color: '#1a1a1a44' }}>
                  {name ? name[0].toUpperCase() : '?'}
                </span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition" style={{ backgroundColor: '#1a1a1a88' }}>
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
            <p className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-1" style={{ color: '#1a1a1a' }}>
              Profile Photo
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="font-mono text-[13px] uppercase tracking-tight border-b hover:opacity-70 transition"
              style={{ color: '#1a1a1a', borderColor: '#1a1a1a66' }}
            >
              {avatarUrl ? 'CHANGE PHOTO' : '+ UPLOAD PHOTO'}
            </button>
            {avatarUrl && (
              <button
                onClick={() => setAvatarUrl('')}
                className="ml-4 font-mono text-[13px] uppercase tracking-tight opacity-30 hover:opacity-60 transition"
                style={{ color: '#1a1a1a' }}
              >
                REMOVE
              </button>
            )}
          </div>
        </section>

        {/* Profile Info */}
        <section className="mb-10 space-y-6">
          <h2 className="font-mono text-[13px] uppercase tracking-tight opacity-50" style={{ color: '#1a1a1a' }}>
            Profile Info
          </h2>

          <div>
            <label className="block font-mono text-[13px] uppercase tracking-tight mb-2 opacity-50" style={{ color: '#1a1a1a' }}>Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              className="w-full border-b bg-transparent font-mono text-[13px] py-2 outline-none"
              style={{ color: '#1a1a1a', borderColor: '#1a1a1a44' }}
            />
          </div>

          <div>
            <label className="block font-mono text-[13px] uppercase tracking-tight mb-2 opacity-50" style={{ color: '#1a1a1a' }}>Username</label>
            <div className="flex items-center border-b" style={{ borderColor: '#1a1a1a44' }}>
              <span className="font-mono text-[13px] opacity-30 pr-0.5" style={{ color: '#1a1a1a' }}>@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="handle"
                className="flex-1 bg-transparent font-mono text-[13px] py-2 outline-none"
                style={{ color: '#1a1a1a' }}
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[13px] uppercase tracking-tight mb-2 opacity-50" style={{ color: '#1a1a1a' }}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your story..."
              rows={3}
              className="w-full border-b bg-transparent font-mono text-[13px] py-2 outline-none resize-none"
              style={{ color: '#1a1a1a', borderColor: '#1a1a1a44' }}
            />
          </div>
        </section>

        {/* Role Tags */}
        <section className="mb-10">
          <h2 className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-1" style={{ color: '#1a1a1a' }}>
            What You Do
          </h2>
          <p className="font-mono text-[12px] opacity-30 mb-4" style={{ color: '#1a1a1a' }}>
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
                    borderColor:     '#1a1a1a',
                    backgroundColor: isSelected ? '#1a1a1a' : 'transparent',
                    color:           isSelected ? '#f5f0e8' : '#1a1a1a',
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
          <h2 className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-1" style={{ color: '#1a1a1a' }}>
            Tools You Use
          </h2>
          <p className="font-mono text-[12px] opacity-30 mb-4" style={{ color: '#1a1a1a' }}>
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
                    style={{ borderColor: '#1a1a1a', backgroundColor: '#1a1a1a', color: '#f5f0e8' }}
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
            style={{ color: '#1a1a1a', borderColor: '#1a1a1a44' }}
          />

          {/* Scrollable tool list */}
          {toolsLoading ? (
            <p className="font-mono text-[12px] opacity-30" style={{ color: '#1a1a1a' }}>Loading tools...</p>
          ) : filteredTools.length === 0 ? (
            <p className="font-mono text-[12px] opacity-30" style={{ color: '#1a1a1a' }}>No tools match your search</p>
          ) : (
            <div
              className="border overflow-y-auto"
              style={{ borderColor: '#1a1a1a22', maxHeight: '220px' }}
            >
              {filteredTools.map((tool) => {
                const isSelected = selectedTools.includes(tool.slug);
                return (
                  <button
                    key={tool.slug}
                    onClick={() => toggleTool(tool.slug)}
                    className="w-full flex items-center justify-between px-4 py-2.5 border-b text-left transition-colors hover:opacity-70"
                    style={{
                      borderColor:     '#1a1a1a11',
                      backgroundColor: isSelected ? '#1a1a1a08' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 border flex-shrink-0 flex items-center justify-center"
                        style={{
                          borderColor:     '#1a1a1a',
                          backgroundColor: isSelected ? '#1a1a1a' : 'transparent',
                        }}
                      >
                        {isSelected && <span className="text-[8px]" style={{ color: '#f5f0e8' }}>✓</span>}
                      </span>
                      <span className="font-mono text-[13px]" style={{ color: '#1a1a1a' }}>{tool.name}</span>
                    </div>
                    {tool.category && (
                      <span className="font-mono text-[11px] opacity-30" style={{ color: '#1a1a1a' }}>
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
          <h2 className="font-mono text-[13px] uppercase tracking-tight opacity-50" style={{ color: '#1a1a1a' }}>
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
              <label className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-tight mb-2 opacity-50" style={{ color: '#1a1a1a' }}>
                {icon}
                {label}
              </label>
              <input
                type="url"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full border-b bg-transparent font-mono text-[13px] py-2 outline-none"
                style={{ color: '#1a1a1a', borderColor: '#1a1a1a44' }}
              />
            </div>
          ))}
        </section>

        {/* Connected Accounts */}
        <section className="mb-10">
          <h2 className="font-mono text-[13px] uppercase tracking-tight mb-1 opacity-50" style={{ color: '#1a1a1a' }}>
            Connected Accounts
          </h2>
          {!canUnlink && (
            <p className="font-mono text-[12px] uppercase tracking-tight opacity-30 mb-4" style={{ color: '#1a1a1a' }}>
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
        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#1a1a1a22' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="font-mono text-[13px] uppercase tracking-tight border px-4 py-2 hover:opacity-70 transition disabled:opacity-40"
            style={{ color: '#1a1a1a', borderColor: '#1a1a1a' }}
          >
            {saving ? 'SAVING...' : saved ? 'SAVED ✓' : 'SAVE PROFILE'}
          </button>
          <button
            onClick={logout}
            className="font-mono text-[13px] uppercase tracking-tight opacity-40 hover:opacity-70 transition"
            style={{ color: '#1a1a1a' }}
          >
            LOG OUT
          </button>
        </div>
      </main>
    </div>
  );
}

function SocialIcon({ type, size = 14 }: { type: string; size?: number }) {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'currentColor', style: { opacity: 0.6, flexShrink: 0 } as React.CSSProperties };

  switch (type) {
    case 'website':
      return <svg {...props}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>;
    case 'twitter':
      return <svg {...props}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case 'instagram':
      return <svg {...props}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
    case 'soundcloud':
      return <svg {...props}><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.057-.049-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.308c.013.06.045.094.104.094.057 0 .09-.034.104-.094l.199-1.308-.2-1.332c-.014-.064-.047-.094-.104-.094zm1.79-1.065c-.067 0-.117.063-.123.13l-.218 2.361.218 2.298c.006.07.056.13.123.13.063 0 .117-.06.123-.13l.247-2.298-.247-2.361c-.006-.07-.06-.13-.123-.13zm.899-.131c-.075 0-.135.07-.141.146l-.201 2.493.201 2.413c.006.075.066.146.141.146.076 0 .135-.071.141-.146l.228-2.413-.228-2.493c-.006-.076-.065-.146-.141-.146zm.89-.095c-.084 0-.15.08-.156.162l-.185 2.588.185 2.49c.006.082.072.162.156.162.082 0 .15-.08.156-.162l.209-2.49-.21-2.588c-.005-.082-.073-.162-.155-.162zm.89-.238c-.094 0-.166.09-.172.18l-.168 2.826.168 2.553c.006.09.078.18.172.18.092 0 .166-.09.171-.18l.19-2.553-.19-2.826c-.005-.09-.079-.18-.171-.18zm.9-.139c-.1 0-.18.098-.187.197l-.151 2.965.151 2.607c.007.098.087.197.187.197.098 0 .18-.099.186-.197l.17-2.607-.17-2.965c-.006-.099-.088-.197-.186-.197zm.9 0c-.11 0-.197.108-.202.215l-.135 2.965.135 2.608c.005.107.093.215.202.215.108 0 .197-.108.203-.215l.152-2.608-.152-2.965c-.006-.107-.095-.215-.203-.215zm1.63-1.436c-.032 0-.063.005-.093.015a.22.22 0 00-.148.205l-.118 4.236.118 2.586a.222.222 0 00.241.209c.12-.006.213-.1.218-.209l.133-2.586-.133-4.236a.218.218 0 00-.218-.22zm.862-.089c-.133 0-.24.112-.245.249l-.1 4.326.1 2.563c.005.137.112.249.245.249.132 0 .24-.112.245-.249l.112-2.563-.112-4.326c-.005-.137-.113-.249-.245-.249zm.876-.513c-.143 0-.258.12-.262.268l-.084 4.838.084 2.541c.004.148.119.268.262.268.142 0 .258-.12.262-.268l.094-2.541-.094-4.838c-.004-.148-.12-.268-.262-.268zm.882-.36c-.152 0-.275.13-.279.287l-.068 5.198.068 2.51c.004.157.127.287.28.287.15 0 .274-.13.278-.287l.076-2.51-.076-5.198c-.004-.157-.128-.286-.279-.286zm.875-.405c-.084 0-.159.037-.213.098a.286.286 0 00-.082.204l-.053 5.604.053 2.486a.298.298 0 00.295.3.298.298 0 00.295-.3l.06-2.486-.06-5.604a.29.29 0 00-.295-.302zm3.782.072c-.226 0-.446.028-.66.081a7.457 7.457 0 00-7.381-6.583c-.465 0-.925.054-1.373.16-.169.04-.214.083-.216.164v12.987c.003.085.065.157.147.17h9.483a3.465 3.465 0 003.465-3.462 3.465 3.465 0 00-3.465-3.517z"/></svg>;
    case 'spotify':
      return <svg {...props}><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>;
    case 'linkedin':
      return <svg {...props}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
    case 'substack':
      return <svg {...props}><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>;
    default:
      return null;
  }
}

function AccountRow({ label, value, isLinked, unlinking, canUnlink, onConnect, onUnlink }: {
  label: string; value: string | null; isLinked: boolean; unlinking: boolean;
  canUnlink: boolean; onConnect: () => void; onUnlink: () => void;
}) {
  return (
    <div className="flex justify-between items-center border-b py-3" style={{ borderColor: '#1a1a1a22' }}>
      <span className="font-mono text-[13px] uppercase tracking-tight opacity-50" style={{ color: '#1a1a1a' }}>{label}</span>
      <div className="flex items-center gap-4">
        {isLinked ? (
          <>
            <span className="font-mono text-[12px]" style={{ color: '#1a1a1a' }}>{value}</span>
            <button onClick={onUnlink} disabled={!canUnlink || unlinking}
              className="font-mono text-[12px] uppercase tracking-tight opacity-30 hover:opacity-70 transition disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ color: '#1a1a1a' }}>
              {unlinking ? 'REMOVING...' : 'REMOVE'}
            </button>
          </>
        ) : (
          <button onClick={onConnect}
            className="font-mono text-[13px] uppercase tracking-tight hover:opacity-70 transition border-b"
            style={{ color: '#1a1a1a', borderColor: '#1a1a1a66' }}>
            + CONNECT
          </button>
        )}
      </div>
    </div>
  );
}
