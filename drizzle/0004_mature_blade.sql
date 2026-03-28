ALTER TABLE "world_projects" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "world_projects" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "world_projects" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "world_projects" ADD COLUMN "links" jsonb;--> statement-breakpoint
ALTER TABLE "world_projects" ADD COLUMN "tags" jsonb;--> statement-breakpoint
ALTER TABLE "world_projects" ADD COLUMN "published" boolean DEFAULT true;