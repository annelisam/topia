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
  CREATE TABLE IF NOT EXISTS "world_follows" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "world_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_follows_world_id_fk') THEN
      ALTER TABLE "world_follows" ADD CONSTRAINT "world_follows_world_id_fk"
        FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_follows_user_id_fk') THEN
      ALTER TABLE "world_follows" ADD CONSTRAINT "world_follows_user_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;

await sql`CREATE INDEX IF NOT EXISTS "world_follows_world_id_idx" ON "world_follows" ("world_id")`;
await sql`CREATE INDEX IF NOT EXISTS "world_follows_user_id_idx" ON "world_follows" ("user_id")`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "world_follows_world_user_uniq" ON "world_follows" ("world_id", "user_id")`;

const check = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'world_follows' ORDER BY ordinal_position`;
console.log('world_follows columns:', check.map((c) => c.column_name).join(', '));
const idx = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'world_follows' ORDER BY indexname`;
console.log('world_follows indexes:', idx.map((i) => i.indexname).join(', '));
console.log('✅ apply-world-follows complete');
