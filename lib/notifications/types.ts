/**
 * Shape of a row returned by GET /api/notifications.
 *
 * Shared so the route and NotificationBell can't drift: they were out of sync
 * on the avatar field (`actorAvatar` vs `actorAvatarUrl`), which silently
 * rendered every notification with a letter initial instead of a photo.
 * The route's response is typed against this — rename a field on one side and
 * the build fails on the other.
 */
export interface NotificationMetadata {
  worldTitle?: string;
  worldSlug?: string;
  role?: string;
  invitationId?: string;
  eventId?: string;
  eventName?: string;
  eventSlug?: string;
  kind?: string;
}

export interface NotificationRow {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actorName: string | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  metadata?: NotificationMetadata | null;
}
