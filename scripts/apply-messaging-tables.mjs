// One-off: apply the direct-message tables (conversations, conversation_members,
// messages) idempotently. The drizzle journal lags the live schema, so this
// creates just the new objects with IF NOT EXISTS. Safe to re-run.
//
//   node scripts/apply-messaging-tables.mjs
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

const statements = [
  `CREATE TABLE IF NOT EXISTS "conversations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "dm_key" text,
    "last_message_at" timestamp DEFAULT now() NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "conversations_dm_key_unique" UNIQUE("dm_key")
  )`,
  `CREATE TABLE IF NOT EXISTS "conversation_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "conversation_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "status" text DEFAULT 'accepted' NOT NULL,
    "last_read_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "conversation_id" uuid NOT NULL,
    "sender_id" uuid NOT NULL,
    "body" text,
    "image_url" text,
    "giphy_id" text,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
];

// Indexes that back the hot queries (inbox list, unread counts, thread paging).
const indexes = [
  `CREATE INDEX IF NOT EXISTS "conversation_members_user_id_idx" ON "conversation_members" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "conversation_members_conversation_id_idx" ON "conversation_members" ("conversation_id")`,
  `CREATE INDEX IF NOT EXISTS "messages_conversation_id_created_at_idx" ON "messages" ("conversation_id", "created_at")`,
];

// FK constraints — wrapped so a duplicate (already-applied) one is ignored.
const fks = [
  ['conversation_members_conversation_id_conversations_id_fk', `ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade`],
  ['conversation_members_user_id_users_id_fk', `ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade`],
  ['messages_conversation_id_conversations_id_fk', `ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade`],
  ['messages_sender_id_users_id_fk', `ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade`],
];

try {
  for (const sql of statements) await pool.query(sql);
  for (const sql of indexes) await pool.query(sql);
  for (const [name, sql] of fks) {
    await pool.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
           ${sql.replace(/'/g, "''")};
         END IF;
       END $$;`
    );
  }
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name IN ('conversations','conversation_members','messages')
     ORDER BY table_name`
  );
  console.log('Applied. Present tables:', rows.map((r) => r.table_name).join(', '));
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
