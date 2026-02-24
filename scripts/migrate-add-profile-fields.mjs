/**
 * Migration: add role_tags and tool_slugs columns to users table
 * Run: node scripts/migrate-add-profile-fields.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = join(__dirname, '..', '.env.local');
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) {
    process.env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
  }
}

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!dbUrl) {
  console.error('No DATABASE_URL or POSTGRES_URL found in .env.local');
  process.exit(1);
}

const { neon } = await import('@neondatabase/serverless');
const sql = neon(dbUrl);

async function migrate() {
  console.log('Running migration: add role_tags, tool_slugs to users…');

  // Add role_tags if not exists
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role_tags text
  `;
  console.log('  ✓ role_tags column ready');

  // Add tool_slugs if not exists
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS tool_slugs text
  `;
  console.log('  ✓ tool_slugs column ready');

  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
