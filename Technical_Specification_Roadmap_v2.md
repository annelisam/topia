# Technical Specification & Implementation Roadmap

## Overview

TOPIA is a creator engine and network designed to empower artists to build their own ecosystems, connecting media, content, and communities in one place. This document provides a comprehensive technical specification, phased implementation roadmap, and detailed cost analysis for building and operating the platform through 2028.

The platform will be built in four major versions, starting with V1 (Q1-Q2 2026) focused on migration, identity, and discovery, progressing through V2 (Q3-Q4 2026) for dynamic world creation, V3 (2027) for process integration and collaboration, and V4 (2028+) for the full Spiral Engine and creator tools.

### Key Platform Capabilities

- User profiles with customizable identity and social connections
- World creation and management with granular permission controls
- Social graph with profile-to-profile and profile-to-world follows
- Public databases for tools, events, and opportunities with search and filtering
- Email-based invitation system for world membership
- Timeline and engagement features (V2+)
- AI-powered creator engine (V4+)

---

# Technology Stack

### Frontend Architecture

**Framework: Next.js 16+ (App Router)**

- React Server Components for optimal performance and SEO
- Server-side rendering (SSR) for public pages (worlds, profiles, databases)
- Static generation for marketing pages and documentation
- Client-side state management with React Context and hooks

**UI Framework: Tailwind CSS + shadcn/ui**

- Utility-first CSS for rapid iteration and consistent design
- Pre-built accessible components from shadcn/ui library
- Custom design system extending Tailwind base configuration

### Backend Architecture

**Database: Vercel Postgres + Drizzle ORM**

- PostgreSQL database hosted on Vercel's infrastructure
- Drizzle ORM for type-safe database queries and migrations
- Connection pooling via @neondatabase/serverless for optimal performance
- Row Level Security (RLS) policies for fine-grained access control (implemented at application layer)

**Authentication: Auth.js (NextAuth.js) v5**

- Open-source authentication solution (free)
- Email/password authentication with magic links
- OAuth providers (Google, Apple, GitHub)
- JWT sessions stored securely
- Database adapter for Drizzle ORM
- *Alternative: Clerk ($0 for first 10K MAU, then $0.02/MAU)*

**File Storage: Vercel Blob**

- Media files (avatars, headers, world content)
- Automatic CDN distribution
- Simple API integration with Next.js
- *Alternative: Cloudflare R2 (cheaper at scale)*

**Realtime (V2+): Ably or Pusher**

- Live updates for notifications
- Real-time follow counts and activity
- *Will evaluate need during V2 development*

### Hosting & Deployment

**Primary: Vercel** (recommended for V1-V2)

- Automatic deployments from Git (GitHub integration)
- Edge network for global performance
- Preview deployments for every pull request
- Built-in analytics and performance monitoring
- Integrated Postgres database

**Alternative: Cloudflare Pages** (cost optimization for V3+)

- Lower cost at scale (free tier: unlimited bandwidth)
- Global CDN with 300+ locations
- Consider migration when monthly costs exceed $500 or traffic exceeds 100GB

### Email Services

**Provider: Resend**

- Authentication emails (signup, password reset, magic links)
- World invitation emails with secure token links
- Notification emails (V2+: follows, comments, mentions)
- Transactional email templates with React Email

### Analytics & Monitoring

**Analytics: PostHog**

- Product analytics (user behavior, feature usage)
- Funnel analysis (signup conversion, world creation)
- Session replay for debugging user issues
- Feature flags for gradual rollouts

**Error Tracking: Sentry** (recommended)

- Real-time error monitoring and alerting
- Performance monitoring (Core Web Vitals)
- Release tracking and regression detection

---

# Database Architecture

### Core Data Models

### 1. Profiles

The public identity for each authenticated user. Links to auth.users via UUID primary key.

| Column | Type | Description |
| --- | --- | --- |
| id | uuid (PK) | Equals auth.users.id |
| handle | text (unique) | URL handle (e.g., @username) |
| display_name | text | Public display name |
| bio | text | Profile description |
| location | text | Optional location |
| avatar_url | text | Vercel Blob storage URL |
| header_url | text | Optional header image |
| links | jsonb | Social links (Instagram, SoundCloud, etc.) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Indexes:**

- Unique index on `handle`

### 2. Worlds

Container for creator content and community. Supports public, unlisted, and private visibility.

