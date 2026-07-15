import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectPackageManager } from "../../index";

function project(files: string[] = [], packageManager?: string): string {
  const root = mkdtempSync(join(tmpdir(), "installer-pm-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ packageManager }));
  for (const file of files) writeFileSync(join(root, file), "");
  return root;
}

describe("detectPackageManager", () => {
  test.each([
    ["bun.lock", "bun"],
    ["package-lock.json", "npm"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
  ] as const)("detects %s", (lockfile, expected) => {
    expect(detectPackageManager(project([lockfile]))).toBe(expected);
  });

  test("uses explicit selection or a matching packageManager field", () => {
    expect(detectPackageManager(project(["yarn.lock"]), "bun")).toBe("bun");
    expect(detectPackageManager(project(["bun.lock"], "bun@1.3.14"))).toBe(
      "bun",
    );
  });

  test("rejects ambiguous, conflicting, missing, and unsupported signals", () => {
    expect(() =>
      detectPackageManager(project(["bun.lock", "yarn.lock"])),
    ).toThrow("ambiguous");
    expect(() => detectPackageManager(project(["yarn.lock"], "bun@1"))).toThrow(
      "conflicts",
    );
    expect(() => detectPackageManager(project())).toThrow("detect");
    expect(() => detectPackageManager(project([], "deno@2"))).toThrow(
      "unsupported",
    );
  });
});
