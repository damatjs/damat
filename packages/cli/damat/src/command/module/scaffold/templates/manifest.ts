export function manifestTemplate(name: string): string {
  return `${JSON.stringify(
    {
      name,
      version: "0.0.1",
      description: `${name} module`,
      registry: { namespace: "", license: "MIT", keywords: [] },
      env: [],
      paths: {
        entry: "./index.ts",
        models: "./models",
        migrations: "./migrations",
        workflows: "./workflows",
        types: "./types",
      },
    },
    null,
    2,
  )}\n`;
}
