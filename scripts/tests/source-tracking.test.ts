import { expect, test } from "bun:test";

const root = new URL("../../", import.meta.url);
const sources = [
  "packages/cli/app/src/commands/build/index.ts",
  "scripts/coverage/runtime-source.ts",
  "scripts/coverage/sources.ts",
];

test("source code is not hidden by output ignore rules", async () => {
  for (const source of sources) {
    const check = Bun.spawn(["git", "check-ignore", "--no-index", source], {
      cwd: root.pathname,
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await check.exited).toBe(1);
  }
});
