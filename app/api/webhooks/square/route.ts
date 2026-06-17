import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { WebhooksHelper } from 'square';
import { db, ticketOrders } from '@/lib/db';
import { SQUARE_WEBHOOK_SIGNATURE_KEY } from '@/lib/square';
import { fulfillOrder, failOrder } from '@/lib/payments/tickets';

// Square calls this URL on payment lifecycle events. It is the source of truth
// for finalizing orders: the checkout route fulfills synchronously when a card
// completes inline, but the webhook guarantees fulfillment even if that
// response is lost. fulfillOrder() is idempotent, so both firing is safe.
//
// Configure the endpoint + signature key in the Square dashboard:
//   Developer → your app → Webhooks → Subscriptions
//   URL: https://<your-domain>/api/webhooks/square
//   Events: payment.created, payment.updated
//   Then set SQUARE_WEBHOOK_SIGNATURE_KEY and SQUARE_WEBHOOK_URL in env.
export async function POST(request: NextRequest) {
  try {
    const body = await request.text(); // raw body required for signature check
    const signature = request.headers.get('x-square-hmacsha256-signature') ?? '';

    // Square signs over (notificationUrl + body). Prefer an explicit env URL so
    // it matches exactly what's registered in the dashboard (proxies can rewrite
    // request.url).
    const notificationUrl = process.env.SQUARE_WEBHOOK_URL || request.url;

    if (SQUARE_WEBHOOK_SIGNATURE_KEY) {
      const valid = await WebhooksHelper.verifySignature({
        requestBody: body,
        signatureHeader: signature,
        signatureKey: SQUARE_WEBHOOK_SIGNATURE_KEY,
        notificationUrl,
      });
      if (!valid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not set — skipping signature verification');
    }

    const event = JSON.parse(body);
    const type: string = event?.type ?? '';

    if (type.startsWith('payment.')) {
      const payment = event?.data?.object?.payment;
      const orderId: string | undefined = payment?.reference_id;
      const status: string | undefined = payment?.status;

      if (orderId) {
        // Only act on orders we own (reference_id is our order UUID).
        const [order] = await db
          .select({ id: ticketOrders.id, status: ticketOrders.status })
          .from(ticketOrders)
          .where(eq(ticketOrders.id, orderId));

        if (order) {
          if (status === 'COMPLETED' || status === 'APPROVED') {
            await fulfillOrder(orderId, { squarePaymentId: payment?.id });
          } else if (status === 'FAILED' || status === 'CANCELED') {
            if (order.status === 'pending') await failOrder(orderId);
          }
        }
      }
    }

    // Always 200 quickly so Square doesn't retry on our processing hiccups.
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('POST webhooks/square:', error);
    // Still 200 — a 500 makes Square retry; log and move on. Reconciliation can
    // re-run fulfillment for any pending order with a COMPLETED Square payment.
    return NextResponse.json({ received: true });
  }
}
