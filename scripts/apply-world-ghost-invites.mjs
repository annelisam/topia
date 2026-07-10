// Ghost collaborator invites (W4): world_invitations learns email/name/token
// and invitee_id becomes nullable so people who aren't on Topia yet can be
// credited immediately and claim by email. Idempotent.
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

await sql`ALTER TABLE "world_invitations" ALTER COLUMN "invitee_id" DROP NOT NULL`;
await sql`ALTER TABLE "world_invitations" ADD COLUMN IF NOT EXISTS "email" text`;
await sql`ALTER TABLE "world_invitations" ADD COLUMN IF NOT EXISTS "name" text`;
await sql`ALTER TABLE "world_invitations" ADD COLUMN IF NOT EXISTS "token" text`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS "world_invitations_token_uniq" ON "world_invitations" ("token")`;

// Verify + report
const cols = await sql`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'world_invitations' ORDER BY ordinal_position`;
console.log('world_invitations:', cols.map((c) => `${c.column_name}${c.is_nullable === 'YES' ? '?' : ''}`).join(', '));
console.log('✅ apply-world-ghost-invites complete');
