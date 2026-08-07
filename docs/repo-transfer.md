# Repo transfer runbook — annelisam/topia → topiavision/topia

Completed 2026-08-07. Kept as a record and as the checklist for any future
account/org move.

## What moved

- GitHub repository only. The Vercel project, domains (`topia.vision`),
  env vars, Neon DB, Privy, Resend, Square, and Vercel Blob were untouched —
  all of those are keyed by env vars or scoped to the Vercel project, not
  the repo location.
- The Vercel *team* was renamed in place (`annelisas-projects` → `topiavision`,
  same team ID, same project ID), so no Vercel resources moved either.

## Checklist (in order)

1. [x] Create the GitHub organization (`topiavision`), free plan.
2. [x] Merge freeze: zero open PRs, nothing between deployed SHA and `main`.
3. [x] GitHub → repo Settings → Danger Zone → Transfer ownership → org.
       Old URLs redirect; instant when you own both sides.
4. [x] Vercel GitHub App has access to the repo under the org
       (github.com/apps/vercel → Configure → topiavision).
5. [x] Vercel project → Settings → Git shows `topiavision/topia`.
       (Vercel tracks the repo by numeric ID, so this can update on its own —
       still verify with a real deployment, which is what this PR is.)
6. [x] Local clone: `git remote set-url origin https://github.com/topiavision/topia.git`
7. [x] Proof (preview): this PR built a green preview deployment from the
       org repo after a disconnect/reconnect of the Git integration —
       note the reconnect was REQUIRED even though the settings page
       already displayed the new repo path (the stored connection still
       referenced the old installation).
8. [ ] Proof (production): merging this PR produces a green production
       deployment on topia.vision.

## Standing rules after the move

- **Never create a new repo named `topia` under `annelisam`** — it would
  break GitHub's redirects for old links and clones.
- The org's sole owner is the `annelisam` account. When the team grows,
  add a second owner as recovery insurance.
- `vercel env pull .env.local` now targets `topiavision/topia` on Vercel
  (same project ID — the team was renamed, not moved; the Vercel CLI links
  by ID, so existing `.vercel/` links keep working).
