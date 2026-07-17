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

// Round 2: real era dates (with precision: day | month | year) + native
// process-log posts.
await sql`ALTER TABLE "world_eras" ADD COLUMN IF NOT EXISTS "start_date" date`;
await sql`ALTER TABLE "world_eras" ADD COLUMN IF NOT EXISTS "end_date" date`;
await sql`ALTER TABLE "world_eras" ADD COLUMN IF NOT EXISTS "start_precision" text`;
await sql`ALTER TABLE "world_eras" ADD COLUMN IF NOT EXISTS "end_precision" text`;

await sql`
  CREATE TABLE IF NOT EXISTS "era_process_posts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "era_id" uuid NOT NULL,
    "author_user_id" uuid NOT NULL,
    "title" text NOT NULL,
    "body" text,
    "image_url" text,
    "minted_url" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'era_process_posts_era_id_fk') THEN
      ALTER TABLE "era_process_posts" ADD CONSTRAINT "era_process_posts_era_id_fk"
        FOREIGN KEY ("era_id") REFERENCES "world_eras"("id") ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'era_process_posts_author_user_id_fk') THEN
      ALTER TABLE "era_process_posts" ADD CONSTRAINT "era_process_posts_author_user_id_fk"
        FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;
await sql`CREATE INDEX IF NOT EXISTS "era_process_posts_era_id_idx" ON "era_process_posts" ("era_id")`;

const eras = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'world_eras' AND column_name IN ('start_date','end_date')`;
const posts = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'era_process_posts' ORDER BY ordinal_position`;
console.log('world_eras date cols:', eras.map((c) => c.column_name).join(', '));
console.log('era_process_posts:', posts.map((c) => c.column_name).join(', '));
console.log('✅ apply-in-process-round2 complete');