| Column | Type | Description |
| --- | --- | --- |
| id | uuid (PK) | Primary key |
| slug | text (unique) | URL slug (e.g., /worlds/my-world) |
| name | text | World display name |
| description | text | World description |
| cover_image_url | text | Vercel Blob URL for cover image |
| media | jsonb | Array of embeds/images |
| visibility | enum | public / unlisted / private |
| published_at | timestamptz (nullable) | Published if not null |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Indexes:**

- Unique index on `slug`
- Index on `published_at`
- Index on `visibility`

### 3. World Memberships

Core permission and role system. Defines who can access and manage each world.

| Column | Type | Description |
| --- | --- | --- |
| world_id | uuid (FK) | References worlds.id |
| profile_id | uuid (FK) | References profiles.id |
| permission | enum | admin / member |
| world_role | text | Custom role (artist, producer, etc.) |
| status | enum | active / invited |
| invited_by_profile_id | uuid (FK) | Who invited this member |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Constraints:**

- Composite primary key: (world_id, profile_id)
- Unique constraint: (world_id, profile_id)
- Optional check: char_length(world_role) <= 60

**Indexes:**

- Index on `world_id`
- Index on `profile_id`
- Index on `(world_id, permission)`

### 4. World Invites

Token-based invites for adding a profile to a world via email.

| Column | Type | Description |
| --- | --- | --- |
| id | uuid (PK) | Primary key |
| world_id | uuid (FK) | References worlds.id |
| email | text | Invited email address |
| permission | enum | Default: member |
| world_role | text | Optional preset role |
| token | text (unique) | Secure invite token |
| status | enum | pending / accepted / expired / revoked |
| invited_by_profile_id | uuid (FK) | Who sent the invite |
| expires_at | timestamptz | Expiration timestamp |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Indexes:**

- Unique index on `token`
- Index on `world_id`
- Index on `email`

### 5. Profile Follows

User follows user (profile-first social graph).

| Column | Type | Description |
| --- | --- | --- |
| follower_profile_id | uuid (FK) | Who is following |
| following_profile_id | uuid (FK) | Who is being followed |
| created_at | timestamptz | When the follow occurred |

**Constraints:**

- Composite primary key: (follower_profile_id, following_profile_id)
- Check: follower_profile_id <> following_profile_id

**Indexes:**

- Index on `follower_profile_id`
- Index on `following_profile_id`

### 6. World Follows

User follows world.

| Column | Type | Description |
| --- | --- | --- |
| follower_profile_id | uuid (FK) | Who is following |
| world_id | uuid (FK) | Which world |
| created_at | timestamptz | When the follow occurred |

**Constraints:**

- Composite primary key: (follower_profile_id, world_id)

**Indexes:**

- Index on `follower_profile_id`
- Index on `world_id`

### 7. Public Databases

**Tools Table:**

| Column | Type | Description |
| --- | --- | --- |
| id | uuid (PK) | Primary key |
| name | text | Tool name |
| description | text | Tool description |
| category | text | Category/type |
| url | text | Link to tool |
| pricing_type | text | free/paid/freemium |
| tags | text[] or jsonb | Searchable tags |
| verified | boolean | Admin verified |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Events Table:**

| Column | Type | Description |
| --- | --- | --- |
| id | uuid (PK) | Primary key |
| title | text | Event name |
| start_date | date | Event start date |
| end_date | date (nullable) | Event end date |
| location | text | Event location |
| url | text | Event website |
| tags | text[] or jsonb | Searchable tags |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Opportunities Table (Grants/Residencies):**

| Column | Type | Description |
| --- | --- | --- |
| id | uuid (PK) | Primary key |
| title | text | Opportunity name |
| deadline | date (nullable) | Application deadline |
| region | text | Geographic region |
| eligibility | text | Eligibility criteria |
| url | text | Application link |
| tags | text[] or jsonb | Searchable tags |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### 8. Safety & Moderation (V1 Recommended)

**Blocks Table:**

| Column | Type | Description |
| --- | --- | --- |
| blocker_profile_id | uuid (FK) | Who is blocking |
| blocked_profile_id | uuid (FK) | Who is blocked |
| created_at | timestamptz | When the block occurred |

**Reports Table:**

| Column | Type | Description |
| --- | --- | --- |
| id | uuid (PK) | Primary key |
| reporter_profile_id | uuid (FK) | Who reported |
| target_type | enum | profile/world/tool/event/opportunity |
| target_id | uuid | ID of reported item |
| reason | text | Report reason |
| details | text (optional) | Additional details |
| status | text | open/closed |
| created_at | timestamptz | Creation timestamp |

**Submissions Table (Community Contributions):**

