'use client';

import { useEffect, useState } from 'react';

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
  onClose: () => void;
  onDone: (status: string) => void;
}

const inputCls = 'w-full border px-3 py-2 font-mono text-[13px] rounded-lg outline-none';

// Registration modal: after a visitor verifies with Privy, they answer the
// host's custom questions here, then submit. Handles the no-questions case as a
// simple confirm step.
export default function RsvpModal({ eventId, slug, eventName, privyId, email, name, inviteToken, onClose, onDone }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/events/questions?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions ?? []))
      .catch(() => setQuestions([]));
  }, [slug]);

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
    for (const q of questions ?? []) {
      if (q.required && !answered(q)) { setError(`Please answer: ${q.label}`); return; }
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, eventId, answers, email, name, inviteToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to register');
      onDone(data.status ?? 'going');
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
            {questions.length === 0 ? (
              <p className="font-mono text-[13px] opacity-60 mb-5" style={{ color: 'var(--foreground)' }}>
                Confirm your spot for {eventName}.
              </p>
            ) : (
              <div className="space-y-4 mb-5">
                {questions.map((q) => (
                  <div key={q.id}>
                    <label className="block font-mono text-[12px] uppercase tracking-[0.12em] mb-1.5 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
                      {q.label}{q.required && <span style={{ color: '#FF5C34' }}> *</span>}
                    </label>
                    {renderField(q)}
                  </div>
                ))}
              </div>
            )}

            {error && <p className="font-mono text-[12px] mb-3" style={{ color: '#FF5C34' }}>{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold disabled:opacity-40"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
            >
              {submitting ? 'Submitting…' : 'Complete RSVP'}
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
