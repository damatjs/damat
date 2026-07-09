import type { TerminalLine } from "./types";

export const SECURITY_HERO = {
  eyebrow: "Scan · Score · Gate",
  title: "Every version earns a verdict.",
  lead: "Before any package reaches your tree — hosted with us or proxied from npm — it goes through owner verification, static analysis, and an AI read of its suspicious surface. The output is one number and one status you can gate on.",
};

export const SCAN_RULES = [
  {
    title: "Install scripts",
    body: "preinstall/postinstall hooks are the classic exfiltration vector — every one is extracted and inspected.",
  },
  {
    title: "Obfuscation",
    body: "Packed, encoded, or minified-beyond-reason source in a package that should not need it.",
  },
  {
    title: "Suspicious APIs",
    body: "Child processes, raw sockets, env harvesting, and crypto-wallet patterns where they do not belong.",
  },
  {
    title: "Typosquats",
    body: "Names one keystroke away from packages with millions of downloads.",
  },
  {
    title: "Dependency confusion",
    body: "Public packages shadowing private scope names to hijack internal builds.",
  },
  {
    title: "Binary blobs",
    body: "Opaque compiled payloads shipped where source is expected.",
  },
] as const;

export const SCORING = {
  eyebrow: "The verdict",
  title: "Start at 100. Lose points for every signal.",
  lead: "Critical static findings, low-confidence provenance, repo mismatches, and suspicious ownership changes each subtract from the score. High-confidence AI findings for malware, exfiltration, or backdoors skip the math entirely — the version is marked malicious.",
  thresholds: [
    { range: "80–100", status: "pass", note: "Installs normally." },
    {
      range: "50–79",
      status: "warn",
      note: "Installs; the decision is recorded and surfaced.",
    },
    {
      range: "0–49",
      status: "flagged",
      note: "Blocked under the default policy.",
    },
    {
      range: "hard triggers",
      status: "malicious",
      note: "Always blocked, in every policy mode.",
    },
  ],
} as const;

export const POLICIES = {
  eyebrow: "Your call",
  title: "Policy decides what a verdict means.",
  lead: "Gating is per workspace. Malicious versions are blocked no matter what.",
  modes: [
    {
      mode: "warn_only",
      body: "Everything installs; warnings and decisions are recorded for review.",
    },
    {
      mode: "block_flagged",
      body: "The default. Flagged and malicious versions are blocked; unscanned versions install while a scan fires asynchronously.",
    },
    {
      mode: "block_flagged_and_unscanned",
      body: "The strict mode: nothing unscanned gets in. Installs wait for a verdict.",
    },
  ],
} as const;

export const BLOCKED_TERMINAL: TerminalLine[] = [
  { kind: "cmd", text: "npm install evnt-stream" },
  { kind: "muted", text: "npm error code E403" },
  {
    kind: "danger",
    text: "npm error 403 Forbidden - GET https://registry.damatjs.com/api/evnt-stream",
  },
  {
    kind: "danger",
    text: '{ "error": "blocked by policy", "verdict": { "status": "malicious",',
  },
  {
    kind: "danger",
    text: '  "score": 4, "reasons": ["install-script exfiltration (critical)",',
  },
  {
    kind: "danger",
    text: '  "obfuscated payload", "new maintainer 6 days before release"] } }',
  },
];
