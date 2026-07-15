# Topia Site Audit — Lighthouse + UI/UX

**Date:** 2026-07-06 · **Method:** Lighthouse 8-page run against production (topia.vision, mobile emulation + desktop on landing), plus full code audit of performance/SEO/a11y root causes and a UX heuristic review of every major flow.
**Status:** Suggestions only. No code has been changed.

---

## How to execute this document (instructions for the implementing model)

1. **Read `CLAUDE.md` first and obey it.** Especially: never run `drizzle-kit`; prefix node commands with `export PATH=/opt/homebrew/bin:$PATH`; branch per change; `npm run lint && npm run build` before any push; never merge to main yourself.
2. **One task = one branch = one PR.** Use the task ID in the commit scope, e.g. `perf(events): render downsized Giphy renditions [PERF-04]`. Do not batch tasks, do not do drive-by refactors outside the task's listed files.
3. **Do not change the visual identity.** Bone/obsidian/lime, Basement Grotesque, grain overlays, uppercase mono micro-labels are intentional brand decisions. Contrast fixes adjust opacity/token values minimally — they do not redesign anything.
4. **Verify before claiming done.** UI tasks: run the `ui-audit` skill (light + dark + 375px screenshots). Shipping: run the `ship` skill. Each task below has acceptance criteria — check every box.
5. **Retest command** (from repo root, after deploy — Lighthouse must run against production, dev-mode scores are meaningless):
   ```bash
   export PATH=/opt/homebrew/bin:$PATH && npx --yes lighthouse https://topia.vision/events \
     --output=html --output-path=./lh-report.html --chrome-flags="--headless=new" \
     --only-categories=performance,accessibility,best-practices,seo
   ```
6. If a task turns out to conflict with what the code actually does, stop and report the discrepancy instead of improvising.

---

## Measured baseline (production, 2026-07-06)

| Page | Perf | A11y | Best Practices | SEO | LCP | CLS | Page weight |
|---|---|---|---|---|---|---|---|
| `/` (landing) mobile | 59 | 100 | 77 | 100 | 14.3s | 0.014 | 18.1 MB |
| `/` desktop | 90 | 100 | 77 | 100 | 1.9s | 0.018 | 18.1 MB |
| `/events` | 68 | 87 | 77 | 100 | 17.4s | 0.002 | 3.2 MB |
| `/events/[slug]` | 49 | 96 | 77 | 91 | 20.7s | **0.454** | **21.3 MB** |
| `/worlds` | 46 | 96 | 73 | 100 | **52.0s** | 0.211 | 18.5 MB |
| `/worlds/[slug]` | 58 | 96 | 73 | 100 | 10.1s | 0 | 3.3 MB |
| `/@username` (profile) | 65 | 96 | 73 | 91 | 6.5s | 0 | 3.5 MB |
| `/resources/tools` | 57 | 90 | 73 | 100 | 17.0s | 0 | 2.8 MB |

**Verified root causes (do not re-derive these — they were measured):**
- Landing page ships a **16.0 MB autoplay video** (`public/brand/star-sequence.mp4`).
- Event detail ships **13.8 MB of full-resolution Giphy GIFs** in comments (three GIFs at 4.5/4.2/3.8 MB, each displayed ~220px wide).
- `public/brand/logo-white.png` is **646 KB** and loads on worlds/world-detail/profile pages.
- `app/layout.tsx:61` loads a **render-blocking Typekit stylesheet** (`use.typekit.net/gjn0rep.css`) on every page, costing 1.0–2.0s of blocking time — and the font it serves (`pf-pixelscript`) **is used nowhere in the codebase** (verified by grep).
- `/events` and `/worlds` render **zero content in server HTML** (verified by curl) — pages are `'use client'` shells that fetch in `useEffect`, which is why LCP is 17–52s.
- `robots.txt` and `sitemap.xml` **404 in production** (verified by curl).
- `worlds/[slug]` serves the **generic site title/description** (no per-world metadata; verified by curl). The landing page has **no `og:image`** (verified by curl).
- ~313 KB unused JS on every page (Privy auth bundle loads globally).
- No `app/error.tsx`, `app/not-found.tsx`, or any `loading.tsx` exist (verified by find).
- No toast/notification system exists; 57 `console.error` calls are the only failure feedback.

