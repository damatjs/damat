import { moduleCapabilities, moduleInstructions } from "../../profile";

export function manifestTemplate(name: string): string {
  const capabilities = moduleCapabilities("src/");
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
        provides: {
          module: capabilities.module,
          tests: capabilities.tests,
        },
        usageHints: [{ token: name }],
        instructions: moduleInstructions(name),
      },
      module: {
        description: `${name} module`,
        tests: "./tests",
        env: [],
        registry: { namespace: "", license: "MIT", keywords: [] },
      },
    },
    null,
    2,
  )}\n`;
}
