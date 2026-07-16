import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  damatConfigTemplate,
  damatManifestTemplate,
  envExampleTemplate,
  envTemplate,
  gitignoreTemplate,
  helloRouteTemplate,
  packageJsonTemplate,
  readmeTemplate,
  smokeTestTemplate,
  tsconfigTemplate,
  workflowsBarrelTemplate,
} from "./scaffold/templates";

export function writeScaffold(
  targetDir: string,
  name: string,
  version: string,
): void {
  const secrets = {
    jwtSecret: randomBytes(32).toString("hex"),
    cookieSecret: randomBytes(32).toString("hex"),
  };
  const files: Record<string, string> = {
    "package.json": packageJsonTemplate(name, version),
    "damat.config.ts": damatConfigTemplate(name),
    "damat.json": damatManifestTemplate(name),
    "tsconfig.json": tsconfigTemplate(),
    ".env.example": envExampleTemplate(name),
    ".env": envTemplate(name, secrets),
    ".gitignore": gitignoreTemplate(),
    "README.md": readmeTemplate(name),
    "src/api/routes/hello/route.ts": helloRouteTemplate(name),
    "src/workflows/index.ts": workflowsBarrelTemplate(),
    "tests/smoke.test.ts": smokeTestTemplate(),
  };
  for (const dir of [
    "src/modules",
    "src/api/routes",
    "src/workflows",
    "src/jobs",
    "src/events",
    "src/pipelines",
    "src/links",
    "tests",
  ]) {
    mkdirSync(join(targetDir, dir), { recursive: true });
  }
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(targetDir, path);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content);
  }
}
