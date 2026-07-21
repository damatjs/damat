import { moduleCapabilities, moduleInstructions } from "../../profile";

export function manifestTemplate(name: string): string {
  return `${JSON.stringify(
    {
      $schema: "https://damat.dev/schemas/damat-v1.json",
      schemaVersion: 1,
      kind: "module",
      name,
      version: "0.0.1",
      install: {
        modes: ["source", "package"],
        default: "source",
        packageBackends: ["node", "damat"],
        provides: moduleCapabilities("src/"),
        usageHints: [{ token: name }],
        instructions: moduleInstructions(name),
      },
      module: {
        description: `${name} module`,
        models: "./src/models",
        migrations: "./src/migrations",
        routes: "./src/api/routes",
        workflows: "./src/workflows",
        jobs: "./src/jobs",
        events: "./src/events",
        pipelines: "./src/pipelines",
        links: "./src/links",
        tests: "./tests",
        types: "./src/types",
        env: [],
        registry: { namespace: "", license: "MIT", keywords: [] },
      },
    },
    null,
    2,
  )}\n`;
}
