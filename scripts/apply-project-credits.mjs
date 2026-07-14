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

// Project credits — who made a project, with a free-text role.
await sql`
  CREATE TABLE IF NOT EXISTS "project_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_members_project_id_fk') THEN
      ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fk"
        FOREIGN KEY ("project_id") REFERENCES "world_projects"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_members_user_id_fk') THEN
      ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`CREATE INDEX IF NOT EXISTS "project_members_project_id_idx" ON "project_members" ("project_id")`;
await sql`CREATE INDEX IF NOT EXISTS "project_members_user_id_idx" ON "project_members" ("user_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "project_members_project_user_uniq" ON "project_members" ("project_id", "user_id")`;

// Verify + report
const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'project_members' ORDER BY ordinal_position`;
console.log('project_members columns:', check.map((c) => c.column_name).join(', '));
const idx = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'project_members'`;
console.log('project_members indexes:', idx.map((i) => i.indexname).join(', '));
console.log('✅ apply-project-credits complete');
