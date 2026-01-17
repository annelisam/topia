# The Simplest Possible Guide 🚀

Just follow these 3 main steps. I'll help with details if you get stuck!

---

## STEP 1: Get Your Code on GitHub (5 min)

**What is GitHub?** A place to store your code online so Vercel can access it.

### Do This:
1. Go to https://github.com/signup and create an account
2. Click the **+** button (top right) → **New repository**
3. Name it: `topia`
4. Click **Create repository**
5. Copy the URL shown (looks like: `https://github.com/yourusername/topia.git`)

### Then in Terminal:
```bash
cd /Users/annelisamoody/topia

git init
git add .
git commit -m "Initial setup"
git remote add origin PASTE_YOUR_URL_HERE
git push -u origin main
```

✅ **Done!** Your code is on GitHub.

---

## STEP 2: Deploy to Vercel (5 min)

**What is Vercel?** A free hosting service that makes your website live on the internet.

### Do This:
1. Go to https://vercel.com/signup
2. Click **"Continue with GitHub"** (log in with GitHub account you just made)
3. Click **"Add New..."** → **"Project"**
4. Find your "topia" repository → Click **"Import"**
5. Click **"Deploy"** (don't change anything)
6. Wait 2-3 minutes

✅ **Done!** Your site is live (but database not connected yet).

---

## STEP 3: Add Database (10 min)

**What is Postgres?** A database to store your grants, tools, and events.

### Part A: Create Database in Vercel
1. In Vercel, click **"Storage"** tab
2. Click **"Create Database"** → **"Postgres"**
3. Name: `topia-db`
4. Click **"Create"**
5. Click **"Connect Project"** → Select "topia"

### Part B: Connect Database Locally
In Terminal:
```bash
# Install Vercel tool
npm i -g vercel

# Login
vercel login
# (Opens browser - click confirm)

# Connect to your project
vercel link
# Choose your project

# Get database credentials
vercel env pull .env.local
```

### Part C: Import Your Data
```bash
# Create database tables
npm run db:push

# Import your CSVs
npm run migrate:csv
```

You should see:
```
✅ Imported 10 events
✅ Imported 67 grants
✅ Imported 70 tools
```

### Part D: Deploy Updates
```bash
git add .
git commit -m "Add database"
git push
```

Wait 2-3 minutes for Vercel to redeploy.

✅ **Done!** Everything is connected and live!

---

## Test It!

Visit your live site at the URL Vercel gave you (something like `https://topia-abc123.vercel.app`)

Try these pages:
- `/resources/grants` - Should show all 67 grants
- `/resources/tools` - Should show all 70 tools

Try the filters and search - they should work!

---

## Common Questions

**Q: Where do I find my Vercel project URL?**
A: In Vercel dashboard, it's shown at the top. It looks like `topia-abc123.vercel.app`

**Q: What if I get an error?**
A: Tell me the exact error message and which step you're on!

**Q: Do I need a credit card?**
A: No! Everything we're using is on the free tier.

**Q: What if the CSV import fails?**
A: Make sure your CSV files are in the Downloads folder with these exact names:
- `[MASTER] events_db - Sheet1.csv`
- `[MASTER] grants_db - Sheet1.csv`
- `[MASTER] tools_full_db - tools_full_db.csv`

**Q: Can I use my own domain (topia.vision)?**
A: Yes! After everything works, go to Vercel → Settings → Domains and add it.

---

## Summary

That's it! Three main steps:
1. ✅ GitHub: Store your code
2. ✅ Vercel: Host your website
3. ✅ Database: Add your data

Each step is independent, so if you get stuck on one, we can fix it and move to the next.

**Ready to start?** Begin with Step 1 (GitHub) and let me know when you're done or if you hit any issues! 🚀
