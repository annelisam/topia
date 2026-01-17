# CSV to Vercel Postgres Migration Guide

This guide walks you through migrating your Google Spreadsheet data (Events, Grants, Tools) into Vercel Postgres.

## Prerequisites

✅ CSV files in Downloads folder:
- `[MASTER] events_db - Sheet1.csv`
- `[MASTER] grants_db - Sheet1.csv`
- `[MASTER] tools_full_db - tools_full_db.csv`

## Step 1: Set Up Vercel Postgres Database

### Option A: Create Database on Vercel (Recommended)

1. **Deploy to Vercel first** (if you haven't already):
   ```bash
   git init
   git add .
   git commit -m "Initial TOPIA setup"
   # Push to GitHub, then import to Vercel
   ```

2. **In Vercel Dashboard**:
   - Go to your project
   - Click "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Name it `topia-db`
   - Click "Create"

3. **Get Environment Variables**:
   - In the database page, click ".env.local" tab
   - Copy all the environment variables

4. **Add to Local Project**:
   ```bash
   # Create .env.local file
   cp .env.local.example .env.local

   # Paste the environment variables from Vercel into .env.local
   ```

### Option B: Use Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your Vercel project
vercel link

# Pull environment variables
vercel env pull .env.local
```

## Step 2: Push Database Schema

Once you have environment variables set up:

```bash
npm run db:push
```

This creates all the database tables:
- ✅ `events` - Event listings
- ✅ `grants` - Grant opportunities
- ✅ `tools` - Tool database
- ✅ `users` - For future platform
- ✅ `worlds` - For future platform
- ✅ `catalysts` - For future platform
- ✅ `tv_content` - For future platform

## Step 3: Run CSV Migration

Make sure your CSV files are in the Downloads folder, then:

```bash
npx tsx scripts/migrate-csv.ts
```

You should see output like:

```
🚀 Starting CSV migration to Vercel Postgres...

📅 Migrating events...
  ✓ CLUB TOPIA: THAT GIRL
  ✓ annie's actual bday: spelling bee edition
✅ Imported X events

💰 Migrating grants...
  ✓ Aaron Siskind Individual Photographer's Fellowship
  ✓ Adolph and Esther Gottlieb Foundation Individual Support Grant
✅ Imported X grants

🛠️  Migrating tools...
  ✓ Ableton
  ✓ Airtable
✅ Imported X tools

🎉 Migration completed successfully!
```

## Step 4: Verify Data

### Option 1: Use Drizzle Studio (Visual Interface)

```bash
npm run db:studio
```

This opens a web interface at `https://local.drizzle.studio` where you can browse and edit your data.

### Option 2: Check in Vercel Dashboard

1. Go to Vercel Dashboard → Storage → Your Database
2. Click "Data" tab
3. Browse tables: `events`, `grants`, `tools`

## Step 5: Deploy Updated Site

```bash
git add .
git commit -m "Add CSV migration and updated schema"
git push
```

Vercel will automatically redeploy with your new database structure.

---

## Database Schema Details

### Events Table
```typescript
{
  id: uuid,
  eventName: string,
  slug: string (auto-generated),
  date: string,
  startTime: string,
  city: string,
  link: string,
  imageUrl: string,
  published: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Grants Table
```typescript
{
  id: uuid,
  grantName: string,
  slug: string (auto-generated),
  shortDescription: string,
  amountMin: integer,
  amountMax: integer,
  currency: string,
  tags: string,
  eligibility: string,
  deadlineType: string,
  deadlineDate: string,
  link: string,
  region: string,
  category: string,
  frequency: string,
  orgName: string,
  status: string,
  notes: string,
  source: string,
  published: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Tools Table
```typescript
{
  id: uuid,
  name: string,
  slug: string (auto-generated),
  category: string,
  description: string,
  pricing: string,
  url: string,
  featured: boolean,
  priority: integer,
  easeOfUse: string,
  published: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## Troubleshooting

### Error: "spawn pnpm ENOENT"
You're using npm, not pnpm. Use `npm` commands instead of `pnpm`.

### Error: "Connection refused"
Make sure your `.env.local` file has the correct Vercel Postgres credentials.

### Error: "Duplicate key value violates unique constraint"
The slug field must be unique. If you're re-running the migration, you may need to clear the database first:

```bash
npm run db:studio
# Delete all rows from the tables you want to re-import
```

### Some rows failed to import
Check the console output - it will show which specific rows failed and why. Common issues:
- Missing required fields
- Invalid data types
- Duplicate slugs

---

## Next Steps

After migration:

1. **Create Dynamic Pages**: Build `/events/[slug]`, `/grants/[slug]`, `/tools/[slug]` pages
2. **Add Search**: Implement search/filter functionality
3. **Admin Dashboard**: Build UI for managing data without CSV exports
4. **API Routes**: Create API endpoints to query data

Let me know what you'd like to build next!
