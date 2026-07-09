import type { NextConfig } from "next";

/** Deployment-specific URLs (see .env.example).
 *
 *  Docs run as their own app (apps/docs). Two modes:
 *  - NEXT_PUBLIC_DOCS_URL set to an absolute URL → links go straight to that
 *    deployment and /docs/* redirects there.
 *  - unset → multi-zone: /docs/* is proxied to DOCS_ORIGIN so damatjs.com/docs
 *    stays the canonical docs URL.
 */
const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? "";
const DOCS_IS_EXTERNAL = /^https?:\/\//.test(DOCS_URL);
const DOCS_ORIGIN = process.env.DOCS_ORIGIN ?? "http://localhost:3030";
const REGISTRY_URL =
  process.env.NEXT_PUBLIC_REGISTRY_URL ?? "https://registry.damatjs.com";

const nextConfig: NextConfig = {
  async redirects() {
    const redirects = [
      { source: "/registry", destination: REGISTRY_URL, permanent: false },
      {
        source: "/registry/:path*",
        destination: `${REGISTRY_URL}/:path*`,
        permanent: false,
      },
    ];
    if (DOCS_IS_EXTERNAL) {
      redirects.push(
        { source: "/docs", destination: DOCS_URL, permanent: false },
        {
          source: "/docs/:path*",
          destination: `${DOCS_URL}/:path*`,
          permanent: false,
        },
      );
    }
    return redirects;
  },
  async rewrites() {
    if (DOCS_IS_EXTERNAL) return [];
    return [
      { source: "/docs", destination: `${DOCS_ORIGIN}/docs` },
      { source: "/docs/:path*", destination: `${DOCS_ORIGIN}/docs/:path*` },
    ];
  },
};

export default nextConfig;
