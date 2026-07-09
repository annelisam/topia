// Adds the event_connections table — the "met at" ledger behind QR
// attendee-to-attendee connections (P3 of the events live layer). Idempotent.
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
  CREATE TABLE IF NOT EXISTS "event_connections" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid,
    "user_a_id" uuid NOT NULL,
    "user_b_id" uuid NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_connections_event_id_events_id_fk') THEN
      ALTER TABLE "event_connections" ADD CONSTRAINT "event_connections_event_id_events_id_fk"
        FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL;
    END IF;
  END $$
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_connections_user_a_id_users_id_fk') THEN
      ALTER TABLE "event_connections" ADD CONSTRAINT "event_connections_user_a_id_users_id_fk"
        FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_connections_user_b_id_users_id_fk') THEN
      ALTER TABLE "event_connections" ADD CONSTRAINT "event_connections_user_b_id_users_id_fk"
        FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`CREATE INDEX IF NOT EXISTS "event_connections_event_id_idx" ON "event_connections" ("event_id")`;
await sql`CREATE INDEX IF NOT EXISTS "event_connections_user_a_idx" ON "event_connections" ("user_a_id")`;
await sql`CREATE INDEX IF NOT EXISTS "event_connections_user_b_idx" ON "event_connections" ("user_b_id")`;
// One row per pair per event context; NULL event collapses to the zero uuid
// so "met outside an event" is also deduped.
await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS "event_connections_pair_event_uniq"
  ON "event_connections" ("user_a_id", "user_b_id", COALESCE("event_id", '00000000-0000-0000-0000-000000000000'::uuid))
`;

// Verify + report
const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'event_connections' ORDER BY ordinal_position`;
console.log('event_connections columns:', check.map((c) => c.column_name).join(', '));
const idx = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'event_connections'`;
console.log('event_connections indexes:', idx.map((i) => i.indexname).join(', '));
console.log('✅ apply-event-connections complete');
