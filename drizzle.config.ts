import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env.local for drizzle-kit (Next.js loads it automatically, drizzle-kit does not)
config({ path: '.env.local' });

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  },
} satisfies Config;
