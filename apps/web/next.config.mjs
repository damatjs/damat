/** Multi-zone: the docs app is a separate deployment; /docs/* is proxied to
 *  it so damatjs.com/docs stays the canonical docs URL. */
const DOCS_ORIGIN = process.env.DOCS_ORIGIN ?? 'http://localhost:3030'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/docs', destination: `${DOCS_ORIGIN}/docs` },
      { source: '/docs/:path*', destination: `${DOCS_ORIGIN}/docs/:path*` },
    ]
  },
}

export default nextConfig
