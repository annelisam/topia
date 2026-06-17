// One-off idempotent apply for the RSVP-questions feature: event_questions
// table, event_rsvps.responses, and events RSVP settings columns. Safe to re-run.
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

const statements = [
  `CREATE TABLE IF NOT EXISTS "event_questions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "label" text NOT NULL,
    "type" text DEFAULT 'short_text' NOT NULL,
    "options" jsonb,
    "required" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "responses" jsonb`,
  `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rsvp_capacity" integer`,
  `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rsvp_approval_required" boolean DEFAULT false NOT NULL`,
  `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rsvp_closed" boolean DEFAULT false NOT NULL`,
];

const fkName = 'event_questions_event_id_events_id_fk';

try {
  for (const sql of statements) await pool.query(sql);
  await pool.query(
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${fkName}') THEN
         ALTER TABLE "event_questions" ADD CONSTRAINT "${fkName}" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade;
       END IF;
     END $$;`
  );
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='events' AND column_name IN ('rsvp_capacity','rsvp_approval_required','rsvp_closed')
     ORDER BY column_name`
  );
  const { rows: t } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name='event_questions'`
  );
  console.log('events settings cols:', rows.map((r) => r.column_name).join(', '));
  console.log('event_questions table:', t.length ? 'present' : 'MISSING');
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
