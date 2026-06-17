import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Event editing moved out of the dashboard shell to a standalone route that
  // matches the create flow. Redirect any old/bookmarked links.
  async redirects() {
    return [
      {
        source: '/dashboard/edit-event/:slug',
        destination: '/events/:slug/edit',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
