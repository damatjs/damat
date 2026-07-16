import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function write(root: string, path: string, content = ""): string {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

export function createModule(root: string, name = "billing"): void {
  write(
    root,
    "damat.json",
    JSON.stringify({
      schemaVersion: 1,
      kind: "module",
      name,
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
  for (const path of [
    "src/index.ts",
    "src/models/index.ts",
    "src/migrations/Migration1.sql",
    "src/api/routes/health/route.ts",
    "src/workflows/index.ts",
    "src/jobs/index.ts",
    "src/events/index.ts",
    "src/pipelines/index.ts",
  ])
    write(root, path, "export {};\n");
}
