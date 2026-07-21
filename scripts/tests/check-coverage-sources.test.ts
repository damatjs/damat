import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findCoverageGaps } from "../check-coverage-sources";

const created: string[] = [];

afterEach(async () => {
  await Promise.all(
    created.splice(0).map((dir) => rm(dir, { recursive: true })),
  );
});

async function fixture(lcov: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "damat-coverage-"));
  created.push(root);
  const pkg = join(root, "packages/example");
  await mkdir(join(pkg, "src/tests"), { recursive: true });
  await mkdir(join(pkg, "coverage"), { recursive: true });
  await Bun.write(
    join(pkg, "bunfig.toml"),
    `[test]\ncoverage = true\ncoveragePathIgnorePatterns = ["**/tests/**"]\n`,
  );
  await Bun.write(join(pkg, "src/runtime.ts"), "export const value = 1;\n");
  await Bun.write(join(pkg, "src/types.ts"), "export type Id = string;\n");
  await Bun.write(join(pkg, "src/tests/ignored.ts"), "throw new Error();\n");
  await Bun.write(join(pkg, "coverage/lcov.info"), lcov);
  return root;
}

test("accepts every executable source in LCOV", async () => {
  const root = await fixture("SF:src/runtime.ts\nend_of_record\n");
  expect(await findCoverageGaps(root)).toEqual([]);
});

test("rejects executable source absent from LCOV", async () => {
  const root = await fixture("");
  const gaps = await findCoverageGaps(root);
  expect(gaps).toHaveLength(1);
  expect(gaps[0]?.files[0]?.endsWith("src/runtime.ts")).toBeTrue();
});