| Column | Type | Description |
| --- | --- | --- |
| id | uuid (PK) | Primary key |
| type | enum | tool/event/opportunity/world |
| payload | jsonb | Submitted data |
| submitted_by_profile_id | uuid (nullable) | Submitter (allow anonymous) |
| status | enum | pending/approved/rejected |
| reviewed_by_profile_id | uuid (nullable) | Admin reviewer |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### Security Model

All data access is controlled through application-level security policies using Drizzle ORM middleware and Next.js server actions, ensuring users can only access data they're authorized to see.

### Key Security Policies

- **Profiles:** Public read, owner-only write
- **Worlds:** Public read for published worlds, member-only for private, admin-only write
- **Memberships:** Members can read their world memberships, admins can manage
- **Follows:** Users can manage their own follows, read access based on blocked users
- **Invites:** Admins create/revoke, token-based acceptance flow
- **Databases (tools/events/opportunities):** Public read, admin-only write

---

# Implementation Roadmap

### V1: Migration + Identity + Worlds (Q1-Q2 2026)

**Theme:** *Discover the Worlds. Find the Tools. Start the Journey.*

**Goal:** Launch a living digital map showcasing creative worlds and providing a trusted resource hub for first-time creators.

---

### January 2026: Foundations + Migration

#### Sprint 1 (Jan 1-15): Technical Setup

- [ ] Initialize Next.js 16 repository with App Router structure ✅ *Complete*
- [ ] Configure Tailwind CSS component library ✅ *Complete*
- [ ] Set up Vercel project with staging and production environments ✅ *Complete*
- [ ] Create Vercel Postgres database and configure Drizzle ORM ✅ *Complete*
- [ ] Implement initial database schema (profiles, worlds, databases tables) ✅ *Complete*

#### Sprint 2 (Jan 16-31): Content Migration

- [ ] Rebuild landing pages and marketing site in Next.js ✅ *Complete*
- [ ] Migrate existing Squarespace content and assets ✅ *Complete*
- [ ] Import initial databases (tools, events, opportunities) ✅ *Complete*
- [ ] Configure domain and SSL certificates ✅ *Complete*

**Deliverable:** *Squarespace replaced, site live, database connected*

---

### February 2026: Auth + Profiles + Worlds

#### Sprint 1 (Feb 1-15): Login, Profiles & Admin Dashboard

**Authentication**
- [ ] Implement Auth.js with email magic links
- [ ] Add Google OAuth provider
- [ ] Configure Resend for authentication emails
- [ ] Build signup/login flows with proper error handling
- [ ] Set up session management and JWT handling

**Basic Profile Creation**
- [ ] Create profile onboarding flow (handle, display name)
- [ ] Build basic profile page display
- [ ] Implement session-based user identification

**Admin Dashboard**
- [ ] Build admin authentication and role checking
- [ ] Create admin dashboard layout and navigation
- [ ] Implement admin interface for database management (tools, grants, events)
- [ ] Add admin-only routes and middleware protection

#### Sprint 2 (Feb 16-28): Worlds & Expanded Profiles

**World Creation & Interaction**
- [ ] Build world creation wizard
- [ ] Implement world editing interface (admin-only)
- [ ] Add media upload capabilities to Vercel Blob
- [ ] Implement visibility controls (public/unlisted/private)
- [ ] Create world detail pages with rich content display
- [ ] Build world directory with grid/list views
- [ ] Enable world following (basic interaction)

**Expanded Profile Features**
- [ ] Add bio and location fields to profile
- [ ] Implement avatar and header image uploads to Vercel Blob
- [ ] Add social links management (JSON field)
- [ ] Build full public profile pages
- [ ] Add profile editing interface
- [ ] Display worlds created/joined on profile

**Deliverable:** *Users can sign up, create profiles, create worlds, and admins can manage content*

---

### March 2026: Memberships + Public Databases

#### Sprint 1 (Mar 1-15): Membership & Invites

- [ ] Build email invitation system with secure tokens
- [ ] Create invite acceptance/decline flow
- [ ] Implement membership management dashboard (admins only)
- [ ] Add ability for members to set their world_role
- [ ] Build member list display on world pages
- [ ] Implement permission checks in middleware

#### Sprint 2 (Mar 16-31): Public Databases & SEO

- [ ] Rebuild database browsing UI with search and filtering ✅ *Complete*
- [ ] Implement grants page with tag filters and sorting ✅ *Complete*
- [ ] Implement tools page with category filters ✅ *Complete*
- [ ] Add events page with calendar view
- [ ] Add SEO optimization (metadata, sitemaps, structured data)
- [ ] Implement public submissions queue for community contributions

