# Topia Events Expansion — Live Layer Plan

_Drafted 2026-07-09. Planning doc — nothing here is built yet. Companion mockups artifact shared in chat._

## Vision

Turn a Topia event page from a "before" surface (RSVP, who's going) into a live,
in-the-room experience: attendees check in with a QR pass, connect with each other
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

1. **My Pass** — every going attendee (free RSVP or paid ticket) gets a QR pass. Works offline (the #1 real-world door failure is dead signal).
2. **Check-in** — hosts scan passes at the door; live counter; feeds the existing (dead) `check-in` stamp back to life.
3. **Connect** — profile QR → scan → instant mutual connection, recorded with event context ("met at Neon Garden"). Rides on follows, so it automatically unlocks the `orbit` stamp and Primary DMs.
4. **Quests** — host-authored challenges verified by QR scan (codes hidden around the venue), host scan, or auto-rules (e.g. "make 3 connections", "check in"). No points system: completing **all** of an event's quests unlocks prize eligibility and enters the attendee into that event's raffle. Progress bar, attendee progress board, quest stamp, prizes display.
5. **Event Mode PWA** — installable, dark-first, full-screen hub per live event tying it all together.

## Key architecture decisions

- **PWA, not a separate app.** Same Next.js codebase, `app/manifest.ts` + icons + (later) a minimal service worker. Event Mode is a route (`/events/[slug]/live`), so links/shares/auth all keep working. No app-store detour.
- **Presence gets its own table.** `event_checkins` is the source of truth for "was in the room" — works identically for free RSVP and paid tickets. When a ticket exists we ALSO stamp `tickets.checkedInAt` so the existing stamp logic and any ticket reporting stay coherent.
- **Free events get codes.** New `event_rsvps.code` (base32 via the existing `generateTicketCode()` pattern) minted when status becomes `going`. Paid events keep `tickets.code`. The check-in endpoint accepts either.
- **Connection = mutual follow + context row.** Scanning a profile QR creates follows both ways plus an `event_connections` row (who, who, which event). Everything downstream (orbit stamp, DM unlock) is free. The context row powers "people you met" and mutual-event social graphing.
- **Stamps stay computed.** Quest completions and check-ins are stored facts; `computeProfileStamps` derives new `quest` stamps from them. No stamps table, no migration for stamp changes — matches the existing retirement/addition mechanism.
- **QR security.** All scannable codes are unguessable server-minted tokens (Crockford base32, same alphabet as tickets). Profile connect codes are stable but revocable (`users.connectCode`, regen endpoint). Quest codes are per-quest secrets. Check-in and quest endpoints validate event membership + event window; host actions go through `requireManager` + Bearer verification per repo convention.
- **Scanning tech.** QR render: `qrcode` npm package (SVG output, tiny). Scan: native `BarcodeDetector` where available, fallback to the `qr-scanner` package (lightweight, no wasm heaviness). Camera requires HTTPS — fine in prod and `localhost`.

## New schema (all via idempotent `scripts/apply-*.mjs`, per repo rules)

```
event_checkins            id, eventId, userId, method('scan'|'manual'), checkedInBy,
                          createdAt · unique(eventId, userId) · FKs indexed
event_rsvps.code          text unique — pass code for free events (minted on 'going';
                          backfill script for existing going RSVPs)
users.connect_code        text unique — profile QR token (lazy-minted, revocable)
event_quests              id, eventId, title, description, icon,
                          verifyMethod('qr'|'host'|'auto_connections'|'auto_checkin'),
                          code (unique, for qr method), threshold (for auto),
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
| `/api/events/pass` | GET | attendee | My pass: code + status for an event (`private, no-store`) |
| `/api/events/checkin` | POST | `requireManager` + Bearer | Scan a pass code → record check-in (idempotent; "already checked in at X" on dupe) |
| `/api/events/checkin` | GET | `requireManager` | Live counts + recent scans for the door screen |
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
- **Check-in** (new) — scanner + live counter + manual check-in from roster + undo.
- **Quests** (new) — quest builder (title, verify method, printable QR sheet per quest), completions table ("who completed what" — the internal tracking ask), prize list, raffle draw (random winner from guests who completed every quest).
- **Hosts** — existing.

Detail page host bar simplifies to Edit · Manage · Share. Composer stays the single
create/edit surface for content; manage owns operations. No composer fork.

## Event Mode PWA (`/events/[slug]/live`)

Dark-first, full-screen (mobile bottom-bar suppressed), available from event start
−4h until +12h (outside that window it shows countdown / recap):

- Header: event name, LIVE badge, my check-in state.
- Quest progress bar (n of m quests) — always visible; completing all shows "You're in the raffle."
- Big actions: **My Pass** · **Scan** (connect or quest, one scanner) · **Quests** · **People**.
- Progress board (attendee-visible; host sees full detail in manage).
- Prizes rail + raffle status.
- Post-event recap state: "You met 12 people, completed 4 quests, earned 2 stamps."

PWA infra: `app/manifest.ts` (standalone, `#1a1a1a` theme, 192/512 maskable icons
from `public/brand`), apple-touch-icon + meta in `layout.tsx`, contextual "Add to
Home Screen" card on event pages when RSVP'd and the event is <48h away. Service
worker in a later phase, scoped to caching the app shell + my pass QR for offline
door entry.

## Phases (each independently shippable; sequential PRs)

| Phase | Scope | Schema | Est. |
|---|---|---|---|
| **P0 — Manage console** | Tab restructure, Overview stats, move Tickets tab, mobile polish | none | S |
| **P1 — Check-in** | `event_rsvps.code` + backfill, `event_checkins`, `qrcode` dep, My Pass screen, host scanner + Check-in tab, revive check-in stamp | apply-checkins.mjs | M |
| **P2 — PWA + Event Mode shell** | manifest/icons/install card, `/live` hub (pass + roster, quests placeholder) | none | M |
| **P3 — Connections** | `users.connect_code`, profile QR on TopiaCard, `/connect/[token]`, scanner connect mode, `event_connections`, People screen, mutual-events surfaces, orbit-stamp context | apply-connections.mjs | M |
| **P4 — Quests + prizes** | quest tables, builder tab, printable QR sheets, completion flows (qr/host/auto), progress board, raffle entry + host draw, quest stamp + reveal animation, prizes | apply-quests.mjs | L |
| **P5 — Polish** | offline pass (service worker), post-event recap, notifications, printable door kit | none | M |

Every schema phase ships with its idempotent apply script and a reminder to run it
against production at deploy. No drizzle-kit, ever.

## Decisions (locked 2026-07-09)

1. **No points system.** Quests are completion-based: finishing **all** of an event's active quests makes the attendee prize-eligible and enters them into that event's raffle. The host draws winners from that pool.
2. **Progress board is attendee-visible** (quests completed per person); hosts see full per-quest detail in manage.
3. **Profile connect QR is always-active** on the profile/Topia card; events add the "met at" context.
4. **Prizes v1** — displayed in Event Mode; host draws the raffle and hands out prizes manually.
5. **PWA scope: the whole site is installable.** The mobile PWA experience must be strong and easy to navigate — mobile nav quality is a first-class requirement, not a polish item.
