// One-off: apply only the ticketing tables (event_ticket_types, ticket_orders,
// tickets) to the DB. The drizzle migration journal is behind the live schema,
// so `drizzle-kit migrate` tries to recreate existing tables. This applies just
// the new objects idempotently. Safe to re-run.
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

const statements = [
  `CREATE TABLE IF NOT EXISTS "event_ticket_types" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "currency" text DEFAULT 'USD' NOT NULL,
    "quantity_total" integer,
    "quantity_sold" integer DEFAULT 0 NOT NULL,
    "max_per_order" integer DEFAULT 10,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "ticket_orders" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "event_id" uuid NOT NULL,
    "ticket_type_id" uuid NOT NULL,
    "buyer_id" uuid NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price_cents" integer NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" text DEFAULT 'USD' NOT NULL,
    "rail" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "buyer_email" text,
    "square_payment_id" text,
    "square_order_id" text,
    "tx_hash" text,
    "chain_id" integer,
    "payer_wallet_address" text,
    "recipient_wallet_address" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "tickets" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "order_id" uuid NOT NULL,
    "event_id" uuid NOT NULL,
    "ticket_type_id" uuid NOT NULL,
    "owner_id" uuid NOT NULL,
    "code" text NOT NULL,
    "status" text DEFAULT 'valid' NOT NULL,
    "checked_in_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "tickets_code_unique" UNIQUE("code")
  )`,
];

// FK constraints — wrapped so a duplicate (already-applied) one is ignored.
const fks = [
  ['event_ticket_types_event_id_events_id_fk', `ALTER TABLE "event_ticket_types" ADD CONSTRAINT "event_ticket_types_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade`],
  ['ticket_orders_event_id_events_id_fk', `ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade`],
  ['ticket_orders_ticket_type_id_event_ticket_types_id_fk', `ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_ticket_type_id_event_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."event_ticket_types"("id")`],
  ['ticket_orders_buyer_id_users_id_fk', `ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id")`],
  ['tickets_order_id_ticket_orders_id_fk', `ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_ticket_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."ticket_orders"("id") ON DELETE cascade`],
  ['tickets_event_id_events_id_fk', `ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade`],
  ['tickets_ticket_type_id_event_ticket_types_id_fk', `ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_type_id_event_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."event_ticket_types"("id")`],
  ['tickets_owner_id_users_id_fk', `ALTER TABLE "tickets" ADD CONSTRAINT "tickets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")`],
];

try {
  for (const sql of statements) {
    await pool.query(sql);
  }
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
     WHERE table_schema='public' AND table_name IN ('event_ticket_types','ticket_orders','tickets')
     ORDER BY table_name`
  );
  console.log('Applied. Present tables:', rows.map((r) => r.table_name).join(', '));
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
