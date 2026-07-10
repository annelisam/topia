// Adds the world_posts table — the world forum (W3 of the worlds plan).
// Idempotent: safe to run repeatedly.
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
  CREATE TABLE IF NOT EXISTS "world_posts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "world_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "body" text,
    "image_url" text,
    "giphy_id" text,
    "category" text,
    "pinned" boolean DEFAULT false NOT NULL,
    "parent_id" uuid,
    "created_at" timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_posts_world_id_worlds_id_fk') THEN
      ALTER TABLE "world_posts" ADD CONSTRAINT "world_posts_world_id_worlds_id_fk"
        FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_posts_user_id_users_id_fk') THEN
      ALTER TABLE "world_posts" ADD CONSTRAINT "world_posts_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`CREATE INDEX IF NOT EXISTS "world_posts_world_id_idx" ON "world_posts" ("world_id")`;
await sql`CREATE INDEX IF NOT EXISTS "world_posts_parent_id_idx" ON "world_posts" ("parent_id")`;

// Verify + report
const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'world_posts' ORDER BY ordinal_position`;
console.log('world_posts columns:', check.map((c) => c.column_name).join(', '));
const idx = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'world_posts'`;
console.log('world_posts indexes:', idx.map((i) => i.indexname).join(', '));
console.log('✅ apply-world-posts complete');
