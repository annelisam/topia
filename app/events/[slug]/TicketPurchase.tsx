'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { encodeFunctionData, parseAbi, numberToHex } from 'viem';

/* ── Types ─────────────────────────────────────────────────────────── */

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  quantityTotal: number | null;
  quantitySold: number;
  maxPerOrder: number | null;
  isActive: boolean;
  remaining: number | null;
  soldOut: boolean;
}

type Rail = 'square' | 'crypto';
type Phase = 'idle' | 'paying' | 'confirming' | 'success' | 'error';

// Minimal shape of the Square Web Payments SDK we use.
type SquareCard = { attach: (sel: string) => Promise<void>; tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }> };
type SquarePayments = { card: () => Promise<SquareCard> };
declare global {
  interface Window {
    Square?: { payments: (appId: string, locationId: string) => SquarePayments };
  }
}

const ERC20_ABI = parseAbi(['function transfer(address to, uint256 value) returns (bool)']);

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? '';
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? '';
const SQUARE_CONFIGURED = Boolean(SQUARE_APP_ID && SQUARE_LOCATION_ID);
// Sandbox application IDs are prefixed "sandbox-"; pick the matching SDK CDN.
const SQUARE_SDK_URL = SQUARE_APP_ID.startsWith('sandbox-')
  ? 'https://sandbox.web.squarecdn.com/v1/square.js'
  : 'https://web.squarecdn.com/v1/square.js';

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/* ── Square SDK loader ─────────────────────────────────────────────── */

