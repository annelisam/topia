# Topia Events Expansion — Live Layer Plan

_Drafted 2026-07-09. Planning doc — nothing here is built yet. Companion mockups artifact shared in chat._

## Vision

Turn a Topia event page from a "before" surface (RSVP, who's going) into a live,
in-the-room experience: hosts check attendees in at the door, attendees connect with each other
by scanning profile QRs, complete host-authored quests for points and stamps, and
see prizes/leaderboard — all through an installable PWA "Event Mode" at
`/events/[slug]/live`. Hosts get a cleaned-up manage console with door scanning,
live counts, and quest tracking.

## What exists today (audit summary)

| Area | State |
|---|---|
| Check-in schema | `tickets.code` (unique base32), `tickets.status='checked_in'`, `checkedInAt` exist — but **nothing writes check-in** and no QR is ever rendered. Free RSVP events have no per-guest code at all. |
| Stamps | Computed on the fly in `lib/profile/stamps.ts` (no stamps table). `check-in` stamp already reads `tickets.checkedInAt` (currently dead). `orbit` stamp = mutual follows with avatar. Reveal moment exists in `RsvpConfirmationModal` ("Stamped." animation). |
| Connections | "Connection" = mutual follow (`lib/messages.ts` `areMutual`). Unlocks Primary-inbox DMs. No dedicated connections table, no QR anywhere, no "where we met" context. |
| Manage | `/events/[slug]/manage` tabs: Guests / Registration / Hosts. Ticket tier editing lives inconsistently on the detail page (`TicketManager`), not in manage. No broadcast, no check-in, no stats overview. |
| PWA | Nothing. No manifest, no icons, no service worker, no install affordance. `MobileTabBar` exists as the mobile nav shell. |
| Quests | Nothing anywhere. |

## Product pillars

1. **Check-in (manual)** — hosts search the guest list at the door and mark attendees checked in (no attendee QR pass). Live counter; check-in unlocks quest participation and feeds the existing (dead) `check-in` stamp back to life.
2. **Connect** — profile QR → scan → instant mutual connection, recorded with event context ("met at Neon Garden"). Rides on follows, so it automatically unlocks the `orbit` stamp and Primary DMs.
3. **Quests (dynamic)** — host-authored challenges with pluggable verification: scan a QR code hidden at the venue, host verifies in person, or auto-rules evaluated server-side (make N connections, check in, etc.) driven by a jsonb rule config so new rule types don't need schema changes. No points system: completing **all** of an event's quests unlocks prize eligibility and enters the attendee into that event's raffle. Progress bar, attendee progress board, quest stamp, prizes display. Quests unlock once the attendee is checked in.
4. **Event Mode PWA** — installable, dark-first, full-screen hub per live event tying it all together.

## Key architecture decisions

- **PWA, not a separate app.** Same Next.js codebase, `app/manifest.ts` + icons + (later) a minimal service worker. Event Mode is a route (`/events/[slug]/live`), so links/shares/auth all keep working. No app-store detour.
- **Presence gets its own table.** `event_checkins` is the source of truth for "was in the room" — works identically for free RSVP and paid tickets. When a ticket exists we ALSO stamp `tickets.checkedInAt` so the existing stamp logic and any ticket reporting stay coherent.
- **Check-in is manual, not scanned.** No attendee QR pass: the host searches the roster in the Check-in tab and taps to check a guest in (undo supported). Simpler door flow, nothing for attendees to pull up.
- **Connection = mutual follow + context row.** Scanning a profile QR creates follows both ways plus an `event_connections` row (who, who, which event). Everything downstream (orbit stamp, DM unlock) is free. The context row powers "people you met" and mutual-event social graphing.
- **Stamps stay computed.** Quest completions and check-ins are stored facts; `computeProfileStamps` derives new `quest` stamps from them. No stamps table, no migration for stamp changes — matches the existing retirement/addition mechanism.
- **QR security.** All scannable codes are unguessable server-minted tokens (Crockford base32, same alphabet as tickets). Profile connect codes are stable but revocable (`users.connectCode`, regen endpoint). Quest codes are per-quest secrets. Check-in and quest endpoints validate event membership + event window; host actions go through `requireManager` + Bearer verification per repo convention.
- **Scanning tech.** QR render: `qrcode` npm package (SVG output, tiny). Scan: native `BarcodeDetector` where available, fallback to the `qr-scanner` package (lightweight, no wasm heaviness). Camera requires HTTPS — fine in prod and `localhost`.

## New schema (all via idempotent `scripts/apply-*.mjs`, per repo rules)

```
event_checkins            id, eventId, userId, checkedInBy, createdAt ·
                          unique(eventId, userId) · FKs indexed
users.connect_code        text unique — profile QR token (lazy-minted, revocable)
event_quests              id, eventId, title, description, icon,
                          verifyMethod('qr'|'host'|'auto'), code (unique, for qr),
                          rule jsonb (auto rules, e.g. {kind:'connections',count:3}
                          or {kind:'checkin'} — extensible without schema changes),
                          isActive, sortOrder, createdAt, updatedAt
event_quest_completions   id, questId, eventId, userId, verifiedBy, createdAt ·
                          unique(questId, userId)
event_connections         id, eventId (nullable), userAId, userBId (stored sorted),
                          createdAt · unique(eventId, userAId, userBId)
event_prizes (P4)         id, eventId, title, description, imageUrl, sortOrder,
                          raffleWinnerUserId (set when the host draws the raffle
                          from guests who completed every active quest)
```

## New API surface

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/events/checkin` | POST | `requireManager` + Bearer | Mark a guest checked in by userId (idempotent); DELETE to undo |
| `/api/events/checkin` | GET | `requireManager` | Roster with check-in state + live counts for the door screen |
| `/api/connect` | POST | attendee | Redeem a profile connect code → mutual follow + `event_connections` row; returns the other profile |
| `/api/connect/code` | GET/POST | self | Get / regenerate my connect QR token |
| `/api/events/quests` | GET/POST/PUT/DELETE | GET public-active / writes `requireManager` | Quest CRUD + my completion state |
| `/api/events/quests/complete` | POST | attendee | Redeem a quest QR code; auto-quests evaluated server-side on connect/check-in events |
| `/api/events/quests/progress` | GET | attendee (RSVP'd) | Progress board: quests completed per attendee + raffle-entered flag, `s-maxage=30` |
| `/api/events/raffle` | POST | `requireManager` + Bearer | Draw a prize winner at random from guests who completed all quests |
| `/api/profile/connections` | GET | self/public-partial | People you met, grouped by event; mutual-events overlap |

Also: `/connect/[token]` page — where a profile QR lands when scanned with a native
camera app (not in-app): shows the person's card + one-tap Connect (sessionStorage
post-login intent, per repo convention — never query params).

## Manage console cleanup (the "edit/manage best UI" ask)

`/events/[slug]/manage` becomes a proper host console, mobile-first (hosts run
doors from phones):

- **Overview** (new) — going/waitlist/pending, checked-in count + %, quest completion stats, quick links.
- **Guests** — existing (roster, CSV, invites, approvals).
- **Registration** — existing (capacity, approval, questions).
- **Tickets** — `TicketManager` moves here from the detail page (fixes the current inconsistency).
- **Check-in** (new) — searchable roster with one-tap check-in/undo + live counter.
- **Quests** (new) — quest builder (title, verify method, printable QR sheet per quest), completions table ("who completed what" — the internal tracking ask), prize list, raffle draw (random winner from guests who completed every quest).
- **Hosts** — existing.

Detail page host bar simplifies to Edit · Manage · Share. Composer stays the single
create/edit surface for content; manage owns operations. No composer fork.

## Event Mode PWA (`/events/[slug]/live`)

Dark-first, full-screen (mobile bottom-bar suppressed), available from event start
−4h until +12h (outside that window it shows countdown / recap):

- Header: event name, LIVE badge, my check-in state.
- Quest progress bar (n of m quests) — always visible; completing all shows "You're in the raffle."
- Big actions: **Scan** (connect or quest, one scanner) · **Quests** · **People** · **Prizes**.
- Progress board (attendee-visible; host sees full detail in manage).
- Prizes rail + raffle status.
- Post-event recap state: "You met 12 people, completed 4 quests, earned 2 stamps."

PWA infra: `app/manifest.ts` (standalone, `#1a1a1a` theme, 192/512 maskable icons
from `public/brand`), apple-touch-icon + meta in `layout.tsx`, contextual "Add to
Home Screen" card on event pages when RSVP'd and the event is <48h away. Service
worker in a later phase, scoped to caching the app shell for offline
door entry.

