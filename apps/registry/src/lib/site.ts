// Client-safe site metadata for the registry app. The public URL is
// environment-driven so the same build works across preview and production.

const url = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://registry.damatjs.com"
).replace(/\/$/, "");

export const SITE = {
  name: "Damat Registry",
  short: "Registry",
  tagline: "The module registry for Damat",
  description:
    "Discover and install Damat modules — self-contained backend building blocks. Each entry carries an owner and verification status, and installs with a single command.",
  url,
  /** Default social card, generated on demand by the /og route. */
  ogImage: `${url}/og?title=${encodeURIComponent("The module registry for Damat")}`,
  locale: "en_US",
  keywords: [
    "Damat modules",
    "backend modules",
    "TypeScript backend",
    "module registry",
    "composable backend",
    "damat module add",
  ],
} as const;

export const DOCS_URL = "https://damatjs.com";
export const GITHUB_REPO = "damatjs/damat";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
export const CLI = "damat";
