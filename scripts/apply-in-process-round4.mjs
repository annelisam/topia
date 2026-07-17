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

// Round 4: process-log posts can attach to a milestone (the timeline node
// the update belongs to). SET NULL on milestone delete — the post survives.
await sql`ALTER TABLE "era_process_posts" ADD COLUMN IF NOT EXISTS "milestone_id" uuid`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'era_process_posts_milestone_id_fk') THEN
      ALTER TABLE "era_process_posts" ADD CONSTRAINT "era_process_posts_milestone_id_fk"
        FOREIGN KEY ("milestone_id") REFERENCES "era_milestones"("id") ON DELETE SET NULL;
    END IF;
  END $$
`;
await sql`CREATE INDEX IF NOT EXISTS "era_process_posts_milestone_id_idx" ON "era_process_posts" ("milestone_id")`;

const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'era_process_posts' AND column_name = 'milestone_id'`;
console.log('era_process_posts.milestone_id present:', check.length === 1);
console.log('✅ apply-in-process-round4 complete');
