# Topia Worlds Optimization — Plan

_Drafted 2026-07-09. Planning doc — nothing implemented yet. Companion mockups
artifact ("Worlds, Rebuilt") shared in chat. Follows the events-live-layer
playbook: phased PRs, idempotent apply scripts, no drizzle-kit._

## Current state (audit summary)

| Area | Reality |
|---|---|
| Membership | `world_members` roles are actually `owner` / `world_builder` / `collaborator` (schema comment is stale). Legacy `worlds.collaborators` CSV column still exists but membership drives UI. |
| Invites | `world_invitations` is **userId-only** — you cannot add someone who isn't on Topia yet. Events already solved this (email + token invites) — reuse that pattern. |
| Follows | `world_follows` shipped; followers get `world_announcement` notifications. Follow button + count on the detail page. No email, in-app only. |
| Posting | `world_announcements` = builder-only one-way updates in the Overview activity feed. No replies, no reactions, no member voice. |
| World page | Single-column "dossier" with tabs (Overview / Projects / Architects / Events / Tools). |
| Explore | Canvas constellation is **hover-dependent** (dead on touch), copy literally says "hover a world to preview". Explore uses index-based colors (`COLOR_CYCLE[i%5]`) while detail pages hash the slug (`getWorldConfig`) — the same world shows different colors on the two surfaces. Hardcoded hexes + a dead `loading=false` branch. |
| Stale surfaces | `worlds/creator/[slug]` and `projects/[projectSlug]` predate the dossier aesthetic. |
| Create flow | Single-step dashboard form (title/short desc/category/country/image), publishes immediately. |
| Messaging | Strictly 1:1 (`dmKey`). Schema comment documents the group hook (null dmKey, >2 members) but nothing implemented — no way to message a world. |

> **Decision 2026-07-09: roles stay as-is for now.** No Orbit/Members/Anchors
> rename, no new tiers — W2 is DEFERRED. Followers remain "followers", the
> existing owner/world_builder/collaborator roles are untouched. The section
> below is kept for future reference only. Adjustable split is desktop-only;
> mobile gets a stacked layout with sticky tabs. Existing dossier aesthetic
> is retained across all changes.

## Naming proposal — the community model (DEFERRED)

The follow system gets a world-native vocabulary (final names = product call):

| Tier | Who | Today | Powers |
|---|---|---|---|
| **Architects** | owner + builders | `owner`/`world_builder` | Build: edit, post, invite, issue stamps, draw from forum |
| **Members** | people accepted into the world | `collaborator` (renamed) | Belong: listed, post in forum, get member-only drops later |
| **Orbit** | followers | `world_follows` (renamed in UI) | Watch: follow feed, react/reply in forum, get announcements |
| **Anchors** | the most engaged supporters | new (computed) | Recognition: badge on their forum posts + a callout card on the People tab |

Anchor criteria v1 (computed, no schema): engagement score per world = forum
posts+replies + reactions given + world-event check-ins, decayed over 90 days;
top N (3) become Anchors. Architects can also manually pin one "honorary" anchor
later if wanted.

## The eight workstreams

### W0 — /worlds explore restyle (the styling fix)
Mobile-first: search + category chips + world cards (image, color chip, title,
one-liner, architects avatars). The constellation stays as a desktop-only hero
with tap-to-open on touch. Unify color identity on `getWorldConfig` (slug hash)
everywhere; kill hardcoded hexes and the dead loading branch. Refresh the two
stale surfaces (creator page, project page) into the dossier language. No schema.

### W1 — World page: two-column with adjustable split
Desktop: left rail = static dossier (identity, declaration, architects, counts,
Join/Follow/Message actions); right pane = the big living surface with tabs
(**Forum · Projects · People · Events · Tools**). A draggable divider (pointer
events on an 8px gutter) adjusts the split, clamped 280–480px, persisted in
localStorage. Mobile: NO drag — the rail collapses into a compact header card
with an expandable "About" and the tabs become sticky segmented controls; the
same content, stacked. No schema.

### W2 — Community rework (Orbit / Members / Anchors)
Rename surfaces onto the model above; People tab replaces Architects tab
(rings: Architects → Members → Orbit, with counts); anchors callout card;
anchor badge next to names in the forum. Follow button copy becomes "+ Orbit"
(A/B against keeping "Follow"). No schema (anchors computed).

