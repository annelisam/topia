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

// Connected In Process accounts — encrypted artist API keys, one per user.
await sql`
  CREATE TABLE IF NOT EXISTS "in_process_accounts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL UNIQUE,
    "artist_address" text NOT NULL,
    "api_key_encrypted" text NOT NULL,
    "key_name" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'in_process_accounts_user_id_fk') THEN
      ALTER TABLE "in_process_accounts" ADD CONSTRAINT "in_process_accounts_user_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'in_process_accounts' ORDER BY ordinal_position`;
console.log('in_process_accounts:', check.map((c) => c.column_name).join(', '));
console.log('✅ apply-in-process-accounts complete');
