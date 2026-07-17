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

// In Process roadmaps: world eras + milestones, and passport life chapters.
// Funding columns on milestones are dormant (future phase) — never rendered.
await sql`
  CREATE TABLE IF NOT EXISTS "world_eras" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "world_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "start_label" text,
    "end_label" text,
    "status" text DEFAULT 'active' NOT NULL,
    "in_process_url" text,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_eras_world_id_fk') THEN
      ALTER TABLE "world_eras" ADD CONSTRAINT "world_eras_world_id_fk"
        FOREIGN KEY ("world_id") REFERENCES "worlds"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;
await sql`CREATE INDEX IF NOT EXISTS "world_eras_world_id_idx" ON "world_eras" ("world_id")`;

await sql`
  CREATE TABLE IF NOT EXISTS "era_milestones" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "era_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "date_label" text,
    "status" text DEFAULT 'upcoming' NOT NULL,
    "image_url" text,
    "goal_cents" integer,
    "raised_cents" integer,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'era_milestones_era_id_fk') THEN
      ALTER TABLE "era_milestones" ADD CONSTRAINT "era_milestones_era_id_fk"
        FOREIGN KEY ("era_id") REFERENCES "world_eras"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;
await sql`CREATE INDEX IF NOT EXISTS "era_milestones_era_id_idx" ON "era_milestones" ("era_id")`;

await sql`
  CREATE TABLE IF NOT EXISTS "life_chapters" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "title" text NOT NULL,
    "subtitle" text,
    "date_label" text,
    "status" text DEFAULT 'planned' NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'life_chapters_user_id_fk') THEN
      ALTER TABLE "life_chapters" ADD CONSTRAINT "life_chapters_user_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    END IF;
  END $$
`;
await sql`CREATE INDEX IF NOT EXISTS "life_chapters_user_id_idx" ON "life_chapters" ("user_id")`;

// Verify + report
for (const t of ['world_eras', 'era_milestones', 'life_chapters']) {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${t} ORDER BY ordinal_position`;
  console.log(`${t}:`, cols.map((c) => c.column_name).join(', '));
}
console.log('✅ apply-in-process complete');
