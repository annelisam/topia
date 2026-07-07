'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The grant submission form lives in ONE place: the SubmitGrantModal on
 * /resources/grants (opened by ?submit=1), which includes the auto-fill-from-
 * URL parser that used to live here. This route only survives for old
 * links/bookmarks and redirects there.
 */
export default function SubmitGrantRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/resources/grants?submit=1');
  }, [router]);
  return null;
}
