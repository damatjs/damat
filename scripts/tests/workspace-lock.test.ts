import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyWorkspaceLock } from "../release/workspace-lock";

const roots: string[] = [];

function fixture(lockVersion?: string) {
  const root = mkdtempSync(join(tmpdir(), "damat-lock-"));
  roots.push(root);
  const dir = join(root, "packages/example");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "@damatjs/example", version: "1.0.3" }),
  );
  writeFileSync(
    join(root, "bun.lock"),
    `{"workspaces":{"packages/example":{"name":"@damatjs/example"${lockVersion ? `,"version":"${lockVersion}"` : ""},},},}`,
  );
  return {
    root,
    packages: [{ dir, name: "@damatjs/example", version: "1.0.3" }],
  };
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

test("accepts synchronized JSONC workspace versions", () => {
  const input = fixture("1.0.3");
  expect(() => verifyWorkspaceLock(input.root, input.packages)).not.toThrow();
});

test("rejects stale or missing workspace versions", () => {
  const stale = fixture("1.0.2");
  expect(() => verifyWorkspaceLock(stale.root, stale.packages)).toThrow(
    "Run bun install and commit bun.lock",
  );
  const missing = fixture();
  expect(() => verifyWorkspaceLock(missing.root, missing.packages)).toThrow(
    "@damatjs/example@<missing>",
  );
});