**Deliverable:** *Membership system live, searchable public databases complete*

---

### April 2026: Social Graph (Follows)

#### Sprint 1 (Apr 1-15): Follow System

- [ ] Implement profile-to-profile follow system
- [ ] Implement profile-to-world follow system
- [ ] Build follow/unfollow buttons with optimistic UI updates
- [ ] Add follower/following counts to profiles and worlds

#### Sprint 2 (Apr 16-30): Social Pages

- [ ] Build "Following" pages (people you follow, worlds you follow)
- [ ] Create "Followers" display on profiles
- [ ] Implement mutual follow indicators
- [ ] Add "Suggested follows" based on world membership

**Deliverable:** *Social network graph live and functional*

---

### May 2026: Safety + Notifications

#### Sprint 1 (May 1-15): Safety Features

- [ ] Implement user blocking system
- [ ] Build reporting system for content moderation
- [ ] Add basic moderation queue for admin review
- [ ] Implement rate limiting on sensitive endpoints

#### Sprint 2 (May 16-31): Notifications

- [ ] Build in-app notifications system (new followers, world invites)
- [ ] Implement email notification preferences
- [ ] Create notification center UI
- [ ] Add real-time notification badges

**Deliverable:** *Safety and moderation systems live, basic notifications working*

---

### June 2026: Stabilization + Polish

#### Sprint 1 (Jun 1-15): Performance & Monitoring

- [ ] Performance optimization pass (Core Web Vitals, bundle size)
- [ ] Set up PostHog analytics and event tracking
- [ ] Implement error monitoring with Sentry
- [ ] Database query optimization and indexing

#### Sprint 2 (Jun 16-30): Testing & Launch Prep

- [ ] Comprehensive testing and bug fixes
- [ ] Security audit and penetration testing
- [ ] Documentation and onboarding materials
- [ ] Load testing for expected V1 traffic
- [ ] Final UI/UX polish pass

**Deliverable:** *Production-ready V1 with safety features*

---

### V2: Dynamic Worlds + Engagement (Q3-Q4 2026)

**Theme:** *Give creators a home for their universe.*

**Goal:** Expand from discovery to creation — letting artists design and manage their own world spaces with richer content and engagement features.

---

### July 2026: Enhanced World Builder

#### Sprint 1 (Jul 1-15): Modular Sections

- [ ] Implement modular world sections (About, Projects, Media Gallery, etc.)
- [ ] Add rich text editor for world descriptions (Tiptap or Slate)
- [ ] Build section reordering with drag-and-drop

#### Sprint 2 (Jul 16-31): Media & Embeds

- [ ] Build drag-and-drop media gallery
- [ ] Implement embed support (YouTube, SoundCloud, Spotify, etc.)
- [ ] Add world templates for quick setup

---

### August 2026: World Customization

#### Sprint 1 (Aug 1-15): Theming

- [ ] Implement world color themes
- [ ] Add custom header layouts
- [ ] Build preview mode for unpublished changes

#### Sprint 2 (Aug 16-31): Advanced Features

- [ ] Implement world analytics (views, follows)
- [ ] Add featured content pinning
- [ ] Build world export/backup functionality

---

### September 2026: Engagement Layer

#### Sprint 1 (Sep 1-15): Timeline Posts

- [ ] Implement posts table and schema
- [ ] Build post creation interface (text, images, embeds)
- [ ] Create basic feed algorithm (chronological, followed users/worlds)

#### Sprint 2 (Sep 16-30): Feed Features

- [ ] Add post permalinks and sharing
- [ ] Implement post reactions (optional)
- [ ] Build "In/Process" documentation format
- [ ] Add post editing and deletion

---

### October 2026: Discovery & Notifications

#### Sprint 1 (Oct 1-15): Enhanced Discovery

- [ ] Enhanced search with filters (tags, categories, location)
- [ ] Trending worlds algorithm
- [ ] Recommended follows based on interests

#### Sprint 2 (Oct 16-31): Notifications

- [ ] Build in-app notifications system
- [ ] Implement email digest system
- [ ] Add notification preferences

---

### November 2026: V2 Polish

#### Sprint 1 (Nov 1-15): Refinement

- [ ] UI/UX polish pass
- [ ] Performance optimization
- [ ] Accessibility audit

#### Sprint 2 (Nov 16-30): Launch Prep

- [ ] Load testing
- [ ] Documentation update
- [ ] Creator onboarding materials

**V2 Milestones:**

- July: Closed Alpha with 50 creators
- September: Public creator onboarding
- November: 100+ creator worlds live

---

### V3: Process Integration (2027)