let squareScriptPromise: Promise<void> | null = null;
function loadSquareSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Square) return Promise.resolve();
  if (squareScriptPromise) return squareScriptPromise;
  squareScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SQUARE_SDK_URL;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Square SDK'));
    document.head.appendChild(s);
  });
  return squareScriptPromise;
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function TicketPurchase({ eventId, slug }: { eventId: string; slug: string }) {
  const { authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();

  const [tiers, setTiers] = useState<TicketType[] | null>(null);
  const [selected, setSelected] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [rail, setRail] = useState<Rail>('square');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ ticketCount: number } | null>(null);

  const cardRef = useRef<SquareCard | null>(null);
  const cardMountRef = useRef<HTMLDivElement | null>(null);

  // Load tiers for this event.
  useEffect(() => {
    fetch(`/api/events/ticket-types?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setTiers(d.ticketTypes ?? []))
      .catch(() => setTiers([]));
  }, [slug]);

  // Mount the Square card iframe when the Square rail is chosen in the modal.
  useEffect(() => {
    let cancelled = false;
    if (!selected || rail !== 'square' || !SQUARE_CONFIGURED) return;
    (async () => {
      try {
        await loadSquareSdk();
        if (cancelled || !window.Square || !cardMountRef.current) return;
        const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
        const card = await payments.card();
        await card.attach('#square-card-mount');
        if (!cancelled) cardRef.current = card;
      } catch {
        if (!cancelled) setMessage('Could not load the card form.');
      }
    })();
    return () => {
      cancelled = true;
      cardRef.current = null;
    };
  }, [selected, rail]);

  const close = useCallback(() => {
    setSelected(null);
    setPhase('idle');
    setMessage('');
    setResult(null);
    setQuantity(1);
    cardRef.current = null;
  }, []);

  const openFor = (tier: TicketType) => {
    if (!authenticated) {
      login();
      return;
    }
    setSelected(tier);
    setQuantity(1);
    setRail(SQUARE_CONFIGURED ? 'square' : 'crypto');
    setPhase('idle');
    setMessage('');
    setResult(null);
  };

  /* ── Square charge ──────────────────────────────────────────────── */
  const paySquare = async () => {
    if (!selected || !user?.id) return;
    if (!cardRef.current) {
      setMessage('Card form is still loading…');
      return;
    }
    setPhase('paying');
    setMessage('');
    try {
      const tok = await cardRef.current.tokenize();
      if (tok.status !== 'OK' || !tok.token) {
        throw new Error(tok.errors?.[0]?.message ?? 'Card was declined');
      }
      const res = await fetch('/api/checkout/square', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          ticketTypeId: selected.id,
          quantity,
          sourceId: tok.token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Payment failed');
      setResult({ ticketCount: data.ticketCount ?? quantity });
      setPhase('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Payment failed');
      setPhase('error');
    }
  };

  /* ── USDC on Base ───────────────────────────────────────────────── */
  const payCrypto = async () => {
    if (!selected || !user?.id) return;
    const wallet = wallets[0];
    if (!wallet) {
      setMessage('Connect a wallet to pay with USDC.');
      setPhase('error');
      return;
    }
    setPhase('paying');
    setMessage('');
    try {
      // 1. Create the pending order; server returns the exact transfer to make.
      const initRes = await fetch('/api/checkout/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, ticketTypeId: selected.id, quantity }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error ?? 'Could not start checkout');
      const { orderId, payment } = init;

      // 2. Send the USDC transfer from the user's wallet.
      const provider = await wallet.getEthereumProvider();
      const targetChain = numberToHex(payment.chainId);
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChain }] });
      } catch {
        /* wallet may already be on the right chain, or reject — let the tx surface it */
      }
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [payment.recipient as `0x${string}`, BigInt(payment.amountBaseUnits)],
      });
      const txHash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet.address, to: payment.token, data }],
      })) as string;

      // 3. Poll the confirm endpoint until the tx is mined + verified.
      setPhase('confirming');
      let confirmed = false;
      for (let i = 0; i < 30 && !confirmed; i++) {
        const cRes = await fetch('/api/checkout/crypto/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId: user.id, orderId, txHash }),
        });
        const c = await cRes.json();
        if (cRes.ok && c.ok) {
          setResult({ ticketCount: c.ticketCount ?? quantity });
          setPhase('success');
          confirmed = true;
        } else if (cRes.status === 202) {
          await new Promise((r) => setTimeout(r, 3000)); // not mined yet
        } else {
          throw new Error(c.error ?? 'Could not verify payment');
        }
      }
      if (!confirmed) throw new Error('Payment is taking longer than expected. Check back shortly.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Payment failed';
      setMessage(/user rejected|denied/i.test(msg) ? 'Transaction cancelled.' : msg);
      setPhase('error');
    }
  };

  // Nothing to show for free / unticketed events.
  if (!tiers || tiers.length === 0) return null;

  const totalCents = selected ? selected.priceCents * quantity : 0;
  const maxQty = selected
    ? Math.min(selected.maxPerOrder ?? 10, selected.remaining ?? selected.maxPerOrder ?? 10)
    : 1;

  return (
    <div className="mb-8">
      <p className="font-mono text-[13px] uppercase tracking-[0.15em] font-bold mb-3 opacity-50" style={{ color: 'var(--foreground)' }}>
        Tickets
      </p>

      <div className="space-y-2">
        {tiers.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="min-w-0">
              <p className="font-mono text-[14px] font-bold truncate" style={{ color: 'var(--foreground)' }}>
                {t.name}
              </p>
              {t.description && (
                <p className="font-mono text-[12px] opacity-60 truncate" style={{ color: 'var(--foreground)' }}>
                  {t.description}
                </p>
              )}
              {t.remaining != null && t.remaining <= 10 && !t.soldOut && (
                <p className="font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>
                  {t.remaining} left
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>
                {t.priceCents === 0 ? 'Free' : usd(t.priceCents)}
              </span>
              <button
                onClick={() => openFor(t)}
                disabled={t.soldOut}
                className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest rounded-lg cursor-pointer transition border-none font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
              >
                {t.soldOut ? 'Sold out' : 'Get'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Checkout modal */}
      {selected && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
            {phase === 'success' ? (
              <div className="text-center py-4">
                <p className="font-mono text-[15px] font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  You&apos;re in 🎟️
                </p>
                <p className="font-mono text-[13px] opacity-70 mb-6" style={{ color: 'var(--foreground)' }}>
                  {result?.ticketCount ?? quantity} ticket{(result?.ticketCount ?? quantity) > 1 ? 's' : ''} to {selected.name} confirmed.
                </p>
                <button onClick={close} className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-mono text-[15px] font-bold" style={{ color: 'var(--foreground)' }}>{selected.name}</p>
                    <p className="font-mono text-[12px] opacity-60" style={{ color: 'var(--foreground)' }}>
                      {selected.priceCents === 0 ? 'Free' : `${usd(selected.priceCents)} each`}
                    </p>
                  </div>
                  <button onClick={close} className="font-mono text-[18px] opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer" style={{ color: 'var(--foreground)' }} aria-label="Close">×</button>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>Quantity</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg border font-mono cursor-pointer bg-transparent" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>−</button>
                    <span className="font-mono text-[14px] w-6 text-center" style={{ color: 'var(--foreground)' }}>{quantity}</span>
                    <button onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} className="w-8 h-8 rounded-lg border font-mono cursor-pointer bg-transparent" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>+</button>
                  </div>
                </div>

                {selected.priceCents > 0 && (
                  <>
                    {/* Rail toggle */}
                    <div className="flex gap-2 mb-4">
                      {(['square', 'crypto'] as Rail[]).map((r) => {
                        const disabled = r === 'square' && !SQUARE_CONFIGURED;
                        return (
                          <button
                            key={r}
                            disabled={disabled}
                            onClick={() => setRail(r)}
                            className="flex-1 px-3 py-2 font-mono text-[11px] uppercase tracking-widest rounded-lg cursor-pointer transition border disabled:opacity-30 disabled:cursor-not-allowed"
                            style={rail === r
                              ? { backgroundColor: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' }
                              : { backgroundColor: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                          >
                            {r === 'square' ? 'Card' : 'USDC'}
                          </button>
                        );
                      })}
                    </div>

                    {rail === 'square' ? (
                      SQUARE_CONFIGURED ? (
                        <div id="square-card-mount" ref={cardMountRef} className="mb-4 min-h-[44px] rounded-lg border px-2 py-1" style={{ borderColor: 'var(--border-color)' }} />
                      ) : (
                        <p className="font-mono text-[12px] opacity-60 mb-4" style={{ color: 'var(--foreground)' }}>
                          Card payments aren&apos;t configured yet. Add your Square keys to enable them.
                        </p>
                      )
                    ) : (
                      <p className="font-mono text-[12px] opacity-60 mb-4" style={{ color: 'var(--foreground)' }}>
                        Pay {usd(totalCents)} in USDC on Base from your connected wallet.
                      </p>
                    )}
                  </>
                )}

                {message && (
                  <p className="font-mono text-[12px] mb-3" style={{ color: '#ff6b6b' }}>{message}</p>
                )}

                <button
                  onClick={selected.priceCents === 0 ? paySquare : rail === 'square' ? paySquare : payCrypto}
                  disabled={phase === 'paying' || phase === 'confirming' || (rail === 'square' && selected.priceCents > 0 && !SQUARE_CONFIGURED)}
                  className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
                >
                  {phase === 'paying' ? 'Processing…'
                    : phase === 'confirming' ? 'Confirming on-chain…'
                    : selected.priceCents === 0 ? 'Get ticket'
                    : `Pay ${usd(totalCents)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
