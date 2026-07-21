export function damatManifestTemplate(name: string): string {
  return `${JSON.stringify(
    {
      $schema: "https://damat.dev/schemas/damat-v1.json",
      schemaVersion: 1,
      kind: "application",
      name,
      install: {
        accepts: {
          module: { to: "src/modules/{id}" },
          routes: { to: "src/api/routes/{id}" },
          workflows: { to: "src/workflows/{id}" },
          jobs: { to: "src/jobs/{id}" },
          events: { to: "src/events/{id}" },
          pipelines: { to: "src/pipelines/{id}" },
          links: { to: "src/links/{id}" },
          tests: { to: "tests/modules/{id}" },
          migrations: { to: "src/modules/{id}/migrations" },
          models: { to: "src/modules/{id}/models" },
          types: { to: "src/modules/{id}/types" },
        },
      },
    },
    null,
    2,
  )}\n`;
}
