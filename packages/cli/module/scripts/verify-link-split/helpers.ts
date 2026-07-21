import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installModuleSplit } from "../../src/commands/module/helpers/copy";

export const verification = { failures: 0 };
export function check(label: string, condition: boolean): void {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    console.error(`  ✗ ${label}`);
    verification.failures++;
  }
}

type LinkLayout = "none" | "models" | "flat";
export function makeModuleSrc(
  root: string,
  links: LinkLayout = "models",
): string {
  const src = join(root, "module-src");
  mkdirSync(join(src, "models"), { recursive: true });
  writeFileSync(join(src, "index.ts"), "// entry\n");
  writeFileSync(join(src, "models", "user.ts"), "// model\n");
  const link =
    'import { defineLink } from "@damatjs/framework";\nexport default {};\n';
  if (links === "models") {
    mkdirSync(join(src, "links", "models"), { recursive: true });
    writeFileSync(join(src, "links", "models", "user-organization.ts"), link);
  } else if (links === "flat") {
    mkdirSync(join(src, "links"), { recursive: true });
    writeFileSync(join(src, "links", "user-organization.ts"), link);
  }
  return src;
}

export function withTemporaryApp(
  action: (root: string, cwd: string) => void,
): void {
  const root = mkdtempSync(join(tmpdir(), "damat-split-verify-"));
  const cwd = join(root, "app");
  mkdirSync(cwd, { recursive: true });
  try {
    action(root, cwd);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

export const install = (src: string, cwd: string, force = false) =>
  installModuleSplit(src, {
    cwd,
    moduleId: "user",
    modulesDir: "src/modules",
    packageDir: src,
    force,
  });