**Theme:** *Show the work. Build in public. Connect through creation.*

**Goal:** Integrate creative transparency and collaboration, making TOPIA the creative internet of record.

#### Q1 2027: Timeline Beta

**January Sprints:**
- Sprint 1 (Jan 1-15): Enhanced timeline with process documentation
- Sprint 2 (Jan 16-31): Project milestones and progress tracking

**February Sprints:**
- Sprint 1 (Feb 1-15): Version history for world content
- Sprint 2 (Feb 16-28): Timeline search and filtering

**March Sprints:**
- Sprint 1 (Mar 1-15): Process templates
- Sprint 2 (Mar 16-31): Timeline analytics

#### Q2 2027: Collaboration Tools

**April Sprints:**
- Sprint 1 (Apr 1-15): Direct messaging system
- Sprint 2 (Apr 16-30): Message threading and search

**May Sprints:**
- Sprint 1 (May 1-15): World-to-world collaboration features
- Sprint 2 (May 16-31): Shared opportunities board

**June Sprints:**
- Sprint 1 (Jun 1-15): Collaborative projects workspace
- Sprint 2 (Jun 16-30): Co-creation tools

#### Q3 2027: Analytics Dashboard

**July-September Sprints:**
- Creator insights (engagement, reach, growth)
- Audience demographics
- Content performance metrics

**V3 Milestones:**

- February: Timeline Beta
- May: Collaboration tools live
- September: Analytics + creator economy layer introduced

---

### V4: The Engine (2028+)

**Theme:** *Build worlds within worlds.*

**Goal:** Launch Spiral Engine — the storytelling and AI-powered backbone of the ecosystem.

### Spiral Engine Features

- AI-powered narrative design tools
- Multi-platform story distribution
- Personalized discovery and recommendations

### Creator Economy Tools

- Patronage and tipping system
- Licensing and rights management
- Premium world features and subscriptions

**Outcome:** A full creator engine — blending storytelling, economy, and technology into one living ecosystem.

---

---

# Cost Analysis & Budget

### Infrastructure & Operating Costs

### Monthly Costs by User Scale (Updated for Current Stack)

| Service | Beta (<100) | Early (1K) | Growth (10K) | Scale (50K) | Mature (100K+) |
| --- | --- | --- | --- | --- | --- |
| **Vercel Postgres** | $0 | $0 | $32 | $95 | $350 |
| **Vercel Hosting (Pro)** | $20 | $20 | $20 | $50 | $200 |
| **Vercel Blob Storage** | $0 | $0 | $5 | $25 | $100 |
| **Auth.js** | $0 | $0 | $0 | $0 | $0 |
| **Resend** | $0 | $0 | $20 | $80 | $200 |
| **PostHog** | $0 | $0 | $0 | $50 | $200 |
| **Sentry** | $0 | $0 | $26 | $80 | $200 |
| **Domain & SSL** | $2 | $2 | $2 | $2 | $2 |
| **Total Monthly** | **$22** | **$22** | **$105** | **$382** | **$1,252** |
| **Annual Cost** | **~$264** | **~$264** | **~$1,260** | **~$4,584** | **~$15,024** |

*Note: Using Auth.js (free, open-source) instead of Clerk saves $0-250/month depending on scale*

### V4 Additional Costs (AI Features - 2028+)

| Service | Growth (10K) | Scale (50K) | Mature (100K+) |
| --- | --- | --- | --- |
| **OpenAI/Anthropic API** | $500 | $2,000 | $5,000-20,000 |
| **Vector Database (Pinecone)** | $70 | $200 | $500-2,000 |
| **AI Total Monthly** | **$570** | **$2,200** | **$5,500-22,000** |

### Detailed Service Breakdown

### Vercel Postgres (Database)

- **Free tier:** 256MB storage, 60 compute hours/month
- **Pro plan included:** With Vercel Pro ($20/month total)
- **Additional usage:** $0.10/GB storage, $0.10/compute hour overage
- **Scaling:** Upgrade to dedicated database at ~25K users ($95/month)

**Key Difference from Supabase:** Vercel Postgres is database-only. Authentication, storage, and realtime must be handled separately.

**Scaling recommendations:**

- Free tier sufficient through early growth (~1K users)
- Monitor storage size and compute hours
- Plan for dedicated instance at ~25K users
- Consider Supabase migration if bundled services become more cost-effective

### Auth.js (Authentication) - FREE

- **Open-source:** No per-user costs
- **Self-hosted:** Runs on your Vercel deployment
- **Features:** Email/password, OAuth (Google, Apple, GitHub), magic links
- **Database:** Uses your Vercel Postgres via Drizzle adapter

