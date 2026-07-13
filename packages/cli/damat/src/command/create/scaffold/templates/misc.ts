export function gitignoreTemplate(): string {
  return `node_modules/
dist/
.damat/
logs/
.env
.env.local
*.log
`;
}

/** A working example route so the app answers a request out of the box. */
export function helloRouteTemplate(name: string): string {
  return `import { RouteHandler } from "@damatjs/framework/router";

export const GET: RouteHandler = async (c) => {
  return c.json({
    success: true,
    data: { message: "Hello from ${name}" },
  });
};
`;
}

/**
 * The app-level workflow barrel. \`damat module add\` regenerates it when a
 * module ships workflows; until then it is an intentionally empty module.
 */
export function workflowsBarrelTemplate(): string {
  return `export {};\n`;
}

/** A minimal smoke test proving the config loads and has the expected shape. */
export function smokeTestTemplate(): string {
  return `import { describe, test, expect } from "bun:test";
import config from "../damat.config";

describe("damat.config", () => {
  test("exports a project config with an http block", () => {
    expect(config.projectConfig.http.port).toBeGreaterThan(0);
    expect(config.modules).toEqual({});
  });
});
`;
}

export function readmeTemplate(name: string): string {
  return `# ${name}

A [Damat](https://github.com/damatjs/damat) backend app. Routes are file-based
under \`src/api/routes\`, business logic lives in installable modules under
\`src/modules\`, and multi-step processes run on the workflow engine.

## Getting started

\`\`\`bash
bun install            # if the scaffold didn't already
cp .env.example .env   # already written with generated secrets on scaffold
bun run dev            # http://localhost:6543
\`\`\`

Verify it's alive:

\`\`\`bash
curl http://localhost:6543/api/hello
\`\`\`

## Commands

| Command | What it does |
|---------|--------------|
| \`bun run dev\` | Dev server with hot reload |
| \`bun run build\` / \`start\` | Production bundle / run it |
| \`bun run codegen\` | Generate row types + zod schemas for installed modules |
| \`bun run db:migrate\` / \`db:status\` / \`db:create\` | Run / inspect / create migrations |
| \`bun run test\` / \`typecheck\` | Tests / type-check |

## Adding functionality

Install a shareable module (models + service + routes + workflows in one unit):

\`\`\`bash
bunx damat module add <registry-ref>   # e.g. a ref from DAMAT_MODULE_REGISTRY
bun run db:migrate
bun run dev
\`\`\`

\`damat module list\` shows what's installed; \`remove\`/\`update\` manage it.
To author your own module: \`bunx damat module init <name>\` (the scaffold
includes a full AGENTS.md authoring guide).

## Layout

\`\`\`
damat.config.ts      # modules, database, http, logging
src/api/routes/      # file-based routes (folder = path, route.ts = handlers)
src/modules/         # installed module slices (models, service, migrations)
src/workflows/       # app-level workflow orchestrations (@workflows alias)
tests/               # bun test
\`\`\`
`;
}
