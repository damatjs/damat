// Client-safe site metadata for the registry app. The public URL is
// environment-driven so the same build works across preview and production.

const url = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://registry.damatjs.com"
).replace(/\/$/, "");

export const SITE = {
  name: "Damat Registry",
  short: "Registry",
  tagline: "No mystery code in your node_modules",
  description:
    "A package registry with a safety layer: every version is owner-verified, statically and AI-scanned, and given a trust verdict before it reaches your tree. Host packages with us, proxy npm through us, and install as npm dependencies or vendored source.",
  url,
  /** Default social card, generated on demand by the /og route. */
  ogImage: `${url}/og?title=${encodeURIComponent("No mystery code in your node_modules")}`,
  locale: "en_US",
  keywords: [
    "Damat modules",
    "package registry",
    "npm proxy",
    "supply chain security",
    "trust verdicts",
    "AI code scanning",
    "source-copy installs",
    "TypeScript backend",
    "damat module add",
  ],
} as const;

export const DOCS_URL = "https://damatjs.com";
export const GITHUB_REPO = "damatjs/damat";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
export const CLI = "damat";
