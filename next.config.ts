import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    /*
     * Pinned to this package's directory. Without it Turbopack walks up and
     * finds the stray package-lock.json in the parent directory, decides that
     * is the workspace root, and then ignores this project's own lockfile.
     *
     * Note: this must stay `turbopack` — a `webpack` key would fail the build,
     * since Turbopack is the default bundler in Next 16.
     */
    root: path.join(__dirname),
  },

  images: {
    /*
     * Uploads (avatars, portfolio images, verification documents' thumbnails)
     * are served by Laravel from its `public` disk, so next/image needs those
     * origins allow-listed before it will optimise them.
     *
     * Only the hosts the API can actually be configured to live on are listed,
     * and the pattern is narrowed to the storage path rather than left as a
     * bare host wildcard.
     */
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/storage/**",
      },
    ],
  },

  experimental: {
    serverActions: {
      /*
       * The job form sends up to 5 photos of 4 MB each (the API's ceiling), so
       * the 1 MB default rejects a single ordinary phone photo. Allow the full
       * 20 MB plus multipart overhead.
       */
      bodySizeLimit: "21mb",
    },
  },
};

export default nextConfig;
