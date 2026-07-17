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

// Round 3: roadmaps belong to projects.
await sql`ALTER TABLE "world_eras" ADD COLUMN IF NOT EXISTS "project_id" uuid`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_eras_project_id_fk') THEN
      ALTER TABLE "world_eras" ADD CONSTRAINT "world_eras_project_id_fk"
        FOREIGN KEY ("project_id") REFERENCES "world_projects"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;
await sql`CREATE INDEX IF NOT EXISTS "world_eras_project_id_idx" ON "world_eras" ("project_id")`;

const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'world_eras' AND column_name = 'project_id'`;
console.log('world_eras.project_id present:', check.length === 1);
console.log('✅ apply-in-process-round3 complete');
