# Complete Deployment Guide - GitHub to Vercel

Let's get your TOPIA site live! This guide walks through everything step-by-step.

---

## Part 1: Set Up GitHub (5 minutes)

### Step 1: Create GitHub Account

1. Go to https://github.com/signup
2. Enter your email address
3. Create a password
4. Choose a username (e.g., "annelisamoody" or "topia-vision")
5. Verify your email
6. Complete the setup

### Step 2: Create a New Repository

1. Once logged in, click the **+** icon in top right → **New repository**
2. Repository settings:
   - **Name**: `topia` (or whatever you want)
   - **Description**: "TOPIA platform - artist-led creative network"
   - **Visibility**: Choose "Private" (or "Public" if you want it open)
   - **DO NOT** check "Initialize with README" (we already have files)
3. Click **Create repository**

### Step 3: Push Your Code to GitHub

You'll see a page with instructions. Copy the repository URL (it looks like `https://github.com/YOUR-USERNAME/topia.git`).

Now in your terminal, run these commands:

```bash
# Navigate to your project
cd /Users/annelisamoody/topia

# Initialize git (if not already done)
git init

# Add all files
git add .

# Make your first commit
git commit -m "Initial TOPIA platform setup"

# Add GitHub as remote (replace with YOUR repository URL)
git remote add origin https://github.com/YOUR-USERNAME/topia.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Troubleshooting:**
- If it asks for credentials, use your GitHub username and password
- If you have 2FA enabled, you'll need a personal access token:
  1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Generate new token with "repo" permissions
  3. Use the token as your password

✅ **You're done!** Your code is now on GitHub.

---

## Part 2: Set Up Vercel Account (3 minutes)

### Step 1: Create Vercel Account

1. Go to https://vercel.com/signup
2. Click **"Continue with GitHub"** (easiest option)
3. Authorize Vercel to access your GitHub account
4. Complete your profile

✅ **You're done!** Vercel account created.

---

## Part 3: Deploy Your Site to Vercel (5 minutes)

### Step 1: Import Your GitHub Repository

1. On Vercel dashboard, click **"Add New..."** → **"Project"**
2. You'll see a list of your GitHub repositories
3. Find "topia" and click **"Import"**

### Step 2: Configure Project

Vercel will auto-detect Next.js settings:
- **Framework Preset**: Next.js (auto-detected ✓)
- **Root Directory**: ./ (leave as is)
- **Build Command**: `npm run build` (auto-filled)
- **Output Directory**: `.next` (auto-filled)

**Environment Variables**: Leave blank for now (we'll add them after creating the database)

4. Click **"Deploy"**

⏱️ **Wait 2-3 minutes** while Vercel builds and deploys your site.

✅ **You're done!** Your site is live at `https://topia-RANDOM.vercel.app`

---

## Part 4: Set Up Vercel Postgres Database (5 minutes)

### Step 1: Create Database

1. In your Vercel project dashboard, click the **"Storage"** tab (top menu)
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Choose:
   - **Database Name**: `topia-db` (or whatever you want)
   - **Region**: Choose closest to you (e.g., US West for California)
5. Click **"Create"**

⏱️ **Wait 30-60 seconds** for database to provision.

### Step 2: Connect Database to Your Project

1. After database is created, you'll see a dialog:
   - Click **"Connect Project"**
   - Select your "topia" project
   - Click **"Connect"**

✅ Environment variables are now automatically added to your Vercel project!

### Step 3: Get Environment Variables Locally

Back in your terminal:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login
# Follow the prompts - it will open a browser

# Link your local project to Vercel
vercel link
# Choose your team (or personal account)
# Choose your "topia" project

