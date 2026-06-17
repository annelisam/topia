-- RSVP questions + registration settings. Written idempotently so it is safe to
-- replay against a DB where it was already applied (the journal trails the live
-- schema in this project; new objects are applied via scripts/apply-*.mjs).
CREATE TABLE IF NOT EXISTS "event_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'short_text' NOT NULL,
	"options" jsonb,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD COLUMN IF NOT EXISTS "responses" jsonb;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rsvp_capacity" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rsvp_approval_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rsvp_closed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_questions_event_id_events_id_fk') THEN
  ALTER TABLE "event_questions" ADD CONSTRAINT "event_questions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