---

# PHASE 1 — Quick wins (small diffs, large measured impact)

Do these first, in order. Each is an independent PR.

### PERF-01 · Remove the unused Typekit stylesheet
- **Priority:** P0 · **Effort:** trivial · **Impact:** −1.0–2.0s render-blocking on EVERY page
- **Files:** `app/layout.tsx` (line ~61)
- **Problem:** `<link rel="stylesheet" href="https://use.typekit.net/gjn0rep.css" />` blocks first paint on all pages. The kit serves only `pf-pixelscript`, which appears in zero components or CSS files. All real fonts (GT Zirkon, Basement Grotesque) are self-hosted in `public/fonts/`.
- **Do:** Delete the `<link>` line. Grep the repo for `pixelscript` and `typekit` to confirm nothing references them.
- **Accept when:** grep returns nothing; site renders identically in preview (both themes); FCP improves on retest.

### PERF-02 · Compress the landing video (16 MB → ≤2 MB)
- **Priority:** P0 · **Effort:** small · **Impact:** landing page 18.1 MB → ~2.5 MB; mobile LCP 14.3s → expect <4s
- **Files:** `public/brand/star-sequence.mp4`, `app/page.tsx` (the `<video>` element)
- **Problem:** A 16 MB decorative loop autoplays on first touch with the brand.
- **Do:**
  1. Re-encode (keep a backup of the original OUTSIDE the repo, e.g. scratchpad):
     `ffmpeg -i star-sequence.mp4 -vf "scale=720:-2" -an -c:v libx264 -crf 30 -preset slow -movflags +faststart star-sequence-new.mp4` — iterate crf until ≤2 MB while the star still looks clean (it's high-contrast line art; crf 30–34 should be fine). If ffmpeg is unavailable locally, say so and stop.
  2. Replace the file (same name/path — no code change needed), add `preload="auto"` to the `<video>` only if not present.
- **Accept when:** file ≤2.5 MB; video still loops smoothly in preview at desktop + 375px; total landing page weight <4 MB on retest.

### PERF-03 · Compress logo-white.png (646 KB → ≤30 KB)
- **Priority:** P0 · **Effort:** trivial · **Impact:** −630 KB on worlds, world-detail, profile pages
- **Files:** `public/brand/logo-white.png`; used in `app/worlds/page.tsx`, `app/worlds/[slug]/page.tsx`, `app/profile/[username]/page.tsx`, `app/events/_components/EventComposer.tsx`
- **Do:** Find the largest rendered size of this logo across those four usages (inspect the CSS classes). Resize the PNG to 2× that display width and compress (`sips` or `ffmpeg`/`sharp`); or if `public/brand/logo.svg` is the same mark, switch usages to an SVG variant. Keep the same file path if staying PNG so no code changes.
- **Accept when:** file ≤30 KB; logo renders crisp on retina (2× check) in both themes on all four surfaces.

### PERF-04 · Render downsized Giphy renditions (13.8 MB → ~0.4 MB on event pages)
- **Priority:** P0 · **Effort:** small · **Impact:** event detail 21.3 MB → ~7 MB and LCP 20.7s way down; also fixes messages + guestbook weight
- **Files:** `app/components/CommentSection.tsx` (line ~247: `<img src={c.imageUrl} ... max-w-[220px]`), `app/components/profile/GuestbookLayer.tsx`, `app/messages/Thread.tsx`
- **Problem:** Comments/guestbook/DMs store and render the ORIGINAL Giphy URL (`media2.giphy.com/media/<id>/giphy.gif`, 4+ MB each) displayed at ~220px wide. The DB already stores `giphyId` alongside `imageUrl`.
- **Do:** In each render site, when `giphyId` is present, build the display URL as `https://media.giphy.com/media/<giphyId>/200w.gif` instead of using the stored full-size `imageUrl` (keep `imageUrl` as fallback when `giphyId` is null). Add `loading="lazy"` and explicit `width`/`height` (or `aspect-ratio` via style) to these `<img>`s. Do NOT migrate DB data — this is render-time only.
- **Accept when:** an event page with GIF comments loads each GIF ≤300 KB (check preview_network); GIFs still animate; layout unchanged in both themes; legacy comments without `giphyId` still render.

### PERF-05 · Size + lazy-load raw `<img>` elements (kills CLS 0.454 / 0.211)
- **Priority:** P1 · **Effort:** medium (mechanical) · **Impact:** CLS on event detail (0.454→<0.1) and worlds (0.211→<0.1); Lighthouse `unsized-images` passes
- **Files:** `app/events/[slug]/EventDetailClient.tsx` + `app/events/EventCover.tsx` + `app/components/EventGallery.tsx`; `app/worlds/page.tsx`; `app/home/page.tsx` avatar/gallery imgs; `app/resources/tools/ToolsList.tsx` favicons
- **Problem:** Dozens of `<img>` tags without `width`/`height`/`aspect-ratio`; Lighthouse flagged the event-detail block `<div class="mt-6 pt-6 border-t">` shifting 0.454 as media loads in.
- **Do:** For every `<img>` in the listed files: (a) if the container has a known aspect (covers are square 1200×1200, avatars are circles), add `width`/`height` attributes or `style={{aspectRatio:'1'}}`; (b) add `loading="lazy"` to everything below the first viewport (galleries, comment images, list thumbnails, favicons — NOT the event cover/hero); (c) favicons get `width="16" height="16" loading="lazy"`.
- **Accept when:** `unsized-images` and `layout-shifts` audits pass on retest for /events/[slug] and /worlds; no visual change (ui-audit screenshots).

### SEO-01 · Add robots.ts and sitemap.ts
- **Priority:** P0 · **Effort:** small · **Impact:** site becomes crawlable/indexable properly (both currently 404)
- **Files:** create `app/robots.ts`, `app/sitemap.ts`
- **Do:**
  - `app/robots.ts`: allow `/`, disallow `/admin`, `/dashboard`, `/onboarding`, `/api`, `/messages`; point to `https://topia.vision/sitemap.xml`.
  - `app/sitemap.ts`: static entries (`/`, `/events`, `/worlds`, `/resources/tools`, `/resources/grants`, `/tv`, `/topians`, `/about`, `/contact`) + dynamic entries queried from the DB with drizzle: published events (`/events/<slug>`), published worlds (`/worlds/<slug>`), users with usernames (`/profile/<username>`), published tools (`/resources/tools/<slug>`). Import `db` from `@/lib/db`; filter `published = true` where the column exists. Cap at a few thousand entries.
- **Accept when:** `curl https://topia.vision/robots.txt` and `/sitemap.xml` return 200 with correct content after deploy (locally: hit them on the dev server); sitemap contains real event/world/profile URLs and no admin/draft URLs.

### SEO-02 · Per-page metadata for worlds + og:image for landing
- **Priority:** P1 · **Effort:** small · **Impact:** world links unfurl properly when shared; SEO for world pages (currently generic site metadata — verified)
- **Files:** create `app/worlds/[slug]/layout.tsx` (metadata only); `app/layout.tsx` (root metadata)
- **Do:**
  1. Copy the working pattern from `app/events/[slug]/page.tsx` `generateMetadata` (it's the good example — title, description, openGraph incl. image, twitter card). Query the world by slug with drizzle; use `world.headerImageUrl ?? world.imageUrl` for og:image; fall back gracefully for missing worlds.
  2. Add an `openGraph.images` entry to the root layout metadata (the landing page currently has NO og:image — pick an existing brand asset in `public/brand/`, must be ≥1200×630 or note that one needs to be created).
- **Accept when:** `curl -s https://topia.vision/worlds/chroma | grep og:` shows world-specific title/description/image after deploy (locally verify on dev server); landing HTML contains `og:image`.

### SEO-03 · Canonical URLs for the profile path trio
- **Priority:** P2 · **Effort:** small · **Impact:** removes duplicate-content risk across `/@user` → 307 → `/profile/user` and `/u/user`; the 307 also costs mobile users ~840ms (measured)
- **Files:** the profile metadata source (`app/profile/[username]/` layout with generateMetadata); any internal components linking to `/@` paths
- **Do:** (a) add `alternates: { canonical: 'https://topia.vision/profile/<username>' }` to profile generateMetadata; (b) make internal links (nav, cards, directories) link straight to `/profile/<username>` — keep `/@username` working for external/shared links only.
- **Accept when:** profile HTML contains the canonical tag; grep shows no internal `href` building `/@` links (shortlink/share copy still may — that's fine, it's the public-facing pretty URL).

### A11Y-01 · Label the filter `<select>` elements
- **Priority:** P1 · **Effort:** trivial · **Impact:** fixes `select-name` failure on /events (A11y 87) and /resources/tools (A11y 90)
- **Files:** `app/events/page.tsx` (city dropdown), `app/resources/tools/ToolsList.tsx` (+ check `app/resources/grants/GrantsList.tsx`)
- **Do:** Add `aria-label="Filter by city"` (events) / `aria-label="Filter by category"` (tools/grants) to each unlabeled `<select>`.
- **Accept when:** Lighthouse `select-name` passes on both pages.

### A11Y-02 · Fix heading order on card grids
- **Priority:** P1 · **Effort:** trivial · **Impact:** fixes `heading-order` failure on /events and /resources/tools
- **Files:** `app/events/page.tsx`, `app/resources/tools/ToolsList.tsx` (card title elements, currently `<h3>` with no `<h2>` ancestor level)
- **Do:** Either change card titles from `<h3>` to `<h2>` (if the page's section titles are `<h1>`), or demote card titles to `<p>` with the same classes (visual output identical — classes carry all styling). Choose whichever keeps exactly one `<h1>` per page and no skipped levels.
- **Accept when:** `heading-order` passes; visual diff is zero.

### A11Y-03 · Contrast pass on micro-labels (the systemic one)
- **Priority:** P1 · **Effort:** medium · **Impact:** `color-contrast` currently FAILS on 6 of 8 audited pages — this is the single biggest a11y deduction
- **Files:** `app/globals.css` + the specific patterns below (grep for them)
- **Problem — the four failing patterns, with measured ratios:**
  1. **Low-opacity mono labels on dark:** `opacity-25/-30/-40/-50` (and `text-ink/40`, `text-[var(--foreground)]/40`) on 9–13px text → ratios 2.06–4.35 (need 4.5).
  2. **Half-opacity text on lime chips:** `text-[var(--accent-text)]/50`, `text-obsidian/50`/`60` on `--lime` backgrounds → 3.25–4.41.
  3. **Bone text on pink badges:** `bg-pink` + bone text → 2.39.
  4. **Decorative floating words** (animated spans at opacity 0–0.11, the "sentient" ambient words) → flagged at 1.26–1.35 but they're decoration, not content.
- **Do:**
  1. Add a token in `globals.css`: `--text-muted` that resolves ≥4.5:1 on `--page-bg` in BOTH themes (dark: ~`#a3a19c`; light: ~`#5f5c55` — verify with a contrast checker). Replace the failing low-opacity utilities on TEXT with `text-[var(--text-muted)]` (opacity on borders/decoration can stay).
  2. On lime chips/buttons: full-opacity `--obsidian` text only — remove the `/50`-style opacity suffixes there.
  3. Pink badges: switch text to `--obsidian` (dark on pink passes; bone does not).
  4. Decorative animated words: add `aria-hidden="true"` to the container that renders them (axe then excludes them from contrast).
  5. Do this file-by-file via grep for the exact patterns; DON'T change `.meta-text`'s look globally without checking every usage in both themes (run ui-audit).
- **Accept when:** `color-contrast` passes on /events, /events/[slug], /worlds, /worlds/[slug], /@profile, /resources/tools on retest; ui-audit screenshots show the aesthetic is preserved (labels slightly stronger, not redesigned).

### A11Y-04 · Minimum tap-target size on tiny buttons
- **Priority:** P2 · **Effort:** small · **Impact:** fixes `target-size` failure on /events
- **Files:** `app/events/page.tsx` (the `text-[9px]` chip buttons flagged by Lighthouse)
- **Do:** Keep the 9px type if desired but grow the hit area: add padding so the rendered button is ≥24×24px with ≥8px spacing from neighbors (Lighthouse threshold), e.g. `px-3 py-2 -my-1`.
- **Accept when:** `target-size` passes; chips look the same density (ui-audit mobile screenshot).

### BP-01 · Error + 404 pages, favicon 404 cleanup
- **Priority:** P1 · **Effort:** small · **Impact:** best-practices `errors-in-console` on /resources/tools; no more white-screen crashes; proper 404s
- **Files:** create `app/not-found.tsx`, `app/error.tsx` (client component with reset button), `app/global-error.tsx`; edit `app/resources/tools/ToolsList.tsx`
- **Do:**
  1. `not-found.tsx`: branded 404 ("This page doesn't exist") + link home, styled with existing tokens/PageShell patterns.
  2. `error.tsx`: `'use client'`, shows "Something went wrong" + a Try again button calling `reset()`. Match brand styling.
  3. Tool favicons: the gstatic faviconV2 fallback 404s in console for dead domains — add `onError={(e) => { e.currentTarget.style.display = 'none'; }}` to favicon `<img>`s.
  4. Wire profile-not-found: `app/profile/[username]/page.tsx` currently goes blank on a 404 fetch — render a "User not found" state (or call `notFound()` if server-side) instead.
- **Accept when:** visiting `/definitely-not-a-page` shows the branded 404 in preview; tools page console has no favicon 404s; profile for a fake username shows the not-found state, not a blank page.

---

# PHASE 2 — Structural performance (bigger, do one PR per page)

### PERF-06 · Server-render the public pages (the LCP monster)
- **Priority:** P0 (highest total impact in the audit) · **Effort:** large — split per page, events list first
- **Files (one PR each, in this order):** `app/events/page.tsx` → `app/worlds/page.tsx` → `app/resources/tools/page.tsx` + `ToolsList.tsx` → `app/resources/grants/` → `app/home/page.tsx`
- **Problem:** These pages are `'use client'` and fetch from `/api/*` in `useEffect`. Server HTML contains zero content (verified). Mobile LCP: 17.4s (events), 52s (worlds), 17s (tools), 14.3s (home). This also means crawlers index empty pages.
- **Recipe (per page):**
  1. Make `page.tsx` an async **server component**. Fetch the initial public dataset directly with drizzle (import the query logic — reuse what the corresponding `/api/*` route does for the anonymous case; extract shared query code into `lib/<domain>/` if needed rather than duplicating).
  2. Pass the data as a prop to a new client child (e.g. `EventsPageClient.tsx`) that contains ALL the current interactive logic (tabs, search, saved/mine, Privy hooks) — i.e., move the existing component body there, initialize its state from the server-provided list instead of empty, and keep its existing `/api` calls only for viewer-specific data (saved events, mine tab).
  3. Add `export const revalidate = 60;` to the server page.
  4. **Guardrails:** don't touch the RSVP/auth flows; the Privy-dependent tabs must still wait for `ready` (CLAUDE.md mistake #5); keep URL/query behavior identical.
- **Accept when (per page):** `curl` of the page HTML contains real event/world/tool names; LCP on retest for that page <4s mobile; tabs/search/save still work logged-in and logged-out in preview; build passes.

### PERF-07 · next/image for covers + heroes
- **Priority:** P1 · **Effort:** medium · **Depends on:** PERF-06 landing/hero work is NOT required first
- **Files:** `next.config.ts` (add `images.remotePatterns` for `bvr5ifaoedrjv6m2.public.blob.vercel-storage.com` — use the actual hostname, and `formats: ['image/avif','image/webp']`), then convert the LARGE images only: event cover on `/events/[slug]` (with `priority`), featured event/world cards on list pages, world header images. Leave tiny avatars/favicons as `<img>` (PERF-05 already sized them).
- **Why bounded:** blob-stored covers are uploaded at full size (a 1.5 MB GIF cover was measured); next/image serves resized AVIF/WebP per viewport. Note: animated GIF covers are NOT optimized by next/image — pass those through with `unoptimized` or keep as `<img>`.
- **Accept when:** event cover request on a detail page is a `/_next/image` URL ≤200 KB (non-GIF covers); no layout shift introduced; Vercel image optimization quota noted in PR body.

### PERF-08 · Code-split the heavy client bundles
- **Priority:** P1 · **Effort:** medium · **Impact:** ~313 KB unused JS flagged on every page; TBT/TTI
- **Files:** wherever these are imported statically: `MessagesModal` (global, in nav/layout), `RsvpModal` (`app/events/[slug]/EventDetailClient.tsx`), `TicketPurchase` (Square SDK), the guestbook `DrawingCanvas`, GIF pickers.
- **Do:** Convert each to `next/dynamic` with `ssr: false` and a null/skeleton loading fallback, so they only download when opened. Do NOT attempt to remove/defer the Privy provider itself — it wraps auth state everywhere and deferring it will break the `ready && authenticated` gates (CLAUDE.md mistake #5). The modals are the safe 80%.
- **Accept when:** main bundle for `/events/[slug]` shrinks (compare `npm run build` output before/after in the PR body); opening messages, RSVP, drawing, and GIF picker still works in preview including on mobile width.

### PERF-09 · Font loading polish
- **Priority:** P2 · **Effort:** small
- **Files:** `app/layout.tsx`, `app/globals.css`, `public/fonts/`
- **Do:** (1) `<link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous">` for the two above-the-fold fonts (Basement Grotesque Black woff2 + the main GT Zirkon weight). (2) GT Zirkon ships as OTF — convert the 2–3 used weights to woff2 (~40% smaller) and update `@font-face` `src` with woff2-first, otf fallback. Keep `font-display: swap`.
- **Accept when:** fonts render identically; no FOUT regression in preview; font bytes drop in the network panel.

### SEO-04 · Investigate: meta description disappears after hydration
- **Priority:** P2 · **Effort:** investigation
- **Evidence:** server HTML for `/events/[slug]` and `/profile/[username]` contains `<meta name="description">` (verified by curl), yet Lighthouse (post-JS) reports `meta-description` missing on exactly those two pages.
- **Do:** Find what mutates `document.title`/head client-side on those routes (grep `document.title`, `useEffect` head manipulation, or a client `<title>` render). React 19 hoists client `<title>`/`<meta>` tags and Next may deduplicate — a client component rendering only a `<title>` can replace the head block. Fix so metadata stays server-owned (move any dynamic title back into `generateMetadata`).
- **Accept when:** Lighthouse SEO = 100 on both pages (rerun the retest command against them).

---

# PHASE 3 — UX improvements (from the heuristic review)

### UX-01 · Global toast + error feedback system
- **Priority:** P0 (biggest UX gap) · **Effort:** medium
- **Problem:** There is no toast component; 57 `console.error` calls are the only feedback for failed saves/sends/fetches. Users get silence when things fail.
- **Do:** Create `app/components/Toast.tsx`: a context provider (`ToastProvider` in `app/layout.tsx`) + `useToast()` hook exposing `toast.success(msg)` / `toast.error(msg)`; renders stacked, auto-dismissing (5s), bottom-center on mobile / bottom-right on desktop, styled with existing tokens (obsidian card, lime accent for success, `--orange` for errors), `role="status"` `aria-live="polite"`. Portal-rendered, `lvh`-safe, above `z-[10000]`.
  Then wire it into the top 5 failure points ONLY (keep the PR bounded): RSVP submit failure, event save/publish failure, message send failure, follow toggle failure, profile save failure — each currently a silent `console.error` in the corresponding component.
- **Accept when:** killing the network in devtools and attempting each of the 5 actions shows a readable error toast in both themes at 375px and desktop; no toast on success paths unless the action has no other visible feedback.

### UX-02 · Timeouts + retry for skeleton loaders
- **Priority:** P1 · **Effort:** small · **Files:** `app/events/page.tsx`, `app/home/page.tsx`, `app/tv/page.tsx`, `app/worlds/page.tsx` (whichever still client-fetch after PERF-06 — do this after PERF-06 to avoid rework)
- **Problem:** If an API call hangs, skeletons spin forever.
- **Do:** Wrap the client fetches in a helper with a 10s `AbortController` timeout; on timeout/failure render an inline state: "Couldn't load — Retry" (button re-runs the fetch). One shared helper in `lib/`, not per-page copies.
- **Accept when:** blocking the API route in devtools produces the retry state within ~10s, and Retry works.

### UX-03 · RSVP failure must not lose the form
- **Priority:** P0 · **Effort:** small · **Files:** `app/events/[slug]/RsvpModal.tsx`
- **Problem:** If the RSVP POST fails, the user's answers are gone; they must re-fill everything.
- **Do:** Keep all form state on failure (don't reset/close), show the error inline (or via UX-01 toast) with a "Try again" button that re-submits the same payload. Additionally persist step-1/2 answers to `sessionStorage` (`topia_rsvp_draft:<eventId>`) on step change, restore on modal reopen, clear on success. Follow the existing sessionStorage key conventions.
- **Accept when:** simulating a failed POST (devtools offline) leaves the form intact with a retry that succeeds once back online; a page refresh mid-form restores answers; success clears the draft.

### UX-04 · Current-page indicator in navigation
- **Priority:** P1 · **Effort:** trivial · **Files:** `app/components/nav/TopNav.tsx`, `app/components/nav/MobileTabBar.tsx`
- **Do:** Use `usePathname()` to mark the active item: menu/tab items get an active style (e.g. lime underline or full-opacity vs the existing muted state) when pathname matches their href prefix. Add `aria-current="page"` on the active link.
- **Accept when:** navigating between Home/Events/TV/Messages/Dashboard visibly marks the current tab in both themes, desktop + mobile.

### UX-05 · Explain the guestbook gate
- **Priority:** P1 · **Effort:** trivial · **Files:** `app/components/profile/GuestbookLayer.tsx` (or the tab container in `app/profile/[username]/page.tsx`)
- **Problem:** Non-followers see an empty/inert guestbook with no explanation.
- **Do:** When the viewer isn't following (and isn't the owner), render an empty state in the guestbook tab: "Follow @<username> to view and sign their guestbook" + the existing FollowButton inline.
- **Accept when:** logged-in non-follower sees the message + working follow button; following immediately reveals the guestbook (existing behavior).

### UX-06 · Replace window.confirm with branded confirm dialog
- **Priority:** P2 · **Effort:** small · **Files:** grep `window.confirm(` — admin page actions, project delete, email broadcast (~5–8 sites)
- **Do:** Build one small `ConfirmDialog` component (portal, lvh-safe, matches existing modal styling; props: title, body, confirmLabel, destructive flag → orange button) and swap each `window.confirm` call site. Keep the existing "type DELETE" pattern where it exists — that's stronger, don't downgrade it.
- **Accept when:** grep shows zero `window.confirm` in app/; each swapped action still requires explicit confirmation.

### UX-07 · Mobile tab bar discoverability
- **Priority:** P1 · **Effort:** small · **Files:** `app/components/nav/MobileTabBar.tsx`
- **Problem:** The bottom tab bar is collapsed by default behind a small handle; first-time mobile users don't find navigation.
- **Do:** Remember the expanded/collapsed state in `localStorage` (`topia:tabbar`), and default to EXPANDED for users who have never toggled it. Keep the collapse gesture. Do not touch the keyboard/scroll behavior (CLAUDE.md mistake #3 — no viewport math).
- **Accept when:** fresh session at 375px shows the tab bar open; collapsing it persists across reloads; messages modal + keyboard still behave (run ui-audit Pass 3).

### UX-08 · Empty states for directory searches
- **Priority:** P2 · **Effort:** trivial · **Files:** `app/resources/tools/ToolsList.tsx`, `app/resources/grants/GrantsList.tsx`, `/topians` directory page
- **Do:** When a search/filter yields zero results, render: `No results for "<query>"` + a "Clear search" button that resets filters. Show result counts when filtered.
- **Accept when:** searching gibberish on each page shows the message and Clear works.

### UX-09 · Onboarding escape hatch
- **Priority:** P2 · **Effort:** small · **Files:** `app/onboarding/page.tsx` (+ `StepShell.tsx`)
- **Problem:** Once in the 6-step flow there's no way out until required fields are done; hesitant users are trapped (data IS saved per-step already, so leaving is safe).
- **Do:** Add a quiet "Finish later" link (meta-text style, top-right of StepShell) from step 1 onward → routes to `/home`. The existing "complete your profile" card on /home + `firstIncompleteStep()` resume already handle re-entry — verify, don't rebuild.
- **Accept when:** clicking Finish later mid-flow lands on /home showing the complete-profile card; re-entering onboarding resumes at the right step.

### UX-10 · Landing page: one-line "what this is" for cold visitors
- **Priority:** P2 · **Effort:** trivial · **Files:** `app/page.tsx`
- **Problem:** The landing is brand-forward ("culture first, systems second") but never states what you can DO (host/join events, build worlds, connect with creators) before asking you to log in.
- **Do:** Add one concrete subline under the ENTER CTA in the existing meta-text style, e.g. "Events, worlds, and passports for the creative underground — join in one tap." (User should approve final copy — flag in PR.)
- **Accept when:** visible on mobile + desktop, both themes, without pushing the CTA below the fold at 375px.

---

## Explicitly NOT recommended (don't let a cheaper model do these)

- **Don't defer/remove the Privy provider globally.** It breaks `ready && authenticated` gates site-wide. Code-split modals instead (PERF-08).
- **Don't convert `EventDetailClient`/RSVP flow to server components.** Highest-risk area of the app (see CLAUDE.md history); the wins there come from PERF-04/05/07.
- **Don't "fix" the third-party-cookie and bf-cache Lighthouse flags** — they come from Privy's auth infrastructure and `no-store` on auth'd fetches; accepted cost for now.
- **Don't run image migrations against blob storage or the DB** for PERF-04 — render-time URL construction only.
- **Don't redesign the micro-label aesthetic** to chase contrast scores — adjust tokens per A11Y-03 and stop.
- **Don't add a service worker / PWA** — maintenance cost outweighs benefit at this stage.

## Expected outcomes if executed in order

- **Phase 1 complete:** every page loses 0.6–16 MB; render-blocking drops ~1–2s; CLS <0.1 everywhere; A11y ≥95 on all pages; SEO 100 except the SEO-04 investigation; Best Practices ~85+ (remaining deductions are Privy cookies/source maps).
- **Phase 2 complete:** mobile Performance realistically 85–95 on list pages and 75–85 on media-heavy detail pages; LCP <3s on all audited pages.
- **Phase 3 complete:** failure states visible and recoverable across the top flows; navigation orientation fixed; the two P0 UX gaps (silent errors, lost RSVP forms) closed.

## What's already good (leave alone)

Event-detail `generateMetadata` (the model for SEO-02) · skeleton loaders matching card shapes · onboarding per-step saves + resume logic · RSVP unsaved-changes confirms · optimistic save-toggle with rollback · API `Cache-Control` on list endpoints · the feedback widget · `html lang`, theme no-flash script, and `aria-hidden` on decorative containers where present.
