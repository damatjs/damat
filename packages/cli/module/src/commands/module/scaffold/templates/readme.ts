export function readmeTemplate(name: string): string {
  return `# ${name}

A Damat **module** — a self-contained vertical slice of a backend (models,
migrations, service, config, workflows, routes) that plugs into any Damat app.
You build and test it **standalone**, then install it into a backend with
\`damat module add <path>\`, which splits it across the app's layers.

> Read **[\`AGENTS.md\`](./AGENTS.md)** for the full authoring guide — the layout,
> the \`module.json\` contract, and the rules below in depth.

## The layering (the one rule)

\`\`\`
API route  →  Workflow  →  Step(s)  →  Service (CRUD + integrations)
\`\`\`

A route ONLY calls a workflow — never the service, never business logic. Workflows
orchestrate steps; only steps reach the service via the typed
\`getModule("${name}")\`. The service is **data + integrations only**.

## Codegen-first — basics first, then the rest

You never hand-write CRUD. Model the data, run codegen, and it generates the whole
slice (types + zod + \`registry.ts\`, plus scaffold-once \`workflows/<table>\` and
\`api/routes/<table>\`). Then extend it: real logic in the generated steps, custom
workflows, third-party integrations on the service. So: **models → codegen → extend.**

## No big files

Distribute code by concern: one model per \`src/models/<name>.ts\`, one integration
per \`src/lib/<provider>.ts\`, one helper-group per \`src/utils/<concern>.ts\`.

## Get started

\`\`\`bash
bun install
# add a model in src/models/, register it in src/service.ts via collectModels([...])
bun run migration:create   # diff models -> SQL migration
bun run migration:run      # apply this module's migrations to DATABASE_URL
bun run migration:status   # show applied vs pending migrations
bun run codegen            # types + zod + registry + CRUD scaffold
bun run dev                # run the module standalone (its own server + /health)
bun test                   # contract test always; service/api tests when DATABASE_URL is set
bun run build              # type-check + contract validate — the release gate
\`\`\`

## Stay portable

- **Import from the real packages:** \`ModuleService\`/\`defineModule\` ←
  \`@damatjs/services\`, \`getModule\` ← \`@damatjs/framework\`,
  \`model\`/\`columns\`/\`collectModels\` ← \`@damatjs/orm-model\`, workflow helpers ←
  \`@damatjs/workflow-engine\`, route types ← \`@damatjs/framework/router\`, \`z\` ←
  \`@damatjs/deps/zod\`. \`@damatjs/module\` itself is only the contract/config/tooling.
- **No cross-module internals:** store foreign ids as plain columns; if it pairs
  with another module leave a non-binding \`pairsWith\` hint in \`module.json\`.
- **The table name is the source of truth:** \`collectModels([...])\` derives each
  service accessor from the model's table name (\`model("items")\` → \`service.items\`).

## License

MIT
`;
}
