// One-off idempotent apply for the world Overview activity feed: adds the
// world_announcements table. Safe to re-run.
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

const statements = [
  `CREATE TABLE IF NOT EXISTS "world_announcements" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "world_id" uuid NOT NULL,
    "author_id" uuid NOT NULL,
    "body" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "world_announcements_world_id_idx" ON "world_announcements" ("world_id")`,
];

const fks = [
  { name: 'world_announcements_world_id_worlds_id_fk', sql: `ALTER TABLE "world_announcements" ADD CONSTRAINT "world_announcements_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade` },
  { name: 'world_announcements_author_id_users_id_fk', sql: `ALTER TABLE "world_announcements" ADD CONSTRAINT "world_announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id")` },
];

try {
  for (const sql of statements) await pool.query(sql);
  for (const fk of fks) {
    await pool.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${fk.name}') THEN
           ${fk.sql};
         END IF;
       END $$;`
    );
  }
  const { rows: t } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name='world_announcements'`
  );
  console.log('world_announcements table:', t.length ? 'present' : 'MISSING');
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
