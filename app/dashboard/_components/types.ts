export interface SocialLinks { website?: string; twitter?: string; instagram?: string; soundcloud?: string; spotify?: string; linkedin?: string; substack?: string; }
export interface PendingInvite { invitationId: string; inviteeId: string; role: string; inviteeName: string | null; inviteeUsername: string | null; }
export interface WorldData {
  id: string; title: string; slug: string; shortDescription: string | null; description: string | null;
  imageUrl: string | null; headerImageUrl: string | null; tools: string | null; socialLinks: SocialLinks | null;
  members: { userId: string; role: string; userName: string | null; userUsername: string | null }[];
  pendingInvites?: PendingInvite[];
}
export interface ToolOption { id: string; name: string; slug: string; }
export interface SearchUser { id: string; username: string | null; name: string | null; avatarUrl: string | null; }
export interface ProjectItem {
  id: string; name: string; slug: string; description?: string | null; content?: string | null;
  imageUrl?: string | null; videoUrl?: string | null; url?: string | null;
  links?: { label: string; url: string }[] | null; tags?: string[] | null;
}
