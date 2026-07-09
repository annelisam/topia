import type { MetadataRoute } from 'next';

// PWA manifest — makes the whole site installable to the home screen.
// Event Mode (/events/[slug]/live) is the flagship installed experience;
// display 'standalone' hides browser chrome so it reads as a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TOPIA',
    short_name: 'TOPIA',
    description: 'Culture Before Tech — profiles, worlds, and live events.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1a1a',
    theme_color: '#1a1a1a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
