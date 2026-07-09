'use client';

import { useEffect, useState, useCallback } from 'react';

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  quantityTotal: number | null;
  quantitySold: number;
  isActive: boolean;
}

// Host-only editor for an event's ticket tiers. Rendered as the Tickets tab of
// the manage console. Talks to /api/events/ticket-types (host-gated server-side).
export default function TicketManager({
  eventId,
  slug,
  privyId,
}: {
  eventId: string;
  slug: string;
  privyId: string;
}) {
  const [tiers, setTiers] = useState<TicketType[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(''); // dollars, as typed
  const [qty, setQty] = useState(''); // blank = unlimited
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch(`/api/events/ticket-types?slug=${slug}&includeInactive=1`)
      .then((r) => r.json())
      .then((d) => setTiers(d.ticketTypes ?? []))
      .catch(() => setTiers([]));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const addTier = async () => {
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const priceCents = Math.round(parseFloat(price || '0') * 100);
    if (Number.isNaN(priceCents) || priceCents < 0) {
      setError('Enter a valid price');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/events/ticket-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId,
          eventId,
          name: name.trim(),
          priceCents,
          quantityTotal: qty.trim() === '' ? null : Math.max(0, parseInt(qty, 10)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add tier');
      setName('');
      setPrice('');
      setQty('');
      setOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tier');
    } finally {
      setBusy(false);
    }
  };

  const removeTier = async (id: string) => {
    await fetch(`/api/events/ticket-types?id=${id}&privyId=${privyId}`, { method: 'DELETE' });
    load();
  };

  const toggleActive = async (t: TicketType) => {
    await fetch('/api/events/ticket-types', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyId, id: t.id, isActive: !t.isActive }),
    });
    load();
  };

  return (
    <div className="mb-8 rounded-lg border p-4" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[12px] uppercase tracking-[0.15em] font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
          Manage Tickets
        </p>
        <button
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-lg border cursor-pointer bg-transparent"
          style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
        >
          {open ? 'Cancel' : '+ Add tier'}
        </button>
      </div>

      {tiers.length === 0 && !open && (
        <p className="font-mono text-[12px] opacity-50" style={{ color: 'var(--foreground)' }}>
          No ticket tiers yet. Add one to start selling — buyers will see Card + USDC options.
        </p>
      )}

      {tiers.length > 0 && (
        <div className="space-y-2 mb-3">
          {tiers.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-mono truncate" style={{ color: 'var(--foreground)', opacity: t.isActive ? 1 : 0.4 }}>
                {t.name} · {t.priceCents === 0 ? 'Free' : `$${(t.priceCents / 100).toFixed(2)}`}
                {t.quantityTotal != null && ` · ${t.quantitySold}/${t.quantityTotal}`}
                {!t.isActive && ' · (hidden)'}
              </span>
              <span className="flex gap-2 shrink-0">
                <button onClick={() => toggleActive(t)} className="font-mono text-[11px] underline cursor-pointer bg-transparent border-none" style={{ color: 'var(--foreground)' }}>
                  {t.isActive ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => removeTier(t.id)} className="font-mono text-[11px] underline cursor-pointer bg-transparent border-none" style={{ color: '#ff6b6b' }}>
                  {t.quantitySold > 0 ? 'Close' : 'Delete'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tier name (e.g. General Admission)"
            className="w-full px-3 py-2 font-mono text-[13px] rounded-lg border bg-transparent"
            style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
          />
          <div className="flex gap-2">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="Price USD (0 = free)"
              className="flex-1 px-3 py-2 font-mono text-[13px] rounded-lg border bg-transparent"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            />
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="numeric"
              placeholder="Qty (blank = ∞)"
              className="flex-1 px-3 py-2 font-mono text-[13px] rounded-lg border bg-transparent"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            />
          </div>
          {error && <p className="font-mono text-[12px]" style={{ color: '#ff6b6b' }}>{error}</p>}
          <button
            onClick={addTier}
            disabled={busy}
            className="w-full px-4 py-2.5 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold disabled:opacity-40"
            style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
          >
            {busy ? 'Saving…' : 'Save tier'}
          </button>
        </div>
      )}
    </div>
  );
}
