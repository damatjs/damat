/** Site-wide constants. URLs come from env where deployment-specific. */

const url = (
  process.env.NEXT_PUBLIC_DOMAIN_URL ?? "https://damatjs.com"
).replace(/\/$/, "");

export const SITE = {
  name: process.env.SITE_NAME ?? "Damat",
  tagline: "The composable backend framework for TypeScript.",
  description:
    process.env.SITE_DESCRIPTION ??
    "Damat is an open-source, composable backend framework for TypeScript on Bun — assemble models, services, routes, and workflows from plug-and-play modules.",
  url,
  /** Default social card, generated on demand by the /og route. */
  ogImage: `${url}/og?title=${encodeURIComponent("The composable backend framework for TypeScript")}`,
  locale: "en_US",
  keywords: [
    "TypeScript backend framework",
    "composable backend",
    "Bun framework",
    "backend modules",
    "saga workflows",
    "TypeScript ORM",
    "Damat",
  ],
} as const;

export const GITHUB_REPO = "damatjs/damat";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

/**
 * Where docs links point. Set NEXT_PUBLIC_DOCS_URL to the docs deployment
 * (e.g. https://docs.damatjs.com/docs); unset, links stay on /docs and the
 * multi-zone proxy in next.config.mjs serves them.
 */
export const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL?.replace(/\/$/, "") || "/docs";

/** Link to a docs chapter: docsUrl('getting-started'). */
export function docsUrl(slug = ""): string {
  return slug ? `${DOCS_URL}/${slug}` : DOCS_URL;
}

/** The module registry (apps/registry) on its own deployment; /registry redirects here. */
export const REGISTRY_URL =
  process.env.NEXT_PUBLIC_REGISTRY_URL ?? "https://registry.damatjs.com";

export const INSTALL_COMMAND = "bunx @damatjs/damat-cli@latest create my-app";
