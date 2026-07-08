/** @type {import('next').NextConfig} */
const nextConfig = {
  // Content is read from the repo's `docs/` folder at build time, so the docs
  // site has no runtime data source — everything is statically generated.
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
}

export default nextConfig
