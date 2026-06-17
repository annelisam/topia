// One-off idempotent apply for the event_invites table. Safe to re-run.
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

const fkEvent = 'event_invites_event_id_events_id_fk';
const fkInviter = 'event_invites_invited_by_users_id_fk';
const fkAccepted = 'event_invites_accepted_by_user_id_users_id_fk';

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS "event_invites" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "email" text,
    "phone" text,
    "invited_by" uuid,
    "token" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "accepted_by_user_id" uuid,
    "sent" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "event_invites_token_unique" UNIQUE("token")
  )`);

  const fks = [
    [fkEvent, `ALTER TABLE "event_invites" ADD CONSTRAINT "${fkEvent}" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade`],
    [fkInviter, `ALTER TABLE "event_invites" ADD CONSTRAINT "${fkInviter}" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id")`],
    [fkAccepted, `ALTER TABLE "event_invites" ADD CONSTRAINT "${fkAccepted}" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id")`],
  ];
  for (const [name, sql] of fks) {
    await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN ${sql}; END IF; END $$;`);
  }
  const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name='event_invites'`);
  console.log('event_invites table:', rows.length ? 'present' : 'MISSING');
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
