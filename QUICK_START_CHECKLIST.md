# Quick Start Checklist ✓

Copy this checklist and check off items as you go!

## GitHub Setup
- [ ] Create GitHub account at https://github.com/signup
- [ ] Create new repository named "topia"
- [ ] Run: `git init`
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Initial setup"`
- [ ] Run: `git remote add origin YOUR_GITHUB_URL`
- [ ] Run: `git push -u origin main`

## Vercel Setup
- [ ] Create Vercel account at https://vercel.com/signup
- [ ] Use "Continue with GitHub"
- [ ] Import your "topia" repository
- [ ] Click "Deploy" (keep all defaults)
- [ ] Wait for deployment to finish

## Database Setup
- [ ] In Vercel: Go to Storage tab
- [ ] Click "Create Database" → Choose "Postgres"
- [ ] Name it "topia-db"
- [ ] Click "Create"
- [ ] Click "Connect Project" → Select your project
- [ ] Run: `npm i -g vercel`
- [ ] Run: `vercel login`
- [ ] Run: `vercel link`
- [ ] Run: `vercel env pull .env.local`

## Import Data
- [ ] Run: `npm run db:push`
- [ ] Run: `npm run migrate:csv`
- [ ] Verify: See success messages for events, grants, tools

## Test & Deploy
- [ ] Run: `npm run dev`
- [ ] Visit: http://localhost:3000/resources/grants
- [ ] Visit: http://localhost:3000/resources/tools
- [ ] Verify: Grants and tools are showing
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Add database"`
- [ ] Run: `git push`
- [ ] Wait for Vercel to auto-deploy
- [ ] Visit your live site!

## Done! 🎉
Your site is live at: `https://YOUR-PROJECT.vercel.app`

---

## Commands Reference

### Development
```bash
npm run dev              # Start local server
npm run build            # Test production build
npm run db:studio        # View database visually
```

### Database
```bash
npm run db:push          # Create/update tables
npm run migrate:csv      # Import CSV data
```

### Deployment
```bash
git add .
git commit -m "Your message"
git push                 # Auto-deploys to Vercel
```

### Vercel CLI
```bash
vercel                   # Deploy manually
vercel env pull          # Get environment variables
vercel logs              # View deployment logs
```

---

## Helpful Links

- **Your Vercel Dashboard**: https://vercel.com/dashboard
- **Your GitHub Repos**: https://github.com/YOUR-USERNAME?tab=repositories
- **Full Guide**: See `DEPLOYMENT_GUIDE.md` in this folder
- **Migration Guide**: See `MIGRATION.md` in this folder

---

## Getting Stuck?

1. Check the full `DEPLOYMENT_GUIDE.md` for detailed steps
2. Check Vercel deployment logs if build fails
3. Run `npm run db:studio` to verify data imported
4. Make sure `.env.local` exists and has database credentials
5. Try running `vercel env pull .env.local` again

You got this! 🚀
