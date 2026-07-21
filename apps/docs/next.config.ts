import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: "/docs-static",
  // Content is read from the repo's `docs/` folder at build time, so the docs
  // site has no runtime data source — everything is statically generated.
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default nextConfig;
