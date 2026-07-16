import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// load .env.local manually (scripts don't get Next's env loading)
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=["']?(.*?)["']?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// Prize tiers: 'raffle' (existing behavior, the default so every legacy row
// keeps meaning exactly what it meant) | 'everyone' | 'first_n'.
await sql`ALTER TABLE "event_prizes" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'raffle' NOT NULL`;
await sql`ALTER TABLE "event_prizes" ADD COLUMN IF NOT EXISTS "threshold" integer`;

// Verify + report
const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'event_prizes' ORDER BY ordinal_position`;
console.log('event_prizes columns:', check.map((c) => c.column_name).join(', '));
console.log('✅ apply-prize-tiers complete');
