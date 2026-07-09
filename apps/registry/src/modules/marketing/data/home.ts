import type { TerminalLine, VerdictExample } from "./types";

export const HERO = {
  eyebrow: "Every version scanned & scored",
  titleTop: "No mystery code",
  titleBottom: "in your",
  titleAccent: "node_modules.",
  lead: "Point your .npmrc at us. Every package — ours or npm's — is owner-verified, statically and AI-scanned, and given a trust verdict before it reaches your tree.",
  primaryCta: { label: "Point .npmrc at us", href: "/hosting" },
  secondaryCta: { label: "Browse the registry", href: "/modules" },
} as const;

export const HERO_TERMINAL: TerminalLine[] = [
  { kind: "cmd", text: "npm install lodash" },
  { kind: "ok", text: "✓ PASS · score 96 · owner verified · scanned 2h ago" },
  { kind: "cmd", text: "npm install evnt-stream" },
  {
    kind: "danger",
    text: "✗ BLOCKED · malicious · install-script exfiltration",
  },
  { kind: "cmd", text: "damat module add @damatjs/webhook" },
  { kind: "ok", text: "✓ source copied · 9 files · verified publisher" },
];

export const PROXY_SECTION = {
  eyebrow: "A safety layer on top of npm",
  title: "Keep installing from npm. Through us.",
  lead: "The registry is an npm-protocol proxy: your installs keep resolving the same packages, but every version passes owner verification, static + AI scanning, and your workspace policy on the way in. Malicious versions never reach you.",
} as const;

export const VERDICT_EXAMPLES: VerdictExample[] = [
  {
    pkg: "lodash",
    version: "4.17.21",
    score: 96,
    status: "pass",
    headline: "Verified owner, valid provenance, clean scans.",
    chips: ["Owner verified", "Provenance", "AI-scanned"],
  },
  {
    pkg: "left-pad-utilz",
    version: "1.0.2",
    score: 61,
    status: "warn",
    headline: "Typosquat-pattern name and a fresh maintainer.",
    chips: ["Unverified owner", "Ownership change"],
  },
  {
    pkg: "evnt-stream",
    version: "3.4.1",
    score: 4,
    status: "blocked",
    headline: "Install-script exfiltration caught by static + AI scan.",
    chips: ["Malicious", "Blocked in every mode"],
  },
];

export const HOSTING_SECTION = {
  eyebrow: "First-party hosting",
  title: "Host any package with us.",
  lead: "Not just Damat modules — any npm-shaped package publishes to and serves from the registry, GitHub-Packages style. Standard npm protocol in, verification, scanning, and verdicts out.",
  cta: { label: "How hosting works", href: "/hosting" },
} as const;

export const CHANNELS_SECTION = {
  eyebrow: "Two ways to install",
  title: "A dependency — or the source itself.",
  lead: "Everything we host installs as a normal npm dependency or as a shadcn-style source copy vendored into your tree: visible, reviewable, yours to keep intact or diverge.",
  npm: [
    { kind: "cmd", text: "bun add @acme/queue-worker" },
    { kind: "ok", text: "✓ installed into node_modules" },
  ] as TerminalLine[],
  sourceCopy: [
    { kind: "cmd", text: "damat module add @acme/queue-worker" },
    { kind: "ok", text: "✓ source copied to src/modules/queue-worker" },
  ] as TerminalLine[],
} as const;

export const AGENTS_SECTION = {
  eyebrow: "Built for AI agents",
  title: "Your agent asks before it installs.",
  lead: "One endpoint answers the question agents can't eyeball: is this package legit? Status, score, reasons, and a summary written for machine consumption.",
  cta: { label: "The verdict API", href: "/agents" },
  snippet: `GET /packages/lodash/4.17.21/verdict
→ { "status": "pass", "score": 96,
    "summary": "Published by its verified owner… safe to install." }`,
} as const;

export const MODULES_SECTION = {
  eyebrow: "The Damat module registry",
  title: "Backend building blocks, ready to drop in.",
  lead: "Self-contained Damat modules — auth, billing, webhooks, teams — each with an owner, a verification status, and one-command install.",
  cta: { label: "Browse all modules", href: "/modules" },
} as const;
