import { pgTable, text, timestamp, uuid, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

// Users table - auth via Privy (email, phone, Google, Coinbase wallet)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  privyId: text('privy_id').unique(), // Privy DID e.g. did:privy:xxxxxx
  email: text('email').unique(),      // nullable: users may auth via phone/wallet
  phone: text('phone').unique(),
  walletAddress: text('wallet_address').unique(),
  name: text('name'),
  username: text('username').unique(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  socialWebsite: text('social_website'),
  socialTwitter: text('social_twitter'),
  socialInstagram: text('social_instagram'),
  socialSoundcloud: text('social_soundcloud'),
  socialSpotify: text('social_spotify'),
  socialLinkedin: text('social_linkedin'),
  socialSubstack: text('social_substack'),
  role: text('role').default('user'), // 'user', 'artist', 'admin'
  roleTags: text('role_tags'),        // Comma-separated creative roles e.g. 'music,dj,visual-artist'
  toolSlugs: text('tool_slugs'),      // Comma-separated tool slugs from tools table
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Creators - people/studios who build worlds
export const creators = pgTable('creators', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  imageUrl: text('image_url'),
  websiteUrl: text('website_url'),
  country: text('country'), // e.g. 'US', 'SE', 'DE'
  userId: uuid('user_id').references(() => users.id), // Optional link to a user profile
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// World members - links users to worlds with roles
export const worldMembers = pgTable('world_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'world_builder' | 'collaborator'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Worlds - artist-created spaces/projects
export const worlds = pgTable('worlds', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  shortDescription: text('short_description'),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  artistId: uuid('artist_id').references(() => users.id),
  creatorId: uuid('creator_id').references(() => creators.id),
  category: text('category'), // e.g. 'Art', 'Music', 'Film'
  imageUrl: text('image_url'),
  headerImageUrl: text('header_image_url'),
  websiteUrl: text('website_url'),
  country: text('country'), // e.g. 'US', 'SE'
  tools: text('tools'), // Comma-separated tools
  collaborators: text('collaborators'), // Comma-separated names
  socialLinks: jsonb('social_links'), // {website: '', twitter: '', instagram: '', etc}
  content: jsonb('content'), // Flexible content structure
  dateAdded: text('date_added'), // Display date e.g. "Feb 01, 2026"
  displayOrder: integer('display_order').default(0),
  published: boolean('published').default(true),
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
  submittedBy: uuid('submitted_by').references(() => users.id),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Follows - user-to-user follow relationships
export const follows = pgTable('follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  followerId: uuid('follower_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followingId: uuid('following_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Notifications - in-app notifications (e.g. follow events)
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipientId: uuid('recipient_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'follow', 'world_member_added'
  metadata: jsonb('metadata'), // e.g. { worldId, worldTitle, worldSlug, role }
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
