import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/onboarding', '/api', '/messages'],
    },
    sitemap: 'https://topia.vision/sitemap.xml',
  };
}
