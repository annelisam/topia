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

await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stack_title" text`;

const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stack_title'`;
console.log('users.stack_title:', check.length === 1 ? 'present' : 'MISSING');
console.log('✅ apply-stack-title complete');
