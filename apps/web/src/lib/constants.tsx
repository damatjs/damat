/** Site-wide constants. URLs come from env where deployment-specific. */

export const SITE = {
  name: process.env.SITE_NAME ?? 'Damat',
  tagline: 'The composable backend framework for TypeScript.',
  description:
    process.env.SITE_DESCRIPTION ??
    'Damat is an open-source, composable backend framework for TypeScript on Bun — assemble models, services, routes, and workflows from plug-and-play modules.',
  url: process.env.NEXT_PUBLIC_DOMAIN_URL ?? 'https://damatjs.com',
} as const

export const GITHUB_REPO = 'damatjs/damat'
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`

/** The module registry lives on its own subdomain (see apps/registry). */
export const REGISTRY_URL = 'https://registry.damatjs.com'

/** Docs are a separate app proxied under /docs (see next.config.mjs). */
export const DOCS_PATH = '/docs'

export const INSTALL_COMMAND = 'bunx create-damat-app@latest my-app'
