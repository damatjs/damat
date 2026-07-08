/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
}

export default nextConfig
