export function manifestTemplate(): string {
  return `${JSON.stringify(
    {
      $schema: "https://damat.dev/schemas/damat-v1.json",
      schemaVersion: 1,
      kind: "module",
      name: "auth",
      version: "0.1.0",
      module: {
        description:
          "Better Auth storage tables (user/session/account/verification).",
        entry: "./index.ts",
        models: "./models",
        migrations: "./migrations",
      },
    },
    null,
    2,
  )}\n`;
}
