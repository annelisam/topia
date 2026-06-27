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
  socialFarcaster: text('social_farcaster'),
  role: text('role').default('user'), // 'user', 'artist', 'admin'
  roleTags: text('role_tags'),        // Comma-separated creative roles e.g. 'music,dj,visual-artist'
  toolSlugs: text('tool_slugs'),      // Comma-separated tool slugs from tools table (tools I USE)
  savedToolSlugs: text('saved_tool_slugs'), // Comma-separated tool slugs user has bookmarked
  savedEventSlugs: text('saved_event_slugs'), // Comma-separated event slugs user has bookmarked
  path: text('path'),                 // 'worldbuilder' | 'catalyst' | 'anchor' — null until onboarding
  verifiedProviders: text('verified_providers'), // CSV of OAuth-verified social providers e.g. 'twitter,linkedin'
  pronouns: text('pronouns'),         // Optional free-text e.g. 'she/her', 'they/them'
  customLinks: jsonb('custom_links'), // Array of {label, url} pairs for arbitrary user links
  published: boolean('published').notNull().default(true), // admin can hide a profile from Discover
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
  description: text('description'), // Markdown description
  date: text('date'), // Stored as text from CSV (e.g., "18-Jul-2025")
  dateIso: text('date_iso'), // ISO format "2025-07-18" for chronological sorting
  startTime: text('start_time'), // e.g., "9:00 PM"
  endTime: text('end_time'), // e.g., "11:00 PM"
  timezone: text('timezone'), // e.g., "America/Los_Angeles"
  city: text('city'),
  address: text('address'), // Full street address
  link: text('link'),
  imageUrl: text('image_url'),
  createdBy: uuid('created_by').references(() => users.id),
  published: boolean('published').default(true),
  // Set when the event was imported from an external platform via /api/events/import.
  // Values: 'partiful' | 'luma' | 'eventbrite' | 'other' (manual creates leave it null)
  externalSource: text('external_source'),
  // ── RSVP / registration settings (Luma-style) ──
  rsvpCapacity: integer('rsvp_capacity'),                       // null = unlimited
  rsvpApprovalRequired: boolean('rsvp_approval_required').notNull().default(false),
  rsvpClosed: boolean('rsvp_closed').notNull().default(false),  // host closed registration
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

