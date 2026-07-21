import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function makeBarrelTree() {
  const root = mkdtempSync(join(tmpdir(), "module-generator-barrel-"));
  const steps = join(root, "widgets", "steps");
  const workflows = join(root, "widgets", "workflows");
  mkdirSync(steps, { recursive: true });
  mkdirSync(workflows, { recursive: true });
  writeFileSync(
    join(steps, "createWidgets.ts"),
    "export const createWidgetsStep = 1;\n",
  );
  writeFileSync(
    join(workflows, "createWidgets.ts"),
    "export const createWidgetsWorkflow = 1;\n",
  );
  const read = (path: string) => readFileSync(join(root, path), "utf8");
  return { root, read, workflows };
}

export function exportLines(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("export * from"));
}