# Pull environment variables
vercel env pull .env.local
```

✅ **You're done!** You now have a `.env.local` file with all your database credentials.

---

## Part 5: Create Database Tables (2 minutes)

Now that you have database credentials:

```bash
# Push your schema to create all tables
npm run db:push
```

You should see output like:
```
✓ Pushing schema changes to database...
✓ Done!
```

✅ **You're done!** Your database tables are created:
- events
- grants
- tools
- users
- worlds
- catalysts
- tv_content

---

## Part 6: Import Your CSV Data (2 minutes)

```bash
# Run the migration script
npm run migrate:csv
```

You should see output like:
```
🚀 Starting CSV migration to Vercel Postgres...

📅 Migrating events...
  ✓ CLUB TOPIA: THAT GIRL
  ✓ annie's actual bday: spelling bee edition
  ...
✅ Imported 10 events

💰 Migrating grants...
  ✓ Aaron Siskind Individual Photographer's Fellowship
  ...
✅ Imported 67 grants

🛠️  Migrating tools...
  ✓ Ableton
  ✓ Airtable
  ...
✅ Imported 70 tools

🎉 Migration completed successfully!
```

✅ **You're done!** Your data is now in the cloud database.

---

## Part 7: Verify Everything Works (3 minutes)

### Test Locally

```bash
npm run dev
```

Visit these URLs:
- http://localhost:3000 - Homepage
- http://localhost:3000/resources/grants - Should show your 67 grants
- http://localhost:3000/resources/tools - Should show your 70 tools

Try:
- Searching for grants
- Filtering by tags
- Filtering tools by category

### Check Database Visually

```bash
npm run db:studio
```

This opens a visual database browser at https://local.drizzle.studio where you can see all your data.

---

## Part 8: Deploy Updates (1 minute)

Your site is already live, but it doesn't have the database connected yet. Let's redeploy:

```bash
# Add any new changes
git add .

# Commit
git commit -m "Add database connection and CSV import"

# Push to GitHub
git push
```

⏱️ Vercel will **automatically detect the push** and redeploy your site (takes 2-3 minutes).

✅ **You're done!** Your live site now has the database connected.

---

## Your Live URLs

After deployment, your site will be at:
- **Homepage**: `https://YOUR-PROJECT.vercel.app`
- **Grants**: `https://YOUR-PROJECT.vercel.app/resources/grants`
- **Tools**: `https://YOUR-PROJECT.vercel.app/resources/tools`

---

## Summary - What You Just Did

✅ Created GitHub account and repository
✅ Pushed code to GitHub
✅ Created Vercel account
✅ Deployed site to Vercel
✅ Created Postgres database
✅ Connected database to project
✅ Pulled environment variables locally
✅ Created database tables
✅ Imported 67 grants, 70 tools, 10 events
✅ Verified everything works
✅ Deployed updates

---

## Optional: Custom Domain

Want to use `topia.vision` instead of `*.vercel.app`?

1. In Vercel project → Settings → Domains
2. Add your domain
3. Update your domain's DNS settings (Vercel will show you how)

---

## Troubleshooting

### "Command not found: vercel"
```bash
npm install -g vercel
```

### "Permission denied" when installing Vercel CLI
```bash
sudo npm install -g vercel
```

### "Failed to fetch grants"
- Check that environment variables are set:
  ```bash
  cat .env.local
  ```
- Make sure you ran `vercel env pull .env.local`
- Make sure you ran `npm run db:push`

### CSV migration fails
- Make sure CSV files are in `~/Downloads/` folder
- Check file names match exactly:
  - `[MASTER] events_db - Sheet1.csv`
  - `[MASTER] grants_db - Sheet1.csv`
  - `[MASTER] tools_full_db - tools_full_db.csv`

### Build fails on Vercel
- Check the build logs in Vercel dashboard
- Most common: missing environment variables (they're added automatically when you connect the database)

---

## Need Help?

If you get stuck at any step, let me know exactly where and I can help debug!

---

## Next Steps After Deployment

1. **Test your live site** - Visit all the pages
2. **Share the URL** - Send it to friends/colleagues
3. **Custom domain** - Set up topia.vision
4. **Build more features**:
   - Detail pages for grants/tools
   - Events listing page
   - Admin dashboard
   - User authentication

You're live! 🚀
