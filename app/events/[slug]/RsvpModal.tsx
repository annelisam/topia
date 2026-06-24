'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { SocialIcon } from '../../components/SocialIcons';
import { ROLE_TAGS, ROLES_MAX } from '../../../lib/events/questions';
import { roleSlugToLabel } from '../../../lib/profile/roleTags';
import { useUsernameAvailability, sanitizeUsername } from '../../onboarding/usernameAvailability';
import { avatarColor, avatarTextColor, avatarInitial, isRealPhoto } from '../../../lib/avatar';
import { isGif, uploadToBlob } from '../../../lib/uploadImage';

// Resize an image to max 256×256 → base64 JPEG (GIFs uploaded raw to keep motion).
function resizeImage(file: File): Promise<string> {
  if (isGif(file)) return uploadToBlob(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 256;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface Question {
  id: string;
  label: string;
  type: string; // short_text | long_text | single_select | multi_select | checkbox
  options: string[] | null;
  required: boolean;
}

type AnswerValue = string | string[] | boolean;

interface Props {
  eventId: string;
  slug: string;
  eventName: string;
  privyId: string;
  email?: string | null;
  name?: string | null;
  inviteToken?: string | null;
  approvalRequired?: boolean;
  onClose: () => void;
  onDone: (status: string, alreadyRegistered?: boolean) => void;
}

const inputCls = 'w-full border px-3 py-2 font-mono text-[13px] rounded-lg outline-none';

// Curated country dialing codes for the phone field.
const COUNTRY_CODES = ['+1', '+44', '+61', '+33', '+49', '+34', '+39', '+81', '+91', '+52', '+55', '+86', '+27', '+234', '+971', '+972'];

// Split a stored E.164-ish phone into a known dialing code + the rest.
function splitPhone(full: string | null | undefined): { code: string; rest: string } {
  if (!full) return { code: '+1', rest: '' };
  const match = COUNTRY_CODES.filter((c) => full.startsWith(c)).sort((a, b) => b.length - a.length)[0];
  if (match) return { code: match, rest: full.slice(match.length) };
  return { code: '+1', rest: full.replace(/^\+/, '') };
}

// Registration modal: after a visitor verifies with Privy, they confirm their
// contact details (name auto-filled, email + optional phone) and answer the
// host's custom questions, then submit.
export default function RsvpModal({ eventId, slug, eventName, privyId, email, name, inviteToken, approvalRequired, onClose, onDone }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // The signed-in user's existing profile role tags (slugs) — used to prefill
  // any "What do you do?" (roles) question so it carries over from the profile.
  const [profileRoleSlugs, setProfileRoleSlugs] = useState<string[]>([]);
  // Consent: registering creates a Topia profile and lets us contact them.
  const [consent, setConsent] = useState(false);

  // Standard contact fields — auto-filled from the user's profile, editable.
  const [contactName, setContactName] = useState(name ?? '');
  const [contactEmail, setContactEmail] = useState(email ?? '');
  const [phoneCode, setPhoneCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Profile claim: a username (required) + an optional photo.
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const availability = useUsernameAvailability(username, privyId);
  const previewColor = avatarColor(username || contactName || privyId);

  // What the profile already has — those fields are managed in profile settings,
  // not the RSVP form, so we lock them here.
  const [existingName, setExistingName] = useState(false);
  const [existingUsername, setExistingUsername] = useState(false);
  const [existingPhoto, setExistingPhoto] = useState(false);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true); setError('');
    try { setAvatarUrl(await resizeImage(file)); }
    catch { setError("Couldn't process that image — try another."); }
    finally { setUploadingAvatar(false); }
  }

  // Privy-verified contact methods are locked (can't be edited); the others
  // can be verified in-place via Privy, like the profile "connect" rows.
  const { user, linkEmail, linkPhone, getAccessToken } = usePrivy();
  const linked = user?.linkedAccounts ?? [];
  const emailAcct = linked.find((a) => a.type === 'email') as { address: string } | undefined;
  const googleAcct = linked.find((a) => a.type === 'google_oauth') as { email?: string } | undefined;
  const phoneAcct = linked.find((a) => a.type === 'phone') as { number: string } | undefined;
  const verifiedEmail = emailAcct?.address || googleAcct?.email || null;
  const verifiedPhone = phoneAcct?.number || null;

  // Force the verified values into the fields (and keep them in sync if the
  // guest verifies one mid-flow).
  useEffect(() => { if (verifiedEmail) setContactEmail(verifiedEmail); }, [verifiedEmail]);
  useEffect(() => {
    if (verifiedPhone) { const { code, rest } = splitPhone(verifiedPhone); setPhoneCode(code); setPhoneNumber(rest); }
  }, [verifiedPhone]);

  useEffect(() => {
    fetch(`/api/events/questions?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions ?? []))
      .catch(() => setQuestions([]));
  }, [slug]);

  // Lock background scroll while the modal is open (esp. mobile). The modal body
  // scrolls internally; the page behind stays put.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Prefill name / email / phone from the signed-in user's profile.
  useEffect(() => {
    fetch(`/api/auth/profile?privyId=${encodeURIComponent(privyId)}`)
      .then((r) => r.json())
      .then((d) => {
        const u = d.user;
        if (!u) return;
        setContactName((prev) => prev || u.name || '');
        setContactEmail((prev) => prev || u.email || '');
        setUsername((prev) => prev || u.username || '');
        if (isRealPhoto(u.avatarUrl)) setAvatarUrl((prev) => prev || u.avatarUrl);
        // Lock fields the profile already has — change them in profile settings.
        if (u.name) setExistingName(true);
        if (u.username) setExistingUsername(true);
        if (isRealPhoto(u.avatarUrl)) setExistingPhoto(true);
        const { code, rest } = splitPhone(u.phone);
        if (rest) { setPhoneCode(code); setPhoneNumber(rest); }
        if (u.roleTags) {
          setProfileRoleSlugs(String(u.roleTags).split(',').map((s: string) => s.trim()).filter(Boolean));
        }
      })
      .catch(() => {});
  }, [privyId]);

  // Carry the user's saved craft into any "What do you do?" question — but only
  // seed empties, so we never stomp an answer the guest is actively editing.
  useEffect(() => {
    if (!questions || profileRoleSlugs.length === 0) return;
    const seed = profileRoleSlugs.map(roleSlugToLabel).slice(0, ROLES_MAX);
    if (seed.length === 0) return;
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const q of questions) {
        if (q.type !== 'roles') continue;
        const cur = prev[q.id];
        if (Array.isArray(cur) && cur.length > 0) continue;
        next[q.id] = seed;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [questions, profileRoleSlugs]);

  const set = (id: string, v: AnswerValue) => setAnswers((a) => ({ ...a, [id]: v }));
  const toggleMulti = (id: string, opt: string) =>
    setAnswers((a) => {
      const cur = Array.isArray(a[id]) ? (a[id] as string[]) : [];
      return { ...a, [id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
    });

  const answered = (q: Question): boolean => {
    const v = answers[q.id];
    if (q.type === 'checkbox') return v === true;
    if (Array.isArray(v)) return v.length > 0;
    return !!(v && String(v).trim());
  };

  const submit = async () => {
    if (!contactName.trim()) { setError('Please add your name'); return; }
    if (!username.trim()) { setError('Pick a username to claim your TOPIA profile'); return; }
    if (availability === 'invalid') { setError('Username must be 3–30 chars: lowercase letters, numbers, underscores'); return; }
    if (availability === 'taken') { setError('That username is taken — try another'); return; }
    if (availability === 'checking') { setError('Hang on — still checking that username'); return; }
    // Email must be verified through Privy — no free-typed addresses.
    if (!verifiedEmail) { setError('Please verify your email to register'); return; }
    // Phone is optional, but if provided it must look like a real number.
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 7) { setError('Please enter a valid phone number, or leave it blank'); return; }
    for (const q of questions ?? []) {
      if (q.required && !answered(q)) { setError(`Please answer: ${q.label}`); return; }
    }
    if (!consent) { setError('Please agree to create a Topia profile to continue'); return; }
    const phone = digits.length ? `${phoneCode}${digits}` : null;
    setSubmitting(true);
    setError('');
    try {
      // Send the Privy access token so the server can independently confirm the
      // email is verified (the body alone is not trusted).
      const accessToken = await getAccessToken().catch(() => null);
      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, eventId, answers, email: verifiedEmail, name: contactName.trim(), phone, username: username.trim(), avatarUrl: avatarUrl || undefined, inviteToken, accessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to register');
      onDone(data.status ?? 'going', data.alreadyRegistered === true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to register');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (q: Question) => {
    const v = answers[q.id];
    switch (q.type) {
      case 'long_text':
        return (
          <textarea rows={3} value={(v as string) ?? ''} onChange={(e) => set(q.id, e.target.value)}
            className={inputCls} style={fieldStyle} />
        );
      case 'single_select':
        return (
          <div className="flex flex-col gap-1.5">
            {(q.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
                <input type="radio" name={q.id} checked={v === opt} onChange={() => set(q.id, opt)} style={{ accentColor: 'var(--foreground)' }} />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'multi_select':
        return (
          <div className="flex flex-col gap-1.5">
            {(q.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
                <input type="checkbox" checked={Array.isArray(v) && v.includes(opt)} onChange={() => toggleMulti(q.id, opt)} style={{ accentColor: 'var(--foreground)' }} />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
            <input type="checkbox" checked={v === true} onChange={(e) => set(q.id, e.target.checked)} style={{ accentColor: 'var(--foreground)' }} />
            Yes
          </label>
        );
      case 'instagram':
      case 'twitter':
        return (
          <div className="flex items-center gap-2 border px-3 rounded-lg" style={fieldStyle}>
            <SocialIcon type={q.type} size={15} />
            <span className="opacity-40 font-mono text-[13px]">@</span>
            <input
              type="text" inputMode="text" autoCapitalize="off" autoCorrect="off"
              value={(v as string) ?? ''}
              onChange={(e) => set(q.id, e.target.value.replace(/^@+/, '').trim())}
              className="flex-1 bg-transparent border-none outline-none font-mono text-[13px] py-2"
              style={{ color: 'var(--foreground)' }}
              placeholder="handle"
            />
          </div>
        );
      case 'roles':
        return (
          <RoleTagPicker
            options={(q.options && q.options.length ? q.options : ROLE_TAGS)}
            value={Array.isArray(v) ? (v as string[]) : []}
            onChange={(next) => set(q.id, next)}
          />
        );
      default:
        return (
          <input type="text" value={(v as string) ?? ''} onChange={(e) => set(q.id, e.target.value)}
            className={inputCls} style={fieldStyle} />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 border max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-start justify-between mb-4">
          <p className="font-mono text-[15px] font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
            Register · {eventName}
          </p>
          <button onClick={onClose} className="font-mono text-[18px] opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer" style={{ color: 'var(--foreground)' }} aria-label="Close">×</button>
        </div>

        {questions === null ? (
          <p className="font-mono text-[13px] opacity-50" style={{ color: 'var(--foreground)' }}>Loading…</p>
        ) : (
          <>
            <p className="font-mono text-[13px] opacity-60 mb-4" style={{ color: 'var(--foreground)' }}>
              {approvalRequired
                ? `Request to join ${eventName}. The host will review your request.`
                : questions.length === 0 ? `Confirm your spot for ${eventName}.` : `Register for ${eventName}.`}
            </p>

            {/* Standard contact fields — name auto-filled, email + optional phone */}
            <div className="space-y-4 mb-5">
              {/* Profile photo — left-aligned like every other field: label, the
                  framed avatar, then an add/change link. Locked when the profile
                  already has a photo (manage it in profile settings). */}
              <div>
                <label className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] mb-2 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
                  Profile photo
                  {existingPhoto && <span className="normal-case tracking-normal opacity-70">· manage in profile</span>}
                </label>
                <div className="relative inline-block ml-2 mt-1">
                  <span className="absolute -top-2 -left-2 w-3.5 h-3.5 z-20"><span className="absolute top-0 left-0 w-full h-px bg-[var(--foreground)]/25" /><span className="absolute top-0 left-0 h-full w-px bg-[var(--foreground)]/25" /></span>
                  <span className="absolute -top-2 -right-2 w-3.5 h-3.5 z-20"><span className="absolute top-0 right-0 w-full h-px bg-[var(--foreground)]/25" /><span className="absolute top-0 right-0 h-full w-px bg-[var(--foreground)]/25" /></span>
                  <span className="absolute -bottom-2 -left-2 w-3.5 h-3.5 z-20"><span className="absolute bottom-0 left-0 w-full h-px bg-[var(--foreground)]/25" /><span className="absolute bottom-0 left-0 h-full w-px bg-[var(--foreground)]/25" /></span>
                  <span className="absolute -bottom-2 -right-2 w-3.5 h-3.5 z-20"><span className="absolute bottom-0 right-0 w-full h-px bg-[var(--foreground)]/25" /><span className="absolute bottom-0 right-0 h-full w-px bg-[var(--foreground)]/25" /></span>
                  <button
                    type="button"
                    onClick={() => { if (!existingPhoto) fileRef.current?.click(); }}
                    disabled={existingPhoto || uploadingAvatar}
                    title={existingPhoto ? 'Update your photo in your profile settings' : undefined}
                    className={`relative w-20 h-20 rounded-full overflow-hidden border-2 group block ${existingPhoto ? 'cursor-default' : 'cursor-pointer'}`}
                    style={{ borderColor: 'var(--border-color)' }}
                    aria-label={existingPhoto ? 'Profile photo' : 'Upload profile photo'}
                  >
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center font-basement font-black text-[30px]" style={{ backgroundColor: previewColor, color: avatarTextColor(previewColor) }}>
                        {avatarInitial(contactName || username)}
                      </span>
                    )}
                    {!existingPhoto && (
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.45)' }}>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-white">{uploadingAvatar ? '…' : avatarUrl ? 'change' : 'add'}</span>
                      </span>
                    )}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
                <div className="mt-2.5">
                  {existingPhoto ? (
                    <span className="font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }} title="Update your photo in your profile settings">Update in your profile settings.</span>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingAvatar} className="font-mono text-[11px] uppercase tracking-[0.12em] underline bg-transparent border-none cursor-pointer opacity-70 hover:opacity-100 disabled:opacity-40" style={{ color: 'var(--foreground)' }}>
                      {uploadingAvatar ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Add photo'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] mb-1.5 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
                  Name<span style={{ color: '#FF5C34' }}> *</span>
                  {existingName && <span className="normal-case tracking-normal opacity-70">· manage in profile</span>}
                </label>
                <input
                  type="text" value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  readOnly={existingName} disabled={existingName}
                  title={existingName ? 'Update your name in your profile settings' : undefined}
                  className={`${inputCls}${existingName ? ' cursor-not-allowed opacity-80' : ''}`}
                  style={fieldStyle} placeholder="Your name"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] mb-1.5 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
                  Username<span style={{ color: '#FF5C34' }}> *</span>
                  {existingUsername && <span className="normal-case tracking-normal opacity-70">· manage in profile</span>}
                </label>
                <div className={`flex items-center gap-2 border px-3 rounded-lg${existingUsername ? ' opacity-80' : ''}`} style={fieldStyle} title={existingUsername ? 'Update your username in your profile settings' : undefined}>
                  <span className="opacity-40 font-mono text-[13px]">@</span>
                  <input
                    type="text" inputMode="text" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                    readOnly={existingUsername} disabled={existingUsername}
                    className={`flex-1 bg-transparent border-none outline-none font-mono text-[13px] py-2${existingUsername ? ' cursor-not-allowed' : ''}`}
                    style={{ color: 'var(--foreground)' }}
                    placeholder="yourhandle"
                  />
                  {username && !existingUsername && (
                    <span
                      className="font-mono text-[10px] uppercase tracking-wider shrink-0"
                      style={{ color: availability === 'available' ? '#00b36b' : (availability === 'taken' || availability === 'invalid') ? '#FF5C34' : 'var(--foreground)', opacity: availability === 'checking' ? 0.5 : 1 }}
                    >
                      {availability === 'checking' ? '…' : availability === 'available' ? 'available ✓' : availability === 'taken' ? 'taken' : availability === 'invalid' ? 'invalid' : ''}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>
                  {existingUsername ? 'Update your username in your profile settings.' : 'Claim your TOPIA handle — you can change it anytime.'}
                </p>
              </div>
              <div>
                <label className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] mb-1.5 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
                  Email<span style={{ color: '#FF5C34' }}> *</span>
                  {verifiedEmail && <span className="inline-flex items-center gap-1 normal-case tracking-normal" style={{ color: '#00b36b', opacity: 1 }}>· verified ✓</span>}
                </label>
                {verifiedEmail ? (
                  <input type="email" value={contactEmail} readOnly disabled className={`${inputCls} cursor-not-allowed opacity-80`} style={fieldStyle} />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => linkEmail()}
                      className="w-full px-3 py-2 font-mono text-[13px] rounded-lg cursor-pointer border text-left flex items-center justify-between gap-2"
                      style={fieldStyle}
                    >
                      <span className="opacity-50">Verify your email…</span>
                      <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>Verify →</span>
                    </button>
                    <p className="mt-1.5 font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>
                      A verified email is required to register.
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] mb-1.5 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
                  Phone<span className="normal-case tracking-normal opacity-50"> (optional)</span>
                  {verifiedPhone && <span className="inline-flex items-center gap-1 normal-case tracking-normal" style={{ color: '#00b36b', opacity: 1 }}>· verified ✓</span>}
                </label>
                {verifiedPhone ? (
                  <input type="tel" value={`${phoneCode} ${phoneNumber}`} readOnly disabled className={`${inputCls} cursor-not-allowed opacity-80`} style={fieldStyle} />
                ) : (
                  <>
                    <div className="flex gap-2">
                      <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className="border px-2 py-2 font-mono text-[13px] rounded-lg outline-none cursor-pointer shrink-0" style={fieldStyle}>
                        {COUNTRY_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="tel" inputMode="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={inputCls} style={fieldStyle} placeholder="555 123 4567" />
                    </div>
                    <button type="button" onClick={() => linkPhone()} className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] underline bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent)' }}>
                      Verify with Privy →
                    </button>
                  </>
                )}
              </div>

              {questions.map((q) => (
                <div key={q.id}>
                  <label className="block font-mono text-[12px] uppercase tracking-[0.12em] mb-1.5 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
                    {q.label}{q.required && <span style={{ color: '#FF5C34' }}> *</span>}
                  </label>
                  {renderField(q)}
                </div>
              ))}
            </div>

            {/* Consent: RSVPing creates a Topia profile + lets us contact them */}
            <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 shrink-0"
                style={{ accentColor: 'var(--foreground)' }}
              />
              <span className="font-mono text-[12px] leading-snug opacity-70" style={{ color: 'var(--foreground)' }}>
                By registering, I agree to create a Topia profile and allow Topia and the event host to contact me about this event.
              </span>
            </label>

            {error && <p className="font-mono text-[12px] mb-3" style={{ color: '#FF5C34' }}>{error}</p>}

            <button
              onClick={submit}
              disabled={submitting || !verifiedEmail || !consent || availability !== 'available'}
              className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
            >
              {submitting ? 'Submitting…' : !verifiedEmail ? 'Verify email to continue' : availability !== 'available' ? 'Pick a username to continue' : !consent ? 'Agree to continue' : approvalRequired ? 'Send request' : 'Complete RSVP'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)',
};

// Searchable role/tag picker — pick up to ROLES_MAX from a suggestion list,
// or create your own.
function RoleTagPicker({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [search, setSearch] = useState('');
  const atMax = value.length >= ROLES_MAX;
  const q = search.trim();
  const ql = q.toLowerCase();
  const filtered = options.filter((o) => o.toLowerCase().includes(ql) && !value.includes(o)).slice(0, 10);
  const exactExists = [...options, ...value].some((o) => o.toLowerCase() === ql);
  const canCreate = q.length > 0 && !exactExists && !atMax;

  const add = (tag: string) => {
    if (value.includes(tag) || value.length >= ROLES_MAX) return;
    onChange([...value, tag]);
    setSearch('');
  };
  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((t) => (
            <button key={t} type="button" onClick={() => remove(t)} className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[1px] px-2.5 py-1 rounded-md cursor-pointer border-none" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              {t} <span className="opacity-60">×</span>
            </button>
          ))}
        </div>
      )}
      {atMax ? (
        <p className="font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>Max {ROLES_MAX} selected — remove one to change.</p>
      ) : (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) { e.preventDefault(); add(q); } }}
          placeholder={`Search or add… (${value.length}/${ROLES_MAX})`}
          className={inputCls} style={fieldStyle}
        />
      )}
      {/* Empty state: a few quick-add suggestions. Typing filters / lets you create. */}
      {!atMax && q.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {options.filter((o) => !value.includes(o)).slice(0, 8).map((o) => (
            <button key={o} type="button" onClick={() => add(o)} className="font-mono text-[12px] uppercase tracking-[1px] px-2.5 py-1 rounded-md cursor-pointer border hover:opacity-70" style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)', backgroundColor: 'transparent' }}>
              + {o}
            </button>
          ))}
        </div>
      )}
      {!atMax && q.length > 0 && (filtered.length > 0 || canCreate) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {filtered.map((o) => (
            <button key={o} type="button" onClick={() => add(o)} className="font-mono text-[12px] uppercase tracking-[1px] px-2.5 py-1 rounded-md cursor-pointer border hover:opacity-70" style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)', backgroundColor: 'transparent' }}>
              {o}
            </button>
          ))}
          {canCreate && (
            <button type="button" onClick={() => add(q)} className="font-mono text-[12px] uppercase tracking-[1px] px-2.5 py-1 rounded-md cursor-pointer border border-dashed hover:opacity-70" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'transparent' }}>
              + Create “{q}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
