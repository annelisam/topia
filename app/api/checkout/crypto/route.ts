import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, events, users, ticketOrders } from '@/lib/db';
import { createPendingOrder } from '@/lib/payments/orders';
import { fulfillOrder, failOrder } from '@/lib/payments/tickets';
import {
  centsToUsdcBaseUnits,
  CRYPTO_CHAIN_ID,
  USDC_ADDRESS,
  USDC_DECIMALS,
  PLATFORM_RECIPIENT_WALLET,
  formatUsd,
} from '@/lib/payments/config';

// POST /api/checkout/crypto
// Body: { privyId, ticketTypeId, quantity, buyerEmail? }
// Creates a pending order and returns the on-chain transfer the buyer's wallet
// must make (USDC → host wallet). The browser sends the tx via the Privy wallet,
// then calls /api/checkout/crypto/confirm with the resulting txHash.
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { privyId, ticketTypeId, quantity, buyerEmail } = data;

    const result = await createPendingOrder({
      privyId,
      ticketTypeId,
      quantity: Number(quantity) || 1,
      rail: 'crypto',
      buyerEmail,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    const { order } = result;

    // Free tier → issue immediately, no on-chain payment.
    if (order.amountCents === 0) {
      const f = await fulfillOrder(order.id);
      return NextResponse.json({ ok: true, orderId: order.id, ticketCount: f.ticketCount, free: true });
    }

    // Resolve the payout wallet: the event host's wallet, else platform fallback.
    let recipient: string | null = PLATFORM_RECIPIENT_WALLET;
    const [ev] = await db
      .select({ createdBy: events.createdBy })
      .from(events)
      .where(eq(events.id, order.eventId));
    if (ev?.createdBy) {
      const [host] = await db
        .select({ wallet: users.walletAddress })
        .from(users)
        .where(eq(users.id, ev.createdBy));
      if (host?.wallet) recipient = host.wallet;
    }

    if (!recipient) {
      await failOrder(order.id, 'cancelled');
      return NextResponse.json(
        { error: 'This event cannot accept crypto yet — the host has no payout wallet.' },
        { status: 400 },
      );
    }

    const amountBaseUnits = centsToUsdcBaseUnits(order.amountCents);

    await db
      .update(ticketOrders)
      .set({ recipientWalletAddress: recipient, chainId: CRYPTO_CHAIN_ID, updatedAt: new Date() })
      .where(eq(ticketOrders.id, order.id));

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      payment: {
        chainId: CRYPTO_CHAIN_ID,
        token: USDC_ADDRESS[CRYPTO_CHAIN_ID],
        tokenDecimals: USDC_DECIMALS,
        tokenSymbol: 'USDC',
        recipient,
        amountBaseUnits: amountBaseUnits.toString(), // string: JSON can't carry bigint
        amountUsd: formatUsd(order.amountCents),
      },
    });
  } catch (error) {
    console.error('POST checkout/crypto:', error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