**Why Auth.js over Clerk:**
- $0/month vs $25-250/month at scale
- Full control over user data
- No vendor lock-in
- Trade-off: More setup work, self-managed security

**Alternative - Clerk Pricing (if needed later):**
- Free tier: 10,000 MAU
- Pro: $25/month + $0.02/MAU over 10K
- At 50K users: ~$825/month
- At 100K users: ~$1,825/month

### Vercel Blob (File Storage)

- **Free tier:** 1GB storage, 1GB bandwidth/month
- **Pro plan:** Included with Vercel Pro
- **Overage:** $0.15/GB storage, $0.15/GB bandwidth

**Storage estimates:**
- Avatar: ~200KB average
- World cover: ~500KB average
- Media gallery: ~2MB per image
- At 10K users with 1K worlds: ~50GB storage = ~$5/month overage

### Vercel (Hosting)

- **Hobby tier (free):** Suitable for development only
- **Pro plan ($20/month):** Required for production
  - 1TB bandwidth
  - Unlimited sites
  - Team collaboration
  - Includes Postgres free tier
  - Includes Blob free tier
- **Enterprise:** Custom pricing for >100K users

**Scaling recommendations:**

- Pro tier sufficient through V2 (~10K users)
- Monitor bandwidth usage closely
- Consider Cloudflare Pages migration if monthly costs exceed $200

### Resend (Email)

- **Free tier:** 3,000 emails/month, 100 emails/day
- **Pro plan ($20/month):** 50,000 emails/month
- **Growth plan ($80/month):** 1M emails/month

**Email volume estimates:**

- Auth emails: ~2-3 per user (signup, verification, password reset)
- Invites: ~2-5 per active world per month
- Notifications: ~10-50 per active user per month (V2+)
- Budget 5-20 emails per active user per month

### PostHog (Analytics)

- **Free tier:** 1M events/month, 1 year data retention
- **Paid plans:** Start at $0.00031/event after 1M free events

**Event volume estimates:**

- Beta/Early: Well within free tier
- Growth (10K users): ~2-5M events/month = $0-500/month
- Scale: Consider self-hosting PostHog to reduce costs

### Sentry (Error Tracking)

- **Developer tier (free):** 5K errors/month, 1 project
- **Team plan ($26/month):** 50K errors/month, unlimited projects
- **Business plan ($80/month):** 250K errors/month

**Scaling recommendations:**

- Free tier adequate for beta testing
- Upgrade to Team tier before public launch
- Monitor error rates; healthy apps should stay under 10K errors/month

### Cost Optimization Strategies

1. **Start Lean:** Use free tiers for beta testing (target: <$25/month)
2. **Monitor Usage:** Set up billing alerts at 75% of tier limits
3. **Optimize Early:** Regular performance audits reduce bandwidth and compute costs
4. **Scale Strategically:**
    - Keep Vercel Pro through 25K users (~$20-100/month)
    - Use Auth.js instead of Clerk (saves $25-250/month)
    - Consider infrastructure migration at 50K+ users for 30-50% cost reduction
5. **Email Efficiency:** Implement digest emails instead of real-time notifications to reduce email volume
6. **Storage Management:** Implement image optimization (WebP, compression) and CDN caching to reduce storage costs
7. **Database Optimization:** Regular query optimization and indexing to reduce compute hours

### Expected Annual Operating Costs by Year

| Year | User Target | Low Estimate | High Estimate | Notes |
| --- | --- | --- | --- | --- |
| **2026 (V1-V2)** | 100-5,000 | $264 | $3,000 | Beta + Early Growth |
| **2027 (V3)** | 5,000-25,000 | $2,000 | $12,000 | Growth Phase |
| **2028 (V4)** | 25,000-100,000 | $15,000 | $50,000 | Scale + AI Features |
| **2029+** | 100,000+ | $30,000 | $100,000+ | Mature Platform + AI |

---

# Risk Mitigation & Contingency Planning

### Technical Risks

**Database Performance**

- **Risk:** Slow queries as data grows
- **Mitigation:** Implement proper indexing with Drizzle, use database monitoring, plan for dedicated instance at 25K+ users
- **Contingency:** Budget $100-300/month for additional database compute

**Storage Costs**

- **Risk:** Media uploads exceed storage budget
- **Mitigation:** Implement file size limits (5MB per upload), image compression (WebP), CDN caching
- **Contingency:** Migrate to Cloudflare R2 ($0.015/GB vs $0.15/GB)

**Bandwidth Overages**

