import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { SquareError } from 'square';
import { db, ticketOrders } from '@/lib/db';
import { squareClient, SQUARE_LOCATION_ID, isSquareConfigured } from '@/lib/square';
import { createPendingOrder } from '@/lib/payments/orders';
import { fulfillOrder, failOrder } from '@/lib/payments/tickets';

// POST /api/checkout/square
// Body: { privyId, ticketTypeId, quantity, sourceId, verificationToken?, buyerEmail? }
// `sourceId` is the card nonce produced by the Web Payments SDK in the browser.
export async function POST(request: NextRequest) {
  try {
    if (!isSquareConfigured()) {
      return NextResponse.json({ error: 'Card payments are not configured' }, { status: 503 });
    }

    const data = await request.json();
    const { privyId, ticketTypeId, quantity, sourceId, verificationToken, buyerEmail } = data;

    // Create + validate the pending order first (price is snapshotted server-side).
    const result = await createPendingOrder({
      privyId,
      ticketTypeId,
      quantity: Number(quantity) || 1,
      rail: 'square',
      buyerEmail,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    const { order } = result;

    // Free tier → no charge, issue immediately.
    if (order.amountCents === 0) {
      const f = await fulfillOrder(order.id);
      return NextResponse.json({ ok: true, orderId: order.id, ticketCount: f.ticketCount, free: true });
    }

    if (!sourceId) {
      await failOrder(order.id, 'cancelled');
      return NextResponse.json({ error: 'Missing card payment token' }, { status: 400 });
    }

    try {
      const resp = await squareClient.payments.create({
        sourceId,
        idempotencyKey: order.id, // one charge per order, safe under retries
        amountMoney: {
          amount: BigInt(order.amountCents),
          currency: order.currency as 'USD',
        },
        locationId: SQUARE_LOCATION_ID,
        referenceId: order.id,
        note: `Topia ticket order ${order.id}`,
        buyerEmailAddress: order.buyerEmail ?? undefined,
        verificationToken: verificationToken ?? undefined,
      });

      const payment = resp.payment;
      const status = payment?.status; // COMPLETED | APPROVED | PENDING | FAILED ...

      // Record the Square payment id regardless of outcome for reconciliation.
      await db
        .update(ticketOrders)
        .set({ squarePaymentId: payment?.id ?? null, squareOrderId: payment?.orderId ?? null, updatedAt: new Date() })
        .where(eq(ticketOrders.id, order.id));

      if (status === 'COMPLETED' || status === 'APPROVED') {
        const f = await fulfillOrder(order.id, {
          squarePaymentId: payment?.id,
          squareOrderId: payment?.orderId,
        });
        return NextResponse.json({
          ok: true,
          orderId: order.id,
          paymentId: payment?.id,
          ticketCount: f.ticketCount,
        });
      }

      // Still settling (rare for card) — the webhook will finalize it.
      return NextResponse.json({ ok: true, pending: true, orderId: order.id, paymentId: payment?.id });
    } catch (err) {
      await failOrder(order.id);
      const message =
        err instanceof SquareError
          ? err.errors?.[0]?.detail ?? err.message
          : 'Payment failed';
      return NextResponse.json({ error: message, orderId: order.id }, { status: 402 });
    }
  } catch (error) {
    console.error('POST checkout/square:', error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
