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

// Per-user notification preference: opt OUT of the daily unread-DM digest.
// Default false = everyone receives it (once DM_DIGEST_ENABLED turns the
// feature on) unless they flip the toggle or click unsubscribe.
await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dm_digest_opt_out" boolean DEFAULT false NOT NULL`;

const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'dm_digest_opt_out'`;
console.log('users.dm_digest_opt_out present:', check.length === 1);
console.log('✅ apply-notification-prefs complete');
