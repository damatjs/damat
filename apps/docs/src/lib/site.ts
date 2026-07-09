// Client-safe site metadata (no Node/fs imports). The public URL is
// environment-driven so the same build works across preview and production;
// with the multi-zone proxy, damatjs.com stays the canonical origin.

const url = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://damatjs.com").replace(
  /\/$/,
  "",
);

export const SITE = {
  name: "Damat",
  tagline: "A composable backend framework for TypeScript, built on Bun.",
  description:
    "Damat gives you a modular, production-ready backend assembled from independent, plug-and-play building blocks — database, auth, billing, queues, workflows — each a self-contained module.",
  url,
  /** Default social card, generated on demand by the /og route. */
  ogImage: `${url}/docs/og?title=${encodeURIComponent("The Damat Guide")}`,
  locale: "en_US",
  keywords: [
    "Damat documentation",
    "TypeScript backend framework",
    "composable backend",
    "Bun framework",
    "backend modules",
    "saga workflows",
    "TypeScript ORM",
  ],
} as const;

export const GITHUB_REPO = "damatjs/damat";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

/** The module registry lives on its own subdomain (see apps/registry). */
export const REGISTRY_URL = "https://registry.damatjs.com";

/** The marketing site (apps/web) — this docs app is proxied under its /docs. */
export const WEB_URL = "https://damatjs.com";

/** Build a per-page /og image URL (route lives under /docs/og). */
export function ogImageUrl(title: string, eyebrow?: string): string {
  const params = new URLSearchParams({ title });
  if (eyebrow) params.set("eyebrow", eyebrow);
  return `${url}/docs/og?${params.toString()}`;
}
