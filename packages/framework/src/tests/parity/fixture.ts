import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const providerNames = ["workflows", "jobs", "events", "pipelines"] as const;

export function write(root: string, path: string, value = ""): void {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
}

function providers(
  root: string,
  prefix: string,
  mode: string,
  suffix = "",
): void {
  for (const name of providerNames)
    write(
      root,
      `${prefix}/${name}${suffix}/index.ts`,
      `
      globalThis.__damatParity ??= {};
      globalThis.__damatParity["${mode}"] ??= [];
      globalThis.__damatParity["${mode}"].push("${name}");
    `,
    );
}

export function sourceFixture(root: string): void {
  write(root, "src/modules/billing/index.ts", "export default {};\n");
  write(root, "src/modules/billing/models/index.ts", "export {};\n");
  write(root, "src/modules/billing/migrations/Migration1.sql", "-- sql\n");
  write(
    root,
    "src/api/routes/billing/status/route.ts",
    `
    export const GET = (c) => c.json({ mode: "source" });
  `,
  );
  providers(root, "src", "source", "/billing");
}

export function packageFixture(root: string): string {
  const prefix = "node_modules/@fixtures/billing/src";
  write(root, `${prefix}/index.ts`, "export default {};\n");
  write(root, `${prefix}/models/index.ts`, "export {};\n");
  write(root, `${prefix}/migrations/Migration1.sql`, "-- sql\n");
  write(
    root,
    `${prefix}/api/routes/status/route.ts`,
    `
    export const GET = (c) => c.json({ mode: "package" });
  `,
  );
  providers(root, prefix, "package");
  write(
    root,
    "node_modules/@fixtures/billing/damat.json",
    JSON.stringify({
      schemaVersion: 1,
      kind: "module",
      name: "billing",
      module: {
        models: "./src/models",
        migrations: "./src/migrations",
        routes: "./src/api/routes",
        workflows: "./src/workflows",
        jobs: "./src/jobs",
        events: "./src/events",
        pipelines: "./src/pipelines",
      },
    }),
  );
  return join(root, "node_modules/@fixtures/billing");
}
