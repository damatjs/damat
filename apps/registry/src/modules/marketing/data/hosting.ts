import type { TerminalLine } from "./types";

export const HOSTING_HERO = {
  eyebrow: "First-party hosting",
  title: "Host any package with us.",
  lead: "Not just Damat modules — any npm-shaped package can be published to and served from the registry, GitHub-Packages style. It installs through the standard npm protocol, and it picks up everything npm never gave you: verification, scanning, verdicts, and a source-copy channel.",
};

export const PUBLISH_TERMINAL: TerminalLine[] = [
  {
    kind: "cmd",
    text: "npm publish --registry https://registry.damatjs.com/api/",
  },
  { kind: "muted", text: "npm notice publishing @acme/queue-worker@2.1.0" },
  {
    kind: "ok",
    text: "+ @acme/queue-worker@2.1.0 · owner verified · scan queued",
  },
  { kind: "cmd", text: "npm install @acme/queue-worker" },
  { kind: "ok", text: "✓ PASS · score 92 · served from registry.damatjs.com" },
];

export const CHANNELS = {
  eyebrow: "Two ways to install",
  title: "npm dependency, or the source itself.",
  lead: "Every package we host is installable both ways — the choice is yours, per package. Both channels serve the same stored artifact and pass the same gate.",
  npm: {
    title: "npm channel",
    body: "A normal dependency resolved into node_modules. Backward-compatible with every tool you already use.",
    lines: [
      { kind: "cmd", text: "bun add @acme/queue-worker" },
      { kind: "ok", text: "✓ installed 2.1.0 into node_modules" },
    ] as TerminalLine[],
  },
  sourceCopy: {
    title: "Source-copy channel",
    body: "The package source is vendored into your tree — visible, reviewable, no opaque bytes. Keep it intact and track upstream updates, or let it diverge and own it.",
    lines: [
      { kind: "cmd", text: "damat module add @acme/queue-worker" },
      {
        kind: "ok",
        text: "✓ source copied to src/modules/queue-worker (12 files)",
      },
      {
        kind: "muted",
        text: "tracked against upstream — update or diverge, your call",
      },
    ] as TerminalLine[],
  },
} as const;

export const COMPAT = {
  eyebrow: "Zero migration",
  title: "One line of .npmrc. That is the whole setup.",
  lead: "The registry speaks the npm protocol — packuments, dist-tags, tarballs, publish. Point your project at us and everything from npm CLI to bun to CI caches keeps working. Packages we do not host are proxied from npmjs.org through the same safety gate.",
} as const;
