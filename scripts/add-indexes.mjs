// One-off: add performance indexes on FK/lookup columns. Safe to re-run.
//
//   node scripts/add-indexes.mjs
//
// Why a direct script instead of drizzle-kit migrate: this repo's migration
// journal has drifted from the live DB (tables were applied via `db:push`), so
// `drizzle-kit generate` emits CREATE TABLE for tables that already exist. These
// index definitions live in lib/db/schema.ts (the source of truth); this script
// just applies the matching `CREATE INDEX IF NOT EXISTS` to the live database.
// Indexes only speed up reads — they don't change data — so this is low-risk.
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// Each entry mirrors an index() in lib/db/schema.ts. IF NOT EXISTS makes the
// whole script idempotent.
const statements = [
  // Direct messages — the hot, polled path
  `CREATE INDEX IF NOT EXISTS "conversation_members_user_id_idx" ON "conversation_members" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "conversation_members_conversation_id_idx" ON "conversation_members" ("conversation_id")`,
  `CREATE INDEX IF NOT EXISTS "messages_conversation_id_created_at_idx" ON "messages" ("conversation_id","created_at")`,
  // Social graph
  `CREATE INDEX IF NOT EXISTS "follows_follower_id_idx" ON "follows" ("follower_id")`,
  `CREATE INDEX IF NOT EXISTS "follows_following_id_idx" ON "follows" ("following_id")`,
  `CREATE INDEX IF NOT EXISTS "notifications_recipient_id_created_at_idx" ON "notifications" ("recipient_id","created_at")`,
  // Worlds
  `CREATE INDEX IF NOT EXISTS "world_members_world_id_idx" ON "world_members" ("world_id")`,
  `CREATE INDEX IF NOT EXISTS "world_members_user_id_idx" ON "world_members" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "world_invitations_world_id_idx" ON "world_invitations" ("world_id")`,
  `CREATE INDEX IF NOT EXISTS "world_invitations_invitee_id_idx" ON "world_invitations" ("invitee_id")`,
  `CREATE INDEX IF NOT EXISTS "world_projects_world_id_idx" ON "world_projects" ("world_id")`,
  // Events
  `CREATE INDEX IF NOT EXISTS "event_rsvps_event_id_idx" ON "event_rsvps" ("event_id")`,
  `CREATE INDEX IF NOT EXISTS "event_rsvps_user_id_idx" ON "event_rsvps" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "event_hosts_event_id_idx" ON "event_hosts" ("event_id")`,
  `CREATE INDEX IF NOT EXISTS "event_hosts_user_id_idx" ON "event_hosts" ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "event_questions_event_id_idx" ON "event_questions" ("event_id")`,
  `CREATE INDEX IF NOT EXISTS "event_ticket_types_event_id_idx" ON "event_ticket_types" ("event_id")`,
  `CREATE INDEX IF NOT EXISTS "event_comments_event_id_idx" ON "event_comments" ("event_id")`,
  `CREATE INDEX IF NOT EXISTS "event_gallery_photos_event_id_idx" ON "event_gallery_photos" ("event_id")`,
  // Profile widgets
  `CREATE INDEX IF NOT EXISTS "guestbook_entries_profile_user_id_created_at_idx" ON "guestbook_entries" ("profile_user_id","created_at")`,
  `CREATE INDEX IF NOT EXISTS "tool_comments_tool_id_idx" ON "tool_comments" ("tool_id")`,
  `CREATE INDEX IF NOT EXISTS "reactions_target_idx" ON "reactions" ("target_type","target_id")`,
];

let ok = 0;
for (const stmt of statements) {
  const name = stmt.match(/"([^"]+_idx)"/)[1];
  try {
    await sql.query(stmt);
    ok++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}
console.log(`\nApplied ${ok}/${statements.length} indexes (IF NOT EXISTS — existing ones skipped).`);
