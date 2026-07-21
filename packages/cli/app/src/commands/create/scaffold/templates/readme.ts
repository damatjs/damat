export function readmeTemplate(name: string): string {
  return `# ${name}

A [Damat](https://github.com/damatjs/damat) backend app. Routes are file-based,
business logic lives in installable modules, local sagas use workflows, and
restartable processes use durable jobs, events, and pipelines.

## Getting started

\`\`\`bash
bun install            # if the scaffold didn't already
bun run db:setup       # creates PostgreSQL DB + durability/jobs/events/pipeline tables
bun run dev            # repeats the idempotent setup check, then starts on :6543
\`\`\`

Verify it's alive:

\`\`\`bash
curl http://localhost:6543/api/hello
\`\`\`

PostgreSQL is canonical for domain and durable history. Redis is optional
acceleration plus cache, pub/sub, locks, sessions, and rate limits.

## Commands

| Command | What it does |
|---------|--------------|
| \`bun run dev\` | Idempotent DB setup, then dev server with hot reload |
| \`bun run build\` / \`start\` | Production bundle / run it |
| \`bun run codegen\` | Generate row types + zod schemas for installed modules |
| \`bun run db:setup\` | Create the selected database and apply all migrations |
| \`bun run db:migrate\` / \`db:status\` / \`db:create\` | Run / inspect / create migrations |
| \`bun run test\` / \`typecheck\` | Tests / type-check |

## Adding functionality

Install a module and review its host integration instructions:

\`\`\`bash
bunx @damatjs/damat-cli@latest module plan <registry-ref>
bunx @damatjs/damat-cli@latest module add <registry-ref>
# register/import capabilities and add declared environment values
bun run db:migrate
bun run dev
\`\`\`

\`damat module list\` shows what's installed; \`remove\`/\`update\` manage it.
To author one: \`bunx @damatjs/damat-cli@latest module init <name>\`. The
scaffold includes a full AGENTS.md authoring guide.

## Layout

\`\`\`
damat.config.ts      # modules, database, http, logging
src/api/routes/      # file-based routes (folder = path, route.ts = handlers)
src/modules/         # installed module slices (models, service, migrations)
src/workflows/       # in-process saga workflows (@workflows alias)
src/jobs/            # durable background work
src/events/          # durable event definitions and handlers
src/pipelines/       # durable, branching multi-stage orchestration
tests/               # bun test
\`\`\`
`;
}
