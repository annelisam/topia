// Adds the event_checkins table — the door check-in ledger for the events
// live layer (P1). One row per guest per event, written when a manager checks
// a guest in from the manage console. Idempotent: safe to run repeatedly.
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
  CREATE TABLE IF NOT EXISTS "event_checkins" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "checked_in_by" uuid,
    "created_at" timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_checkins_event_id_events_id_fk') THEN
      ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_event_id_events_id_fk"
        FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_checkins_user_id_users_id_fk') THEN
      ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_checkins_checked_in_by_users_id_fk') THEN
      ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_checked_in_by_users_id_fk"
        FOREIGN KEY ("checked_in_by") REFERENCES "users"("id");
    END IF;
  END $$
`;

await sql`CREATE INDEX IF NOT EXISTS "event_checkins_event_id_idx" ON "event_checkins" ("event_id")`;
await sql`CREATE INDEX IF NOT EXISTS "event_checkins_user_id_idx" ON "event_checkins" ("user_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "event_checkins_event_user_uniq" ON "event_checkins" ("event_id", "user_id")`;

// Verify + report
const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'event_checkins' ORDER BY ordinal_position`;
console.log('event_checkins columns:', check.map((c) => c.column_name).join(', '));
const idx = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'event_checkins'`;
console.log('event_checkins indexes:', idx.map((i) => i.indexname).join(', '));
console.log('✅ apply-event-checkins complete');
