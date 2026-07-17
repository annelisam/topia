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

// First-run walkthrough ledger: which spotlight tours a user has completed or
// skipped ('inprocess' | 'world-hq' | 'profile'). Server-side so it follows
// the account across devices; default [] means every existing user sees each
// tour exactly once after this ships.
await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tours_seen" jsonb DEFAULT '[]'::jsonb NOT NULL`;

const check = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tours_seen'`;
console.log('users.tours_seen present:', check.length === 1, check[0]?.data_type ?? '');
console.log('✅ apply-tours-seen complete');
