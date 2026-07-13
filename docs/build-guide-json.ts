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
// Most chapters are auto-numbered (01, 02, …). A chapter inserted between two
// existing ones declares an explicit `file` (the NNb-*.md on disk) and a
// fractional `order` so the surrounding numbering never shifts.
interface ChapterDef {
  id: string;
  title: string;
  summary: string;
  /** Explicit filename under docs/guide/ for inserted (NNb-*) chapters. */
  file?: string;
  /** Fractional sort order for inserted chapters (e.g. 7.5 for 07b). */
  order?: number;
}

const sections: Array<{ id: string; title: string; chapters: ChapterDef[] }> = [
  {
    id: "start-here",
    title: "Start here",
    chapters: [
      {
        id: "introduction",
        title: "Introduction",
        summary: "What Damat is and the package map.",
      },
      {
        id: "concepts",
        title: "Concepts — modules & the framework",
        summary:
          "The idea behind Damat: what a module is, why the backend is shaped this way, and how the framework wires modules together.",
      },
      {
        id: "getting-started",
        title: "Getting started",
        summary:
          "Install, scaffold a new app or run the reference backend, and the project structure.",
      },
      {
        id: "configuration",
        title: "Configuration & environment",
        summary: "damat.config.ts, projectConfig, and the .env cascade.",
      },
    ],
  },
  {
    id: "build",
    title: "Build",
    chapters: [
      {
        id: "models",
        title: "Defining models (the ORM DSL)",
        summary: "The fluent, type-safe model/columns DSL.",
      },
      {
        id: "migrations",
        title: "Migrations",
        summary: "The module-aware migration system and the damat-orm CLI.",
      },
      {
        id: "modules-and-services",
        title: "Modules & services",
        summary: "ModuleService auto-CRUD, credentials, and defineModule.",
      },
      {
        id: "crud-reference",
        title: "Querying & the CRUD service",
        summary:
          "The generated service methods, where operators, read caching, and transactions.",
        file: "07b-crud-reference.md",
        order: 7.5,
      },
      {
        id: "http-apis",
        title: "Building HTTP APIs",
        summary: "File-based routing with Hono.",
      },
      {
        id: "authentication",
        title: "Authentication",
        summary:
          "Integrate Better Auth, Clerk, Auth0 — or your own provider — via services.auth; typed c.get('user').",
        file: "08b-authentication.md",
        order: 8.5,
      },
      {
        id: "workflows",
        title: "Workflows (the saga engine)",
        summary: "Steps with compensation and saga orchestration on Effect-TS.",
      },
      {
        id: "redis",
        title: "Redis: cache, queue, locks, rate limiting",
        summary: "Batteries-included Redis helpers.",
      },
      {
        id: "events-and-jobs",
        title: "Events & background jobs",
        summary:
          "The typed event bus (model CRUD events, Redis broadcast) and Redis-backed background jobs with retries and dead-lettering.",
        file: "10b-events-and-jobs.md",
        order: 10.5,
      },
      {
        id: "logging",
        title: "Logging",
        summary: "Structured logging with levels, formats, and file transport.",
      },
      {
        id: "default-backend",
        title: "The default backend, end to end",
        summary: "The reference app as a worked example.",
      },
    ],
  },
  {
    id: "modules-and-sharing",
    title: "Modules & sharing",
    chapters: [
      {
        id: "authoring-modules",
        title: "Authoring a module",
        summary:
          "Build one self-contained, single-purpose module (the blade) and test it in isolation.",
      },
      {
        id: "installing-modules",
        title: "Installing existing modules",
        summary:
          "damat module add / remove / update from a registry ref, path, or git.",
      },
      {
        id: "publishing-modules",
        title: "Publishing modules",
        summary:
          "List a module in a registry — damat module publish, verification, running your own registry.",
        file: "14b-publishing-modules.md",
        order: 14.5,
      },
      {
        id: "installing-modules-with-ai",
        title: "Installing modules with AI (MCP)",
        summary: "Discover and install modules through the MCP server.",
      },
      {
        id: "module-capabilities",
        title: "Module capabilities",
        summary:
          "Everything one module can do — the full model/service/config/migration/codegen/workflow/test/packaging surface.",
      },
      {
        id: "composing-and-linking-modules",
        title: "Composing & linking modules",
        summary:
          "The backend owner's job: getModule, cross-module links, pairsWith hints, and wiring modules into the app.",
      },
    ],
  },
  {
    id: "operate-and-reference",
    title: "Operate & reference",
    chapters: [
      {
        id: "cli-reference",
        title: "CLI reference",
        summary: "damat and damat-orm.",
      },
      {
        id: "deployment",
        title: "Deployment",
        summary: "Docker and production release flow.",
      },
      {
        id: "package-reference",
        title: "Package reference",
        summary: "Links to every package's README and internals.",
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        summary: "Common symptoms and fixes.",
      },
    ],
  },
];

// Number the chapter files (01-introduction.md, …) by global order. Chapters
// with an explicit `file`/`order` keep it and do not advance the counter.
let n = 0;
const guide = sections.map((section) => ({
  id: section.id,
  title: section.title,
  chapters: section.chapters.map((ch) => {
    let order: number;
    let file: string;
    if (ch.file !== undefined && ch.order !== undefined) {
      order = ch.order;
      file = `guide/${ch.file}`;
    } else {
      n += 1;
      order = n;
      file = `guide/${String(n).padStart(2, "0")}-${ch.id}.md`;
    }
    if (!existsSync(join(ROOT, "docs", file))) {
      throw new Error(`Missing chapter file: docs/${file}`);
    }
    return {
      id: ch.id,
      order,
      title: ch.title,
      slug: ch.id,
      path: `docs/${file}`,
      summary: ch.summary,
    };
  }),
}));

