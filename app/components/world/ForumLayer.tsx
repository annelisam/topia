'use client';

import CommentSection from '../CommentSection';

// The world forum — chatroom-style flow driven by the shared CommentSection
// (same engine as event comments) pointed at /api/worlds/posts, plus category
// chips and builder pins. Members post; builders moderate; reading is public.
export const FORUM_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'drops', label: 'Drops' },
  { value: 'questions', label: 'Questions' },
  { value: 'show', label: 'Show & tell' },
] as const;

export default function ForumLayer({ slug, worldTitle }: { slug: string; worldTitle: string }) {
  return (
    <div className="px-4 pb-5 md:px-5 [&>div]:border-t-0 [&>div]:mt-2">
      <CommentSection
        endpoint="/api/worlds/posts"
        slug={slug}
        kind="world"
        title="Forum"
        gateHint={`members of ${worldTitle || 'this world'} post here — ask a builder to add you`}
        categories={FORUM_CATEGORIES}
      />
    </div>
  );
}