// World invitations - pending invites for world membership
export const worldInvitations = pgTable('world_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'cascade' }).notNull(),
  inviterId: uuid('inviter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  inviteeId: uuid('invitee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'world_builder' | 'collaborator'
  status: text('status').default('pending').notNull(), // 'pending' | 'accepted' | 'declined'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Event hosts - links users to events with roles
export const eventHosts = pgTable('event_hosts', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'creator' | 'co_host'
  worldId: uuid('world_id').references(() => worlds.id), // optional: hosting as a World
  // Luma-style host settings:
  manager: boolean('manager').notNull().default(true),          // false = host shown but no /manage access
  showOnEventPage: boolean('show_on_event_page').notNull().default(true), // public "Hosted by" visibility
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Event co-host invitations
export const eventHostInvitations = pgTable('event_host_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  inviterId: uuid('inviter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  inviteeId: uuid('invitee_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'accepted' | 'declined'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Event RSVPs
export const eventRsvps = pgTable('event_rsvps', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  // 'going' (confirmed) | 'pending' (awaiting host approval) | 'declined'
  status: text('status').default('going').notNull(),
  // Snapshot of answers to the event's custom questions at RSVP time:
  // [{ questionId, label, type, answer }]. Snapshotting keeps history stable
  // even if the host later edits/removes questions.
  responses: jsonb('responses'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Guest invitations by email / phone (Luma-style). A host invites people who
// may not be on the platform yet; each invite carries a unique token used in a
// shareable link (/events/[slug]?invite=token). The invitee verifies with Privy
// and RSVPs, which flips the invite to 'accepted'. Delivery (email/SMS) is
// pluggable — if no provider is configured we just surface the link for the
// host to share manually.
export const eventInvites = pgTable('event_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  email: text('email'),                                  // one of email/phone is set
  phone: text('phone'),
  invitedBy: uuid('invited_by').references(() => users.id),
  token: text('token').notNull().unique(),               // shareable-link token
  status: text('status').notNull().default('pending'),   // 'pending' | 'accepted' | 'revoked'
  acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id),
  sent: boolean('sent').notNull().default(false),        // true once auto-delivered
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Custom RSVP questions per event (Luma-style registration form). Hosts define
// them; answers are captured into eventRsvps.responses at registration time.
export const eventQuestions = pgTable('event_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  label: text('label').notNull(),
  // 'short_text' | 'long_text' | 'single_select' | 'multi_select' | 'checkbox'
  type: text('type').notNull().default('short_text'),
  options: jsonb('options'),                              // string[] for select types
  required: boolean('required').notNull().default(false),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').notNull().default(true),
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

// World projects - items that appear as labels on a world's globe
export const worldProjects = pgTable('world_projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),       // Short description shown on card
  content: text('content'),               // Long-form markdown content
  imageUrl: text('image_url'),            // Cover/hero image
  videoUrl: text('video_url'),            // Video embed URL (YouTube, Vimeo, etc.)
  url: text('url'),                       // External project link
  links: jsonb('links'),                  // Array of {label, url} pairs
  tags: jsonb('tags'),                    // Array of string tags
  sortOrder: integer('sort_order').default(0),
  published: boolean('published').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/* ────────────────────────────────────────────────────────────────────
 * Guestbook entries — drawings, text messages, gifs left on a user's
 * public profile. Visibility is always public; the *write* permission
 * is gated by follow relationship (enforced at the API layer):
 *   - drawing → mutual follow only
 *   - message / gif → at least one-way follow
 * ──────────────────────────────────────────────────────────────────── */
export const guestbookEntries = pgTable('guestbook_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileUserId: uuid('profile_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  authorUserId:  uuid('author_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  kind: text('kind').notNull(),                 // 'drawing' | 'message' | 'gif' | 'reply'
  body: text('body'),                           // text content / caption
  imageUrl: text('image_url'),                  // drawing PNG OR gif URL (Vercel Blob or Giphy CDN)
  giphyId: text('giphy_id'),                    // for Giphy attribution
  // Optional parent for one-level-deep text replies. Guestbook replies are
  // limited: text-only, no further nesting. Null for top-level entries.
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Tool comments + optional 1–5 rating. Only users who have the tool in
 * their kit (users.tool_slugs contains tool.slug) can post — enforced at
 * the API layer. Public read. Replies live in the same table via parentId. */
export const toolComments = pgTable('tool_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  toolId: uuid('tool_id').references(() => tools.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  body: text('body'),
  rating: integer('rating'),                    // nullable 1..5; replies don't carry ratings
  parentId: uuid('parent_id'),                  // top-level when null
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Event comments + optional gif. Only users who RSVP'd or have the event
 * slug in savedEventSlugs (interested) can post — enforced at the API.
 * Replies live in the same table via parentId. */
export const eventComments = pgTable('event_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId:  uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  body: text('body'),
  imageUrl: text('image_url'),                  // gif URL
  giphyId: text('giphy_id'),
  parentId: uuid('parent_id'),                  // top-level when null
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Event photo album — hosts upload images/clips that render in a gallery
 * on the event page. Public to read; only hosts add/remove (enforced at
 * the API). sortOrder lets hosts arrange the album. */
export const eventGalleryPhotos = pgTable('event_gallery_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),                    // Vercel Blob URL
  isVideo: boolean('is_video').notNull().default(false),
  caption: text('caption'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* ────────────────────────────────────────────────────────────────────
 * Polymorphic emoji reactions on guestbook entries + comments.
 *
 * One row per (target, user, emoji) — toggling the same emoji on the
 * same target by the same user deletes the row. Aggregation happens at
 * read time (cheap; counts shown live).
 *
 *   targetType ∈ 'guestbook' | 'tool_comment' | 'event_comment'
 *
 * `target_id` is *not* a FK because it refers to different tables
 * depending on `target_type`. Cascade cleanup of orphans is handled
 * lazily when the parent row is deleted (a separate sweep, not via FK).
 * ──────────────────────────────────────────────────────────────────── */
export const reactions = pgTable('reactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  targetType: text('target_type').notNull(),   // 'guestbook' | 'tool_comment' | 'event_comment'
  targetId:   uuid('target_id').notNull(),
  userId:     uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emoji:      text('emoji').notNull(),         // unicode character, e.g. '❤️', '🔥'
  createdAt:  timestamp('created_at').defaultNow().notNull(),
});

/* ────────────────────────────────────────────────────────────────────
 * Topia TV episodes — videos that play on /tv. Stored as URLs pointing
 * at Vercel Blob (videos themselves) plus optional poster/thumbnail
 * URLs. Categories drive the colored accent in the TV guide.
 *
 * For multi-part episodes (e.g. "Ep 001 Part I" + "Part II") we store
 * each part as its own row, grouped by `seriesSlug`. Sort order within
 * a series uses `episodeNumber` + `partNumber`.
 * ──────────────────────────────────────────────────────────────────── */
export const tvEpisodes = pgTable('tv_episodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull(),          // 'Featured' | 'Live' | 'Series' | 'Replays'
  seriesSlug: text('series_slug'),               // groups multi-episode runs
  seriesTitle: text('series_title'),             // human-readable series name
  episodeNumber: integer('episode_number'),
  partNumber: integer('part_number'),
  videoUrl: text('video_url').notNull(),         // Vercel Blob URL
  thumbnailUrl: text('thumbnail_url'),           // poster image; nullable → fall back to a default gif
  durationSeconds: integer('duration_seconds'),
  guestName: text('guest_name'),                 // optional guest tag, e.g. "C.Y Lee"
  publishedAt: timestamp('published_at').defaultNow(),
  published: boolean('published').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* ════════════════════════════════════════════════════════════════════
 * TICKETED EVENTS — paid admission
 *
 * Three rail-agnostic tables back both payment rails:
 *   - Square  (fiat: cards, Apple/Google Pay, Cash App Pay)
 *   - Crypto  (USDC on Base, paid from the buyer's Privy/embedded wallet)
 *
 * Money is stored in integer minor units (USD cents) everywhere to avoid
 * float rounding. Free events simply have no ticket types — RSVP stays the
 * path for those. An event is "ticketed" iff it has ≥1 active ticket type.
 * ════════════════════════════════════════════════════════════════════ */

// Ticket tiers for an event, e.g. "General Admission", "VIP". Host-managed.
export const eventTicketTypes = pgTable('event_ticket_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),                          // 'General Admission' | 'VIP'
  description: text('description'),
  priceCents: integer('price_cents').notNull().default(0), // USD cents; 0 = free tier
  currency: text('currency').notNull().default('USD'),
  quantityTotal: integer('quantity_total'),             // null = unlimited supply
  quantitySold: integer('quantity_sold').notNull().default(0),
  maxPerOrder: integer('max_per_order').default(10),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// A purchase. One row per checkout attempt; tickets are issued only once
// status flips to 'paid'. Pricing is snapshotted at purchase time so later
// tier edits never rewrite history.
export const ticketOrders = pgTable('ticket_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  ticketTypeId: uuid('ticket_type_id').references(() => eventTicketTypes.id).notNull(),
  buyerId: uuid('buyer_id').references(() => users.id).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPriceCents: integer('unit_price_cents').notNull(), // snapshot of tier price
  amountCents: integer('amount_cents').notNull(),        // unitPriceCents * quantity
  currency: text('currency').notNull().default('USD'),
  rail: text('rail').notNull(),                          // 'square' | 'crypto'
  status: text('status').notNull().default('pending'),   // 'pending'|'paid'|'failed'|'refunded'|'cancelled'
  buyerEmail: text('buyer_email'),
  // ── Square (fiat) ──
  squarePaymentId: text('square_payment_id'),
  squareOrderId: text('square_order_id'),
  // ── Crypto (USDC on Base) ──
  txHash: text('tx_hash'),
  chainId: integer('chain_id'),                          // 8453 = Base mainnet
  payerWalletAddress: text('payer_wallet_address'),
  recipientWalletAddress: text('recipient_wallet_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Individual issued admissions — one row per seat. Created when an order is
// paid. `code` is the unique value encoded into a QR for door check-in.
export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => ticketOrders.id, { onDelete: 'cascade' }).notNull(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  ticketTypeId: uuid('ticket_type_id').references(() => eventTicketTypes.id).notNull(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  code: text('code').notNull().unique(),                 // scannable check-in code
  status: text('status').notNull().default('valid'),     // 'valid'|'checked_in'|'refunded'|'void'
  checkedInAt: timestamp('checked_in_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Short links — maps a compact code to an internal path so shareable URLs can
// be tiny (topia.vision/s/<code>). Deduped by targetPath (unique) so a given
// page always resolves to the same code. `clicks` is a best-effort tally
// bumped on each redirect.
export const shortLinks = pgTable('short_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),               // base62 slug in the /s/ URL
  targetPath: text('target_path').notNull().unique(),  // internal path, e.g. /events/foo
  kind: text('kind'),                                  // 'event' | 'profile' | 'world' | null
  createdBy: uuid('created_by').references(() => users.id),
  clicks: integer('clicks').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Newsletter / waitlist sign-ups captured from the marketing site (home page
// dispatch widget, /waitlist). Deduped by email. `userId` attributes a signup
// to a profile when the email matches an existing user — set best-effort at
// signup time; the admin view also re-matches live by email so profiles created
// after the signup still attribute.
export const newsletterSignups = pgTable('newsletter_signups', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),             // lowercased on write
  name: text('name'),                                  // first name (or full name from /waitlist)
  source: text('source'),                              // 'home-newsletter' | 'waitlist' | null
  roles: text('roles'),                                // CSV of roles when supplied (/waitlist)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/* ════════════════════════════════════════════════════════════════════
 * DIRECT MESSAGES (Instagram-style)
 *
 * 1:1 conversations split into Primary vs Requests at the membership level:
 *   - mutual follow (a "connection")  → both members 'accepted' → Primary
 *   - non-mutual first message        → recipient member 'pending' → Requests
 *     until they accept (sender is always 'accepted').
 * Delivery is poll-based (no realtime infra). Group threads can come later by
 * allowing >2 members + a null dmKey.
 * ──────────────────────────────────────────────────────────────────── */
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Deterministic key for a 1:1 pair — sorted "minUserId:maxUserId" — so a pair
  // can only ever have one conversation. Null for (future) group threads.
  dmKey: text('dm_key').unique(),
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(), // sorts the inbox
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const conversationMembers = pgTable('conversation_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').notNull().default('accepted'), // 'accepted' (Primary) | 'pending' (Requests)
  lastReadAt: timestamp('last_read_at'),                 // null = never opened; drives unread counts
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  body: text('body'),                                    // text content (nullable for media-only)
  imageUrl: text('image_url'),                           // uploaded image OR gif URL
  giphyId: text('giphy_id'),                             // Giphy attribution when the image is a gif
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
