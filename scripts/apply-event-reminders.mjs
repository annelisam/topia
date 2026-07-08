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
  CREATE TABLE IF NOT EXISTS "event_reminders" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid NOT NULL,
    "kind" text NOT NULL,
    "recipients" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_reminders_event_id_fk') THEN
      ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_event_id_fk"
        FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`CREATE INDEX IF NOT EXISTS "event_reminders_event_id_idx" ON "event_reminders" ("event_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "event_reminders_event_kind_uniq" ON "event_reminders" ("event_id", "kind")`;

const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'event_reminders' ORDER BY ordinal_position`;
console.log('event_reminders columns:', check.map((c) => c.column_name).join(', '));
const idx = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'event_reminders' ORDER BY indexname`;
console.log('event_reminders indexes:', idx.map((i) => i.indexname).join(', '));
console.log('✅ apply-event-reminders complete');