// --- Packages (grouped, ordered) --------------------------------------------
const packageList: Array<{ dir: string; group: string }> = [
  { dir: "packages/framework", group: "Framework & app" },
  { dir: "packages/service", group: "Framework & app" },
  { dir: "packages/module", group: "Framework & app" },
  { dir: "packages/link", group: "Framework & app" },
  { dir: "packages/workflow-engine", group: "Framework & app" },
  { dir: "packages/orm/main", group: "ORM" },
  { dir: "packages/orm/model", group: "ORM" },
  { dir: "packages/orm/pg", group: "ORM" },
  { dir: "packages/orm/connector", group: "ORM" },
  { dir: "packages/orm/migration", group: "ORM" },
  { dir: "packages/orm/processor", group: "ORM" },
  { dir: "packages/core/codegen", group: "ORM" },
  { dir: "packages/orm/core", group: "ORM" },
  { dir: "packages/orm/type", group: "ORM" },
  { dir: "packages/core/logger", group: "Core" },
  { dir: "packages/core/redis", group: "Core" },
  { dir: "packages/core/events", group: "Core" },
  { dir: "packages/core/jobs", group: "Core" },
  { dir: "packages/auth/core", group: "Auth" },
  { dir: "packages/auth/better-auth", group: "Auth" },
  { dir: "packages/auth/clerk", group: "Auth" },
  { dir: "packages/auth/auth0", group: "Auth" },
  { dir: "packages/core/env", group: "Core" },
  { dir: "packages/core/types", group: "Core" },
  { dir: "packages/core/cli", group: "Core" },
  { dir: "packages/deps", group: "Core" },
  { dir: "packages/typescript-config", group: "Core" },
  { dir: "packages/cli/damat", group: "CLIs & AI" },
  { dir: "packages/orm/cli", group: "CLIs & AI" },
  { dir: "packages/mcp", group: "CLIs & AI" },
];

function readName(dir: string): string {
  const pkg = JSON.parse(
    readFileSync(join(ROOT, dir, "package.json"), "utf-8"),
  );
  return pkg.name as string;
}

function readDescription(dir: string): string {
  const pkg = JSON.parse(
    readFileSync(join(ROOT, dir, "package.json"), "utf-8"),
  );
  return (pkg.description as string) ?? "";
}

function docFiles(dir: string): string[] {
  const docsDir = join(ROOT, dir, "docs");
  if (!existsSync(docsDir)) return [];
  return readdirSync(docsDir)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) =>
      a === "README.md" ? -1 : b === "README.md" ? 1 : a.localeCompare(b),
    )
    .map((f) => `${dir}/docs/${f}`);
}

const groups: Record<string, any[]> = {};
for (const { dir, group } of packageList) {
  (groups[group] ??= []).push({
    name: readName(dir),
    description: readDescription(dir),
    dir,
    readme: `${dir}/README.md`,
    docsIndex: existsSync(join(ROOT, dir, "docs", "README.md"))
      ? `${dir}/docs/README.md`
      : null,
    docs: docFiles(dir),
  });
}
const packages = Object.entries(groups).map(([group, items]) => ({
  group,
  packages: items,
}));

// --- Assemble ----------------------------------------------------------------
const map = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  name: "Damat documentation",
  description:
    "Navigation map for the Damat docs site: the step-by-step guide plus every package's overview and internals.",
  generatedBy: "docs/build-guide-json.ts",
  home: "README.md",
  guideIndex: "docs/GUIDE.md",
  topLevel: [
    {
      id: "readme",
      title: "Overview",
      path: "README.md",
      summary: "Top-level project overview and package index.",
    },
    {
      id: "guide",
      title: "The Damat Guide",
      path: "docs/GUIDE.md",
      summary: "The step-by-step usage guide (this map indexes its chapters).",
    },
    {
      id: "modules",
      title: "Module manifest contract",
      path: "MODULES.md",
      summary: "The module.json contract, registry refs, and the trust model.",
    },
    {
      id: "agents",
      title: "AI contributor guide",
      path: "AGENTS.md",
      summary:
        "Repo map, conventions, and common-task recipes for AI assistants.",
    },
  ],
  skills: [
    {
      id: "damat-modules",
      title: "Working with Damat modules",
      path: ".claude/skills/damat-modules/SKILL.md",
    },
    {
      id: "damat-backend",
      title: "Working in a Damat backend",
      path: ".claude/skills/damat-backend/SKILL.md",
    },
  ],
  guide,
  packages,
  referenceApp: {
    name: "@damatjs/default",
    dir: "backend/default",
    readme: "backend/default/README.md",
  },
};

writeFileSync(
  join(ROOT, "docs", "guide.json"),
  JSON.stringify(map, null, 2) + "\n",
);
const chapterCount = guide.reduce((a, s) => a + s.chapters.length, 0);
const pkgCount = packages.reduce((a, g) => a + g.packages.length, 0);
console.log(
  `Wrote docs/guide.json — ${chapterCount} chapters, ${pkgCount} packages.`,
);
