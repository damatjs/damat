import type { GuideSectionDefinition } from "../types";

export const buildSection: GuideSectionDefinition = {
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
        "Bind an auth module for sessions and API keys, then use typed request principals.",
      file: "08b-authentication.md",
      order: 8.5,
    },
    {
      id: "providers",
      title: "Integration providers",
      summary:
        "ModuleService-based auth, payment, subscription, and custom provider standards.",
      file: "08c-providers.md",
      order: 8.6,
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
        "Typed events and PostgreSQL-backed jobs with retries, recovery, inspection, and optional Redis wake-ups.",
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
};
