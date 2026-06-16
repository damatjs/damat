#!/usr/bin/env bun
/**
 * Builds docs/guide.json — a machine-readable map of the documentation site:
 * the ordered guide chapters plus every package's README + internals docs.
 * A static-site generator can consume this to build the sidebar and routes
 * without parsing Markdown.
 *
 * Run from the repo root:  bun run docs/build-guide-json.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

// --- Guide chapters (order + metadata is the source of truth for a site) ----
const sections = [
  {
    id: "start-here",
    title: "Start here",
    chapters: [
      { id: "introduction", title: "Introduction", summary: "What Damat is and the package map." },
      { id: "concepts", title: "Concepts — modules & the framework", summary: "The idea behind Damat: what a module is, why the backend is shaped this way, and how the framework wires modules together." },
      { id: "getting-started", title: "Getting started", summary: "Install, scaffold a new app or run the reference backend, and the project structure." },
      { id: "configuration", title: "Configuration & environment", summary: "damat.config.ts, projectConfig, and the .env cascade." },
    ],
  },
  {
    id: "build",
    title: "Build",
    chapters: [
      { id: "models", title: "Defining models (the ORM DSL)", summary: "The fluent, type-safe model/columns DSL." },
      { id: "migrations", title: "Migrations", summary: "The module-aware migration system and the damat-orm CLI." },
      { id: "modules-and-services", title: "Modules & services", summary: "ModuleService auto-CRUD, credentials, and defineModule." },
      { id: "http-apis", title: "Building HTTP APIs", summary: "File-based routing with Hono." },
      { id: "workflows", title: "Workflows (the saga engine)", summary: "Steps with compensation and saga orchestration on Effect-TS." },
      { id: "redis", title: "Redis: cache, queue, locks, rate limiting", summary: "Batteries-included Redis helpers." },
      { id: "logging", title: "Logging", summary: "Structured logging with levels, formats, and file transport." },
      { id: "default-backend", title: "The default backend, end to end", summary: "The reference app as a worked example." },
    ],
  },
  {
    id: "modules-and-sharing",
    title: "Modules & sharing",
    chapters: [
      { id: "authoring-modules", title: "Authoring a module", summary: "Build and test a standalone, portable module." },
      { id: "installing-modules", title: "Installing existing modules", summary: "damat module add from a registry ref, path, or git." },
      { id: "installing-modules-with-ai", title: "Installing modules with AI (MCP)", summary: "Discover and install modules through the MCP server." },
    ],
  },
  {
    id: "operate-and-reference",
    title: "Operate & reference",
    chapters: [
      { id: "cli-reference", title: "CLI reference", summary: "damat, damat-orm, and create-damat-app." },
      { id: "deployment", title: "Deployment", summary: "Docker and production release flow." },
      { id: "package-reference", title: "Package reference", summary: "Links to every package's README and internals." },
      { id: "troubleshooting", title: "Troubleshooting", summary: "Common symptoms and fixes." },
    ],
  },
] as const;

// Number the chapter files (01-introduction.md, …) by global order.
let n = 0;
const guide = sections.map((section) => ({
  id: section.id,
  title: section.title,
  chapters: section.chapters.map((ch) => {
    n += 1;
    const num = String(n).padStart(2, "0");
    const slug = ch.id;
    const file = `guide/${num}-${slug}.md`;
    if (!existsSync(join(ROOT, "docs", file))) {
      throw new Error(`Missing chapter file: docs/${file}`);
    }
    return { id: ch.id, order: n, title: ch.title, slug, path: `docs/${file}`, summary: ch.summary };
  }),
}));

// --- Packages (grouped, ordered) --------------------------------------------
const packageList: Array<{ dir: string; group: string }> = [
  { dir: "packages/framework", group: "Framework & app" },
  { dir: "packages/service", group: "Framework & app" },
  { dir: "packages/module", group: "Framework & app" },
  { dir: "packages/workflow-engine", group: "Framework & app" },
  { dir: "packages/orm/main", group: "ORM" },
  { dir: "packages/orm/model", group: "ORM" },
  { dir: "packages/orm/pg", group: "ORM" },
  { dir: "packages/orm/connector", group: "ORM" },
  { dir: "packages/orm/migration", group: "ORM" },
  { dir: "packages/orm/processor", group: "ORM" },
  { dir: "packages/orm/codegen", group: "ORM" },
  { dir: "packages/orm/core", group: "ORM" },
  { dir: "packages/orm/type", group: "ORM" },
  { dir: "packages/core/logger", group: "Core" },
  { dir: "packages/core/redis", group: "Core" },
  { dir: "packages/core/env", group: "Core" },
  { dir: "packages/core/types", group: "Core" },
  { dir: "packages/core/cli", group: "Core" },
  { dir: "packages/deps", group: "Core" },
  { dir: "packages/typescript-config", group: "Core" },
  { dir: "packages/cli/damat", group: "CLIs & AI" },
  { dir: "packages/orm/cli", group: "CLIs & AI" },
  { dir: "packages/cli/create-damat-app", group: "CLIs & AI" },
  { dir: "packages/mcp", group: "CLIs & AI" },
];

function readName(dir: string): string {
  const pkg = JSON.parse(readFileSync(join(ROOT, dir, "package.json"), "utf-8"));
  return pkg.name as string;
}

function readDescription(dir: string): string {
  const pkg = JSON.parse(readFileSync(join(ROOT, dir, "package.json"), "utf-8"));
  return (pkg.description as string) ?? "";
}

function docFiles(dir: string): string[] {
  const docsDir = join(ROOT, dir, "docs");
  if (!existsSync(docsDir)) return [];
  return readdirSync(docsDir)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => (a === "README.md" ? -1 : b === "README.md" ? 1 : a.localeCompare(b)))
    .map((f) => `${dir}/docs/${f}`);
}

const groups: Record<string, any[]> = {};
for (const { dir, group } of packageList) {
  (groups[group] ??= []).push({
    name: readName(dir),
    description: readDescription(dir),
    dir,
    readme: `${dir}/README.md`,
    docsIndex: existsSync(join(ROOT, dir, "docs", "README.md")) ? `${dir}/docs/README.md` : null,
    docs: docFiles(dir),
  });
}
const packages = Object.entries(groups).map(([group, items]) => ({ group, packages: items }));

// --- Assemble ----------------------------------------------------------------
const map = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  name: "Damat documentation",
  description: "Navigation map for the Damat docs site: the step-by-step guide plus every package's overview and internals.",
  generatedBy: "docs/build-guide-json.ts",
  home: "README.md",
  guideIndex: "docs/GUIDE.md",
  topLevel: [
    { id: "readme", title: "Overview", path: "README.md", summary: "Top-level project overview and package index." },
    { id: "guide", title: "The Damat Guide", path: "docs/GUIDE.md", summary: "The step-by-step usage guide (this map indexes its chapters)." },
    { id: "modules", title: "Module manifest contract", path: "MODULES.md", summary: "The module.json contract, registry refs, and the trust model." },
    { id: "agents", title: "AI contributor guide", path: "AGENTS.md", summary: "Repo map, conventions, and common-task recipes for AI assistants." },
  ],
  skills: [
    { id: "damat-modules", title: "Working with Damat modules", path: ".claude/skills/damat-modules/SKILL.md" },
    { id: "damat-backend", title: "Working in a Damat backend", path: ".claude/skills/damat-backend/SKILL.md" },
  ],
  guide,
  packages,
  referenceApp: { name: "@damatjs/default", dir: "backend/default", readme: "backend/default/README.md" },
};

writeFileSync(join(ROOT, "docs", "guide.json"), JSON.stringify(map, null, 2) + "\n");
const chapterCount = guide.reduce((a, s) => a + s.chapters.length, 0);
const pkgCount = packages.reduce((a, g) => a + g.packages.length, 0);
console.log(`Wrote docs/guide.json — ${chapterCount} chapters, ${pkgCount} packages.`);
