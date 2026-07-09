// Adds the user_connect_codes table — one stable QR token per user, used for
// door check-in scanning (P1.5) and attendee-to-attendee connections (P3).
// Deliberately its own table rather than a users column. Idempotent.
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

await sql`
  CREATE TABLE IF NOT EXISTS "user_connect_codes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "code" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_connect_codes_user_id_users_id_fk') THEN
      ALTER TABLE "user_connect_codes" ADD CONSTRAINT "user_connect_codes_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`CREATE UNIQUE INDEX IF NOT EXISTS "user_connect_codes_user_id_uniq" ON "user_connect_codes" ("user_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "user_connect_codes_code_uniq" ON "user_connect_codes" ("code")`;

// Verify + report
const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'user_connect_codes' ORDER BY ordinal_position`;
console.log('user_connect_codes columns:', check.map((c) => c.column_name).join(', '));
const idx = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'user_connect_codes'`;
console.log('user_connect_codes indexes:', idx.map((i) => i.indexname).join(', '));
console.log('✅ apply-connect-codes complete');