### W3 — World forum ("Transmissions")
The public chatroom-style space:
```
world_posts        id, worldId, authorId, body, imageUrl, category
                   ('general'|'drops'|'questions'|'show'), pinned bool,
                   replyToId (one-level, guestbook pattern), createdAt
reactions          extend polymorphic targetType with 'world_post'
```
Constant-flow feed, newest first, category filter chips, one-level replies,
emoji reactions, builder pin/delete. Posting: Architects + Members; Orbit can
reply/react (world setting later). Announcements fold in as pinned
architect posts (worldAnnouncements stays for back-compat, new posts go to the
forum). Notifications: reply → author, post in followed world → optional.
Apply script: `apply-world-forum.mjs`.

### W4 — Collaborators who aren't users yet
- Show collaborators on the project view (avatar strip) + a dedicated section
  under People.
- `world_invitations` gains `email`, `name`, `token` (nullable — existing
  userId invites unchanged). Adding "Maya Rivera <maya@…>" shows her name on
  the world/project **immediately** (ghost credit row, no profile link), sends
  a Resend invite; accepting creates/links the user (RSVP resolve-or-create
  pattern), flips the invite, and the ghost becomes a real profile.
- Project-level attribution: `world_project_collaborators` (projectId,
  memberId or invitationId) so credits are per-project, not just per-world.
Apply script: `apply-world-collab-invites.mjs`.

### W5 — World-issued stamps
```
world_stamps        id, worldId, name, caption, color, shape, description,
                    isActive, createdAt   (designed by architects)
world_stamp_awards  id, stampId, worldId, userId, awardedBy, createdAt,
                    unique(stampId, userId)
```
Architects design a stamp (name + color/shape from the passport kit) and award
it to members/orbiters (individually or "everyone at event X"). Passport
pipeline reads awards as stored facts (same pattern as quest completions) and
renders them with the existing StampSvg — new `world` StampKind, world-branded.
Apply script: `apply-world-stamps.mjs`.

### W6 — Message a world
First group-thread use of the documented hook: `conversations.worldId`
(nullable) + null `dmKey`; members = the sender + all current Architects.
The thread renders with the world's avatar/name; architect replies are tagged
"via WORLD". Unlocks "DM the world" from the world page action row.
Apply script: `apply-world-inbox.mjs`. (Biggest risk area — touches messaging;
ship last, behind its own flag if needed.)

### W-polish — Create-a-world wizard
Three steps with a live world-card preview: **Identity** (name, category,
mark/image) → **Story** (declaration, description, links) → **Crew** (invite
architects/collaborators — including email ghosts from W4). Draft state
(published=false) until the final step instead of publishing on submit.

## Carry-overs (parallel track)
- **DM notifications**: email via Resend ("you have unread messages" digest,
  batched, respects existing best-effort rules) + **web push** — the PWA shell
  shipped this week makes push possible; one permission prompt surfaced after a
  meaningful moment (first connection / first DM).
- **Homepage profile browse/search**: lands as the Search tab in the new
  frosted-pill nav (see nav board) — people, worlds, events in one surface.

## Suggested order & sizes

| Phase | Scope | Schema | Size |
|---|---|---|---|
| W0 | Explore restyle + stale surfaces | — | M |
| W-polish | Create wizard | — | S/M |
| W1 | Two-column world page + mobile restructure | — | M |
| W2 | Orbit/Members/Anchors | — | M |
| W3 | Forum | ✓ | L |
| W4 | Ghost collaborators | ✓ | M |
| W5 | World stamps | ✓ | M |
| W6 | Message-a-world | ✓ | M/L |

## Open questions
1. **Naming**: Orbit vs Supporters vs Signal for followers; Anchors vs Pillars
   for the engaged tier; "Transmissions" vs "The Floor" vs plain "Forum".
2. **Forum access**: can Orbit post, or only reply/react? (Proposed: reply/react.)
3. **Anchors**: purely computed, or architect-picked, or both?
4. **Join flow**: should worlds have an open "request to join" (→ Member), or
   is membership invite-only? (Proposed: per-world toggle, default invite-only.)
