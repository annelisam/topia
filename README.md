# TOPIA - Platform Migration

A Next.js-based platform for TOPIA, migrated from Squarespace to Vercel with Postgres database.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Vercel Postgres
- **ORM**: Drizzle ORM
- **Deployment**: Vercel

## Database Schema

The platform includes tables for:
- **Users**: Platform users (artists, admins, community members)
- **Worlds**: Artist-created spaces and projects
- **Catalysts**: People and organizations in the network
- **Events**: Upcoming gatherings and activities
- **Resources**: Tools, grants, and knowledge base items
- **TV Content**: TOPIA TV video content

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Vercel Postgres

1. Create a new project on [Vercel](https://vercel.com)
2. Go to Storage → Create Database → Postgres
3. Copy the environment variables to `.env.local`

### 3. Push Database Schema

```bash
npm run db:push
```

This will create all the tables in your Vercel Postgres database.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site.

## Database Commands

- `npm run db:generate` - Generate migration files
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (visual database browser)

## Deployment

The site is configured for Vercel deployment:

1. Push your code to GitHub
2. Connect the repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Next Steps

### Content Migration
- Export content from Google Spreadsheets
- Create seed scripts to populate database
- Migrate existing pages and content

### Features to Build
- [ ] Admin dashboard for content management
- [ ] User authentication and profiles
- [ ] Dynamic pages for Worlds, Catalysts, Events
- [ ] TOPIA TV video player
- [ ] Search functionality
- [ ] Newsletter signup
- [ ] Content filtering and sorting

### Design Enhancements
- [ ] Add animations and transitions
- [ ] Implement custom fonts
- [ ] Create mobile navigation
- [ ] Add image optimization
- [ ] Build out individual content pages

## Project Structure

```
topia/
├── app/                # Next.js app directory
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Homepage
├── lib/
│   └── db/            # Database configuration
│       ├── schema.ts  # Drizzle schema
│       └── index.ts   # Database instance
├── public/            # Static assets
└── drizzle.config.ts  # Drizzle configuration
```

## Environment Variables

Required variables in `.env.local`:

```
POSTGRES_URL=""
POSTGRES_PRISMA_URL=""
POSTGRES_URL_NON_POOLING=""
POSTGRES_USER=""
POSTGRES_HOST=""
POSTGRES_PASSWORD=""
POSTGRES_DATABASE=""
```

These are automatically provided by Vercel when you create a Postgres database.
