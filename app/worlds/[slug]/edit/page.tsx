'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorldEditRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/worlds/${slug}`);
  }, [slug, router]);

  return null;
}