- **Risk:** Viral growth causes unexpected bandwidth costs
- **Mitigation:** Implement CDN caching, image optimization, rate limiting
- **Contingency:** Emergency migration plan to Cloudflare Pages (can execute in 1-2 days)

**Authentication Security**

- **Risk:** Self-managed auth (Auth.js) requires more security vigilance
- **Mitigation:** Regular security audits, rate limiting, CSRF protection, secure session handling
- **Contingency:** Migrate to Clerk if security concerns arise (budget $50-250/month)

### Scaling Triggers

**When to upgrade infrastructure:**

1. **Database → Dedicated Instance ($95/month):**
    - Database size >256MB
    - Active users >10K
    - Query performance degradation
2. **Hosting → Enterprise/Migration:**
    - Monthly hosting costs >$500
    - Bandwidth >500GB/month
    - Users >50K
3. **Email → Higher Tier:**
    - Sending >80% of tier limit consistently
    - Approaching daily send limits
4. **Consider Supabase Migration:**
    - If bundled auth + storage + realtime becomes more cost-effective
    - If team bandwidth for managing separate services is limited

---

# V1 Acceptance Criteria

### Migration Complete

- ✅ All public pages live on TOPIA platform
- ✅ All databases migrated and functional
- ✅ Squarespace fully decommissioned
- ✅ Domain properly configured with SSL
- ✅ SEO preserved or improved from old site

### World System Functional

- ✅ Users can sign up with email magic link or Google OAuth
- ✅ Users can create and edit their profile
- ✅ Users can create a world with custom content
- ✅ Users can publish/unpublish worlds
- ✅ Admins can edit world content
- ✅ Admins can upload media to worlds
- ✅ Public can view published worlds

### Membership & Invites Working

- ✅ Admins can invite members via email
- ✅ Invited users receive email with secure link
- ✅ Users can accept or decline invites
- ✅ Admins can promote/demote members
- ✅ Admins can remove members
- ✅ Members can set their own world_role
- ✅ Multiple admins supported per world

### Social Graph Live

- ✅ Users can follow/unfollow other profiles
- ✅ Users can follow/unfollow worlds
- ✅ "Following" pages display correctly
- ✅ Follower counts accurate and update in real-time

### Databases Functional

- ✅ Tools, events, and opportunities browsable
- ✅ Search and filtering work correctly
- ✅ Admins can add/edit/delete entries
- ✅ Public submissions queue functional (optional)

### Performance & Quality

- ✅ All pages load in <3 seconds
- ✅ Core Web Vitals meet "Good" thresholds
- ✅ Mobile responsive design works on all devices
- ✅ No critical accessibility issues (WCAG 2.1 AA)
- ✅ Error monitoring active with <1% error rate

### Safety & Moderation

- ✅ Users can block other users
- ✅ Users can report content
- ✅ Admin moderation queue functional
- ✅ All security policies tested and secure

---

# Key Decision Points

### V2 Engagement Feature Selection

Before building V2, decide which engagement primitive to build first:

**Option 1 (Recommended): Timeline Posts (In/Process)**

- **Pros:** Core to "build in public" mission, scalable to V3, familiar UX pattern
- **Cons:** More complex to build, requires feed algorithm
- **Best for:** Creator-focused content, portfolio building, process documentation

**Option 2: World Guestbook/Comments**

- **Pros:** Simpler to build, drives world engagement, familiar pattern
- **Cons:** Less scalable to broader social features, potential moderation burden
- **Best for:** Community building around specific worlds, fan interaction

**Option 3: Likes + Comments on Posts**

- **Pros:** Full social feature set, high engagement potential
- **Cons:** Most complex, higher moderation needs, potential for toxicity
- **Best for:** Mature platform with established community norms

**Recommendation:** Start with Option 1 (Timeline Posts) in September 2026, add Option 2 (Comments) in V3 if needed.

### Infrastructure Migration Decision Point

**Trigger to consider Cloudflare Pages:**

- Monthly Vercel costs exceed $200-300
- Bandwidth consistently >100GB/month
- User base >25K active users
- Team has capacity for migration (1-2 week effort)

**Migration savings at 50K users:**

- Vercel Pro: $200-500/month
- Cloudflare Pages: $0-20/month
- **Potential savings: $180-480/month ($2,160-5,760/year)**

**Trigger to consider Supabase:**

- Managing separate auth, storage, and database becomes burdensome
- Team wants bundled realtime features for V2
- Cost comparison favors bundled solution

---

# Appendix: Additional Considerations

### Monitoring & Alerting Setup

