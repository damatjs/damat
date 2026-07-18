# The Damat Guide

A step-by-step walkthrough of Damat — from zero to a running, modular backend,
then deeper into every building block. The guide is split into short chapters so
it's easy to read and easy to publish as a docs site. A machine-readable map of
the whole thing (chapters + packages) lives in
[`guide.json`](./guide.json).

> **Starting with Damat?** Read [Introduction](./guide/01-introduction.md) and
> [Concepts](./guide/02-concepts.md), then follow
> [Getting started](./guide/03-getting-started.md). Already set up? Jump straight
> to the chapter you need below.

---

## Chapters

### Start here

1. [Introduction](./guide/01-introduction.md) — what Damat is and the package map
2. [Concepts — modules & the framework](./guide/02-concepts.md) — the idea and mental model
3. [Getting started](./guide/03-getting-started.md) — install, scaffold, project structure
4. [Configuration & environment](./guide/04-configuration.md) — `damat.config.ts` and env vars

### Build

5. [Defining models (the ORM DSL)](./guide/05-models.md)
6. [Migrations](./guide/06-migrations.md)
7. [Modules & services](./guide/07-modules-and-services.md)
   - 7b. [Querying & CRUD](./guide/07b-crud-reference.md) — the generated service methods, where operators, transactions
8. [Building HTTP APIs](./guide/08-http-apis.md)
9. [Workflows (the saga engine)](./guide/09-workflows.md)
10. [Redis: cache, queue, locks, rate limiting](./guide/10-redis.md)
    - 10b. [Events & background jobs](./guide/10b-events-and-jobs.md) — ephemeral events, durable delivery, jobs, inspection, recovery, and worker runtimes
    - 10c. [Durable pipelines](./guide/10c-pipelines.md) — persisted orchestration across jobs, events, workflows, waits, and branches
11. [Logging](./guide/11-logging.md)
12. [The default backend, end to end](./guide/12-default-backend.md)

### Modules & sharing

13. [Authoring a module](./guide/13-authoring-modules.md) — build one self-contained module (the blade)
14. [Installing existing modules](./guide/14-installing-modules.md)
    - 14b. [Publishing modules](./guide/14b-publishing-modules.md) — list a module in a registry, verification, run your own
15. [Installing modules with AI (MCP)](./guide/15-installing-modules-with-ai.md)
16. [Module capabilities](./guide/16-module-capabilities.md) — everything one module can do
17. [Composing & linking modules](./guide/17-composing-and-linking-modules.md) — the backend owner assembles the blades

### Operate & reference

18. [CLI reference](./guide/18-cli-reference.md)
19. [Deployment](./guide/19-deployment.md)
20. [Package reference](./guide/20-package-reference.md)
21. [Troubleshooting](./guide/21-troubleshooting.md)

---

## How this guide is organized

- This page is the **index**. Each chapter is a standalone page under
  [`docs/guide/`](./guide/) with prev/next navigation.
- **Usage** lives here. For the **internals** of any package (if you're changing
  its code), follow the _Internals_ links into each package's `docs/` folder, or
  see the [Package reference](./guide/20-package-reference.md).
- Related top-level docs: the [module manifest contract (MODULES.md)](../MODULES.md)
  and the [AI contributor guide (AGENTS.md)](../AGENTS.md).

## Building a docs site

The chapter files are plain Markdown with a stable order (`NN-*.md`).
[`guide.json`](./guide.json) describes the full navigation tree — sections,
chapters (id, title, slug, path, summary), the package docs, and top-level docs —
so a static-site generator can build the sidebar and routes without parsing
Markdown. Slugs and ordering there are the source of truth for a site.
