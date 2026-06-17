// Ticket issuance — the single place an order turns into admissions. Both the
// Square webhook and the crypto confirm endpoint call fulfillOrder(); it is
// idempotent so duplicate calls (webhook retries, double confirms) never
// double-issue tickets or over-count quantitySold.
import { randomBytes } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db, tickets, ticketOrders, eventTicketTypes } from '@/lib/db';

// Crockford-ish base32 (no I/O/0/1) — unambiguous when read off a screen/QR.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateTicketCode(): string {
  const bytes = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `TPA-${out.slice(0, 5)}-${out.slice(5)}`;
}

export type FulfillResult = {
  orderId: string;
  ticketCount: number;
  alreadyFulfilled: boolean;
};

/**
 * Mark a pending order paid, issue one ticket per unit, and increment the
 * tier's quantitySold — atomically. If the order is already 'paid' this is a
 * no-op that reports the existing ticket count.
 *
 * @param paymentRef rail-specific fields to stamp on the order when it flips to paid
 */
export async function fulfillOrder(
  orderId: string,
  paymentRef?: Partial<{
    squarePaymentId: string;
    squareOrderId: string;
    txHash: string;
    payerWalletAddress: string;
  }>,
): Promise<FulfillResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(ticketOrders)
      .where(eq(ticketOrders.id, orderId));

    if (!order) throw new Error(`Order ${orderId} not found`);

    if (order.status === 'paid') {
      const existing = await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(eq(tickets.orderId, orderId));
      return { orderId, ticketCount: existing.length, alreadyFulfilled: true };
    }

    const rows = Array.from({ length: order.quantity }, () => ({
      orderId: order.id,
      eventId: order.eventId,
      ticketTypeId: order.ticketTypeId,
      ownerId: order.buyerId,
      code: generateTicketCode(),
    }));
    await tx.insert(tickets).values(rows);

    await tx
      .update(ticketOrders)
      .set({ status: 'paid', updatedAt: new Date(), ...(paymentRef ?? {}) })
      .where(eq(ticketOrders.id, orderId));

    await tx
      .update(eventTicketTypes)
      .set({ quantitySold: sql`${eventTicketTypes.quantitySold} + ${order.quantity}` })
      .where(eq(eventTicketTypes.id, order.ticketTypeId));

    return { orderId, ticketCount: rows.length, alreadyFulfilled: false };
  });
}

/** Mark a pending order failed/cancelled (e.g. declined card, abandoned). */
export async function failOrder(orderId: string, status: 'failed' | 'cancelled' = 'failed') {
  await db
    .update(ticketOrders)
    .set({ status, updatedAt: new Date() })
    .where(eq(ticketOrders.id, orderId));
}
