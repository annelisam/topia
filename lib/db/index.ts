import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

// Create the drizzle instance
export const db = drizzle(sql, { schema });

// Export schema for use in queries
export * from './schema';
