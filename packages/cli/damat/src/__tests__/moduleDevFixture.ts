import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

export function copyModuleDevFixture(): string {
  const source = join(
    import.meta.dir,
    "../../../../module/tests/fixtures/durable-module",
  );
  const target = mkdtempSync(join(source, "../.cli-module-dev-"));
  cpSync(source, target, {
    recursive: true,
    filter: (path) => basename(path) !== "run.ts",
  });
  linkModuleDevDependencies(target);
  return target;
}

export function linkModuleDevDependencies(target: string): void {
  const bin = join(target, "node_modules/.bin");
  mkdirSync(bin, { recursive: true });
  const executable = join(bin, "damat");
  const cli = join(import.meta.dir, "../cli.ts");
  writeFileSync(
    executable,
    `#!/usr/bin/env bun\nimport ${JSON.stringify(cli)};\n`,
  );
  chmodSync(executable, 0o755);
  const moduleRoot = join(import.meta.dir, "../../../../module");
  const workspaceScope = join(moduleRoot, "node_modules/@damatjs");
  const fixtureScope = join(target, "node_modules/@damatjs");
  mkdirSync(fixtureScope, { recursive: true });
  for (const name of readdirSync(workspaceScope)) {
    symlinkSync(join(workspaceScope, name), join(fixtureScope, name), "dir");
  }
  symlinkSync(moduleRoot, join(fixtureScope, "module"), "dir");
}
