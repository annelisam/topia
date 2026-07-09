// Personal connect codes — the token behind a user's QR
// (topia.vision/connect/<code>). One stable code per user, lazy-minted.
// Scanned by a host in the Check-in tab → door check-in; scanned by another
// guest (P3) → mutual connection.
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, userConnectCodes } from '@/lib/db';

// Same Crockford-ish base32 as ticket codes (no I/O/0/1) — unambiguous when
// read off a screen. 20 chars ≈ 99 bits: unguessable for a permanent token.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateConnectCode(): string {
  const bytes = randomBytes(20);
  let out = '';
  for (let i = 0; i < 20; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export async function getOrCreateConnectCode(userId: string): Promise<string> {
  const [existing] = await db
    .select({ code: userConnectCodes.code })
    .from(userConnectCodes)
    .where(eq(userConnectCodes.userId, userId))
    .limit(1);
  if (existing) return existing.code;

  const inserted = await db
    .insert(userConnectCodes)
    .values({ userId, code: generateConnectCode() })
    .onConflictDoNothing()
    .returning({ code: userConnectCodes.code });
  if (inserted.length) return inserted[0].code;

  // Unique race — another request minted between select and insert; re-select.
  const [row] = await db
    .select({ code: userConnectCodes.code })
    .from(userConnectCodes)
    .where(eq(userConnectCodes.userId, userId))
    .limit(1);
  return row!.code;
}

export async function resolveConnectCode(code: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: userConnectCodes.userId })
    .from(userConnectCodes)
    .where(eq(userConnectCodes.code, code))
    .limit(1);
  return row?.userId ?? null;
}

/** Pull a connect code out of any scanned QR value — a full
 * topia.vision/connect/<code> URL or a bare code. */
export function extractConnectCode(scanned: string): string | null {
  const m = scanned.trim().match(/\/connect\/([A-Za-z0-9]+)/);
  if (m) return m[1].toUpperCase();
  const bare = scanned.trim().toUpperCase();
  return /^[A-Z2-9]{16,32}$/.test(bare) ? bare : null;
}
