# TOPIA Setup Guide

## Quick Start

You now have a Next.js site ready to deploy to Vercel! Here's what's been set up:

### ✅ What's Done

1. **Next.js 16 Project** - Latest version with App Router, TypeScript, and Tailwind CSS
2. **Database Schema** - Postgres schema with tables for users, worlds, catalysts, events, resources, and TV content
3. **Basic Homepage** - Starter design inspired by your current TOPIA site
4. **Drizzle ORM** - Type-safe database queries

### 🚀 Next Steps to Deploy

#### 1. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial TOPIA platform setup"
```

#### 2. Push to GitHub

```bash
# Create a new repository on GitHub, then:
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

#### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click "Deploy"

#### 4. Set Up Vercel Postgres Database

After deployment:

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **Create Database**
3. Select **Postgres**
4. Choose a name (e.g., "topia-db")
5. Click **Create**
6. Vercel will automatically add environment variables to your project

#### 5. Push Database Schema

After database is created:

```bash
# Pull environment variables locally
vercel env pull .env.local

# Push your schema to the database
npm run db:push
```

Your database tables will now be created!

#### 6. View Your Site

Your site will be live at: `https://your-project-name.vercel.app`

---

## Database Migration from Google Spreadsheets

To migrate your existing data:

### Option 1: Manual Entry via Drizzle Studio

```bash
npm run db:studio
```

This opens a visual database browser where you can add data manually.

### Option 2: Create a Seed Script

1. Export your Google Spreadsheets as CSV
2. Create a `lib/db/seed.ts` file
3. Write a script to parse CSV and insert into database
4. Run: `npx tsx lib/db/seed.ts`

### Option 3: API Routes for Data Entry

I can help you create admin API routes to upload/manage content through a simple interface.

---

## Development Workflow

```bash
# Start dev server
npm run dev

# View database
npm run db:studio

# Push schema changes
npm run db:push

# Build for production (test before deploy)
npm run build
```

---

## What You Can Build Next

### Immediate Priorities

1. **Content Pages**: Create dynamic routes for `/worlds/[slug]`, `/catalysts/[slug]`, `/events/[slug]`
2. **Admin Dashboard**: Build protected routes for content management
3. **Data Migration**: Move Google Spreadsheet data into Postgres

### Platform Features

1. **User Authentication**: Use NextAuth.js or Clerk for user management
2. **Admin CMS**: Build your own admin interface or integrate with headless CMS
3. **Video Player**: Integrate video hosting (Vimeo, YouTube, or self-hosted)
4. **Search**: Add full-text search for content discovery
5. **Newsletter**: Integrate with Mailchimp or ConvertKit

### Design Polish

1. Add custom fonts and brand colors
2. Implement animations (Framer Motion)
3. Add image optimization with Next.js Image
4. Build mobile-responsive navigation
5. Create loading states and transitions

---

## Project Architecture

```
topia/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Homepage
│   ├── worlds/             # Worlds section (TODO)
│   ├── catalysts/          # Catalysts section (TODO)
│   ├── events/             # Events section (TODO)
│   └── api/                # API routes (TODO)
├── lib/
│   └── db/
│       ├── schema.ts       # Database schema
│       └── index.ts        # DB instance
├── components/             # Reusable components (TODO)
├── public/                 # Static assets
└── drizzle.config.ts       # Drizzle configuration
```

---

## Questions?

Let me know what you want to build next! Some options:

- Create dynamic content pages
- Build an admin dashboard
- Set up user authentication
- Migrate spreadsheet data
- Enhance the design
- Add specific features from your Squarespace site

The foundation is ready - you can scale from here! 🚀
