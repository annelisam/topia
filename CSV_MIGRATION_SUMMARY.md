# CSV Migration - Quick Reference

## ✅ What's Ready

Your database schema has been updated to match your CSV files:

### Events (from `events_db`)
- **Fields**: event_name, date, start_time, city, link, img_url
- **Table**: `events`
- **Rows**: ~10 events

### Grants (from `grants_db`)
- **Fields**: grant_name, short_description, amount_min, amount_max, currency, tags, eligibility, deadline_type, deadline_date, link, region, category, frequency, org_name, status, notes, source
- **Table**: `grants`
- **Rows**: ~60+ grants

### Tools (from `tools_full_db`)
- **Fields**: Name, Category, Description, Pricing, URL, Featured, Priority, Ease of Use
- **Table**: `tools`
- **Rows**: ~100+ tools

## 🚀 Quick Start (3 Steps)

### 1. Set Up Vercel Postgres
```bash
# Deploy to Vercel first, then:
# In Vercel Dashboard: Storage → Create Database → Postgres
# Copy the .env.local variables from Vercel
```

### 2. Create Tables
```bash
npm run db:push
```

### 3. Import CSV Data
```bash
npm run migrate:csv
```

That's it! Your data is now in Postgres.

## 📊 View Your Data

```bash
npm run db:studio
```

Opens a visual database browser at `https://local.drizzle.studio`

## 🔄 What Changed

### Old Setup
- Google Spreadsheets
- Manual data management
- No relationships
- Limited querying

### New Setup
- Vercel Postgres (free tier: 256MB, 10K rows)
- Type-safe queries with Drizzle ORM
- Automatic timestamps and IDs
- Auto-generated slugs for URLs
- Ready for relationships and complex queries

## 📝 Schema Highlights

All tables include:
- ✅ **UUID primary keys** (auto-generated)
- ✅ **Slug fields** (auto-generated from names for clean URLs)
- ✅ **Published flag** (to show/hide content)
- ✅ **Timestamps** (created_at, updated_at)

## 🎯 Next Steps

Choose your adventure:

### Option 1: Build Dynamic Pages
Create pages to display your data:
- `/events/[slug]` - Individual event pages
- `/grants/[slug]` - Grant detail pages
- `/tools/[slug]` - Tool detail pages

### Option 2: Add Search & Filters
- Filter grants by amount, deadline, region
- Search tools by category, pricing
- Sort events by date

### Option 3: Build Admin Dashboard
- Add/edit/delete content without CSVs
- Bulk operations
- Preview before publishing

### Option 4: Create API Routes
- `/api/grants` - List all grants
- `/api/tools?category=music` - Filtered tools
- `/api/events/upcoming` - Upcoming events

## 💡 Pro Tips

1. **Test locally first**: Use `npm run db:studio` to check data before building pages
2. **Use slugs for URLs**: `/grants/aaron-siskind-fellowship` instead of `/grants/123`
3. **Keep CSVs as backup**: Store originals in case you need to re-import
4. **Start small**: Build one feature at a time, test, then expand

## 📚 Documentation

- **MIGRATION.md** - Detailed migration guide
- **SETUP.md** - Project setup instructions
- **README.md** - General project info

## Need Help?

Common commands:
```bash
npm run dev          # Start dev server
npm run db:studio    # View database
npm run db:push      # Update schema
npm run migrate:csv  # Import CSVs
```

Questions? Let me know what you want to build next!
