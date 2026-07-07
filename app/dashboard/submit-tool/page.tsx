'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The tool submission form lives in ONE place: the SubmitToolModal on
 * /resources/tools (opened by ?submit=1). This route only survives for old
 * links/bookmarks and redirects there.
 */
export default function SubmitToolRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/resources/tools?submit=1');
  }, [router]);
  return null;
}
