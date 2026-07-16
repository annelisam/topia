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

// One-per-user "finish your passport" email ledger — nudge sent at most once.
await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_nudge_sent_at" timestamp`;

const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_nudge_sent_at'`;
console.log('users.profile_nudge_sent_at present:', check.length === 1);
console.log('✅ apply-profile-nudge complete');
