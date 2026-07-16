// THE canonical "functionally complete" bar — one definition, shared by the
// splash router, the nav nudge chip, the connect-page prompt, and the email
// sweep, so surfaces stop contradicting each other.
//
// Core = name + username. Without a username a user is INVISIBLE on Topia:
// hidden from event guest lists and DM search, no profile URL, broken
// connect links. Without a name they render as 'Unknown'. Richer tiers
// (real photo, role tags, bio) remain the concern of richer surfaces
// (/home's viewerComplete, the dashboard checklist) — they gate polish,
// not function.
export function isCoreProfileComplete(
  p: { name?: string | null; username?: string | null } | null | undefined,
): boolean {
  return !!(p?.name?.trim() && p?.username?.trim());
}
