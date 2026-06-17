import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import {
  createPublicClient,
  http,
  decodeEventLog,
  getAddress,
  parseAbi,
  type Hex,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { db, ticketOrders, users } from '@/lib/db';
import { fulfillOrder } from '@/lib/payments/tickets';
import { BASE_CHAIN_ID, USDC_ADDRESS } from '@/lib/payments/config';

const ERC20_TRANSFER_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

function publicClient(chainId: number) {
  const chain = chainId === BASE_CHAIN_ID ? base : baseSepolia;
  // Optional custom RPC; viem falls back to the chain's public endpoint.
  const rpc = chainId === BASE_CHAIN_ID ? process.env.BASE_RPC_URL : process.env.BASE_SEPOLIA_RPC_URL;
  return createPublicClient({ chain, transport: http(rpc || undefined) });
}

// POST /api/checkout/crypto/confirm
// Body: { privyId, orderId, txHash }
// Verifies on-chain that `txHash` transferred ≥ the owed USDC to the order's
// recipient wallet, then issues tickets. Idempotent via fulfillOrder().
export async function POST(request: NextRequest) {
  try {
    const { privyId, orderId, txHash } = await request.json();
    if (!privyId || !orderId || !txHash) {
      return NextResponse.json({ error: 'Missing privyId, orderId or txHash' }, { status: 400 });
    }

    const [buyer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    if (!buyer) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [order] = await db.select().from(ticketOrders).where(eq(ticketOrders.id, orderId));
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.buyerId !== buyer.id) return NextResponse.json({ error: 'Not your order' }, { status: 403 });
    if (order.rail !== 'crypto') return NextResponse.json({ error: 'Not a crypto order' }, { status: 400 });

    // Already done? Report success idempotently.
    if (order.status === 'paid') {
      return NextResponse.json({ ok: true, orderId, alreadyConfirmed: true });
    }
    if (!order.recipientWalletAddress || !order.chainId) {
      return NextResponse.json({ error: 'Order is missing payment parameters' }, { status: 400 });
    }

    // Reject a txHash already credited to a different order (replay/reuse).
    const [dupe] = await db
      .select({ id: ticketOrders.id })
      .from(ticketOrders)
      .where(and(eq(ticketOrders.txHash, txHash as string), ne(ticketOrders.id, orderId)));
    if (dupe) return NextResponse.json({ error: 'This transaction was already used' }, { status: 409 });

    const client = publicClient(order.chainId);
    const usdc = USDC_ADDRESS[order.chainId];
    const recipient = getAddress(order.recipientWalletAddress);
    const owed = BigInt(/* base units */ order.amountCents) * BigInt(10) ** BigInt(4); // cents→6dp USDC

    let receipt;
    try {
      receipt = await client.getTransactionReceipt({ hash: txHash as Hex });
    } catch {
      // Not mined yet (or unknown hash) — caller can retry shortly.
      return NextResponse.json({ ok: false, pending: true, error: 'Transaction not found yet' }, { status: 202 });
    }

    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
    }

    // Sum USDC transfers to the recipient within this tx.
    let paid = BigInt(0);
    for (const log of receipt.logs) {
      if (getAddress(log.address) !== getAddress(usdc)) continue;
      try {
        const decoded = decodeEventLog({ abi: ERC20_TRANSFER_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'Transfer' && getAddress(decoded.args.to) === recipient) {
          paid += decoded.args.value;
        }
      } catch {
        // Non-Transfer log on the USDC contract — ignore.
      }
    }

    if (paid < owed) {
      return NextResponse.json(
        { error: `Underpaid: received ${paid.toString()} of ${owed.toString()} USDC base units` },
        { status: 400 },
      );
    }

    const payer = receipt.from ? getAddress(receipt.from) : undefined;
    const f = await fulfillOrder(orderId, { txHash: txHash as string, payerWalletAddress: payer });

    return NextResponse.json({ ok: true, orderId, ticketCount: f.ticketCount });
  } catch (error) {
    console.error('POST checkout/crypto/confirm:', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}
