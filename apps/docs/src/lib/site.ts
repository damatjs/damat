// Client-safe site metadata (no Node/fs imports).

export const SITE = {
  name: 'Damat',
  tagline: 'A composable backend framework for TypeScript, built on Bun.',
  description:
    'Damat gives you a modular, production-ready backend assembled from independent, plug-and-play building blocks — database, auth, billing, queues, workflows — each a self-contained module.',
  url: 'https://damatjs.com',
} as const

export const GITHUB_REPO = 'damatjs/damat'
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`

/** The module registry lives on its own subdomain (see apps/registry). */
export const REGISTRY_URL = 'https://registry.damatjs.dev'
