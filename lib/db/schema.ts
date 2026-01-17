import { pgTable, text, timestamp, uuid, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

// Users table - for future platform expansion
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').default('user'), // 'user', 'artist', 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Worlds - artist-created spaces/projects
export const worlds = pgTable('worlds', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  artistId: uuid('artist_id').references(() => users.id),
  imageUrl: text('image_url'),
  content: jsonb('content'), // Flexible content structure
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Catalysts - people/organizations in the network
export const catalysts = pgTable('catalysts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  imageUrl: text('image_url'),
  websiteUrl: text('website_url'),
  socialLinks: jsonb('social_links'), // {instagram: '', twitter: '', etc}
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Events
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventName: text('event_name').notNull(),
  slug: text('slug').notNull().unique(),
  date: text('date'), // Stored as text from CSV (e.g., "18-Jul-2025")
  startTime: text('start_time'), // e.g., "9:00 PM"
  city: text('city'),
  link: text('link'),
  imageUrl: text('image_url'),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Grants
export const grants = pgTable('grants', {
  id: uuid('id').defaultRandom().primaryKey(),
  grantName: text('grant_name').notNull(),
  slug: text('slug').notNull().unique(),
  shortDescription: text('short_description'),
  amountMin: integer('amount_min'),
  amountMax: integer('amount_max'),
  currency: text('currency').default('USD'),
  tags: text('tags'), // Comma-separated tags
  eligibility: text('eligibility'),
  deadlineType: text('deadline_type'), // 'Fixed', 'Rolling', etc.
  deadlineDate: text('deadline_date'), // Date string from CSV
  link: text('link'),
  region: text('region'),
  category: text('category'),
  frequency: text('frequency'), // 'Annual', 'One-time', etc.
  orgName: text('org_name'),
  status: text('status'), // 'Open', 'Closed', etc.
  notes: text('notes'),
  source: text('source'),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tools
export const tools = pgTable('tools', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category'),
  description: text('description'),
  pricing: text('pricing'), // 'Free', 'Paid', 'Freemium', etc.
  url: text('url'),
  featured: boolean('featured').default(false),
  priority: integer('priority'),
  easeOfUse: text('ease_of_use'),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TOPIA TV content
export const tvContent = pgTable('tv_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  artistId: uuid('artist_id').references(() => users.id),
  videoUrl: text('video_url'),
  thumbnailUrl: text('thumbnail_url'),
  duration: text('duration'),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