**Critical Metrics to Track:**

1. **Application Performance**
    - Page load times (target: <2s for 75th percentile)
    - Time to First Byte (target: <600ms)
    - Core Web Vitals (LCP, FID, CLS)
2. **Database Health**
    - Query performance (slow query log via Vercel dashboard)
    - Compute hour usage
    - Database size growth rate
    - Connection pool usage
3. **User Engagement**
    - Daily/Monthly Active Users (DAU/MAU)
    - World creation rate
    - Invitation acceptance rate
    - Follow conversion rate
4. **Infrastructure Usage**
    - Bandwidth consumption
    - Blob storage usage growth
    - API request volume
    - Error rates by endpoint
5. **Business Metrics**
    - User signup conversion rate
    - World publication rate
    - Member invitation flow completion
    - Average time to first world

**Alert Thresholds:**

- Error rate >1% for 5 minutes
- Page load time >5s for 75th percentile
- Database compute hours >80% of monthly limit
- Storage >80% of tier limit
- Bandwidth >75% of tier limit

### Development Best Practices

**Code Organization:**

- Use TypeScript for type safety
- Implement feature flags for gradual rollouts (PostHog)
- Write integration tests for critical flows
- Document all database schema changes via Drizzle migrations
- Version control migration scripts

**Security Checklist:**

- All API routes protected with session validation
- Input validation on all user-submitted content
- Rate limiting on auth endpoints
- CSRF protection enabled
- Content Security Policy headers configured
- Regular dependency updates for security patches
- Auth.js security best practices followed

**Performance Optimization:**

- Implement lazy loading for images
- Use Next.js Image component for automatic optimization
- Enable ISR (Incremental Static Regeneration) for world pages
- Implement proper caching headers
- Use Neon serverless driver for connection pooling
- Optimize bundle size (<300KB initial load)

---

# Glossary

**Drizzle ORM:** TypeScript ORM that provides type-safe database queries and automatic migration generation.

**Auth.js (NextAuth.js):** Open-source authentication library for Next.js applications supporting various providers and strategies.

**Vercel Postgres:** Serverless PostgreSQL database integrated with Vercel's platform, powered by Neon.

**Vercel Blob:** Object storage service for files and media, integrated with Vercel's CDN.

**SSR (Server-Side Rendering):** Rendering web pages on the server rather than the client, improving SEO and initial load performance.

**ISR (Incremental Static Regeneration):** Next.js feature that allows static pages to be regenerated in the background while serving stale content.

**CDN (Content Delivery Network):** Distributed network of servers that delivers web content based on geographic location for faster load times.

**Core Web Vitals:** Google's metrics for measuring user experience: Largest Contentful Paint (LCP), First Input Delay (FID), and Cumulative Layout Shift (CLS).

**OAuth:** Open standard for access delegation, commonly used for "Login with Google" functionality.

**Magic Link:** Passwordless authentication method where users click a secure link sent to their email.

---

# Resources

- **Vercel:** [https://vercel.com/docs](https://vercel.com/docs)
- **Vercel Postgres:** [https://vercel.com/docs/storage/vercel-postgres](https://vercel.com/docs/storage/vercel-postgres)
- **Vercel Blob:** [https://vercel.com/docs/storage/vercel-blob](https://vercel.com/docs/storage/vercel-blob)
- **Auth.js:** [https://authjs.dev](https://authjs.dev)
- **Drizzle ORM:** [https://orm.drizzle.team](https://orm.drizzle.team)
- **Resend:** [https://resend.com/docs](https://resend.com/docs)
- **PostHog:** [https://posthog.com/docs](https://posthog.com/docs)
- **Sentry:** [https://docs.sentry.io](https://docs.sentry.io)

---

**Document Version:** 2.0

**Last Updated:** January 27, 2026

**Next Review:** March 2026 (Post V1 Q1 Completion)

---

# Changelog

**v2.0 (January 27, 2026)**
- Updated tech stack to reflect current implementation (Vercel Postgres + Drizzle ORM)
- Changed authentication from Supabase Auth to Auth.js (open-source, free)
- Changed storage from Supabase Storage to Vercel Blob
- Revised all cost projections for current stack (~40% lower in early stages)
- Added V4 AI cost projections (OpenAI/Anthropic API, Vector DB)
- Converted timeline to sprint format (Sprint 1: 1-15, Sprint 2: 16-30/31)
- Added detailed sprint breakdowns for all V1 months
- Updated security model from RLS to application-level with Drizzle middleware
- Added Auth.js vs Clerk cost comparison
- Updated glossary with new technologies