## Phases (each independently shippable; sequential PRs)

| Phase | Scope | Schema | Est. |
|---|---|---|---|
| **P0 — Manage console** | Tab restructure, Overview stats, move Tickets tab, mobile polish | none | S |
| **P1 — Check-in** | `event_checkins` table, Check-in manage tab (search roster, tap to check in/undo, live counter), revive check-in stamp | apply-event-checkins.mjs | S/M |
| **P2 — PWA + Event Mode shell** | manifest/icons/install card, `/live` hub (check-in state, quests placeholder) | none | M |
| **P3 — Connections** | `users.connect_code`, profile QR on TopiaCard, `/connect/[token]`, scanner connect mode, `event_connections`, People screen, mutual-events surfaces, orbit-stamp context | apply-connections.mjs | M |
| **P4 — Quests + prizes** | quest tables, builder tab, printable QR sheets, completion flows (qr/host/auto), progress board, raffle entry + host draw, quest stamp + reveal animation, prizes | apply-quests.mjs | L |
| **P5 — Polish** | post-event recap, notifications, printable quest-code kit, offline shell (service worker) | none | S/M |

Every schema phase ships with its idempotent apply script and a reminder to run it
against production at deploy. No drizzle-kit, ever.

## Decisions (locked 2026-07-09)

1. **No points system.** Quests are completion-based: finishing **all** of an event's active quests makes the attendee prize-eligible and enters them into that event's raffle. The host draws winners from that pool.
2. **Progress board is attendee-visible** (quests completed per person); hosts see full per-quest detail in manage.
3. **Profile connect QR is always-active** on the profile/Topia card; events add the "met at" context.
4. **Prizes v1** — displayed in Event Mode; host draws the raffle and hands out prizes manually.
5. **PWA scope: the whole site is installable.** The mobile PWA experience must be strong and easy to navigate — mobile nav quality is a first-class requirement, not a polish item.
