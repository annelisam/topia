// Adds the quest tables — event_quests, event_quest_completions,
// event_prizes (P4 of the events live layer). Idempotent.
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
  CREATE TABLE IF NOT EXISTS "event_quests" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "icon" text,
    "verify_method" text DEFAULT 'qr' NOT NULL,
    "code" text,
    "rule" jsonb,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS "event_quest_completions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "quest_id" uuid NOT NULL,
    "event_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "verified_by" uuid,
    "created_at" timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS "event_prizes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "image_url" text,
    "sort_order" integer DEFAULT 0,
    "raffle_winner_user_id" uuid,
    "drawn_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`;

const fks = [
  ['event_quests', 'event_quests_event_id_events_id_fk', 'FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE'],
  ['event_quest_completions', 'event_quest_completions_quest_id_fk', 'FOREIGN KEY ("quest_id") REFERENCES "event_quests"("id") ON DELETE CASCADE'],
  ['event_quest_completions', 'event_quest_completions_event_id_fk', 'FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE'],
  ['event_quest_completions', 'event_quest_completions_user_id_fk', 'FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE'],
  ['event_quest_completions', 'event_quest_completions_verified_by_fk', 'FOREIGN KEY ("verified_by") REFERENCES "users"("id")'],
  ['event_prizes', 'event_prizes_event_id_events_id_fk', 'FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE'],
  ['event_prizes', 'event_prizes_winner_users_id_fk', 'FOREIGN KEY ("raffle_winner_user_id") REFERENCES "users"("id")'],
];
for (const [table, name, def] of fks) {
  await sql.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
        ALTER TABLE "${table}" ADD CONSTRAINT "${name}" ${def};
      END IF;
    END $$
  `);
}

await sql`CREATE INDEX IF NOT EXISTS "event_quests_event_id_idx" ON "event_quests" ("event_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "event_quests_code_uniq" ON "event_quests" ("code")`;
await sql`CREATE INDEX IF NOT EXISTS "event_quest_completions_quest_id_idx" ON "event_quest_completions" ("quest_id")`;
await sql`CREATE INDEX IF NOT EXISTS "event_quest_completions_event_id_idx" ON "event_quest_completions" ("event_id")`;
await sql`CREATE INDEX IF NOT EXISTS "event_quest_completions_user_id_idx" ON "event_quest_completions" ("user_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "event_quest_completions_quest_user_uniq" ON "event_quest_completions" ("quest_id", "user_id")`;
await sql`CREATE INDEX IF NOT EXISTS "event_prizes_event_id_idx" ON "event_prizes" ("event_id")`;

// Verify + report
for (const t of ['event_quests', 'event_quest_completions', 'event_prizes']) {
  const cols = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}' ORDER BY ordinal_position`);
  console.log(`${t}:`, cols.map((c) => c.column_name).join(', '));
}
console.log('✅ apply-event-quests complete');
