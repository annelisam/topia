import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

// Create Neon connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the drizzle instance
export const db = drizzle(pool, { schema });

// Export schema for use in queries
export * from './schema';
