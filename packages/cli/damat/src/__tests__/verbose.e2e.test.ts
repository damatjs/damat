import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function invoke(args: string[]) {
  const child = Bun.spawn(
    [process.execPath, join(import.meta.dir, "../cli.ts"), ...args],
    {
      cwd: tmpdir(),
      env: { ...process.env, NO_COLOR: "1" },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, output: `${stdout}${stderr}` };
}

describe("Damat global verbose option", () => {
  test.each([
    ["before commands", ["--verbose", "module", "dev"]],
    ["after commands", ["module", "dev", "--verbose"]],
  ])("shows module failure stacks %s", async (_label, args) => {
    const result = await invoke(args);
    expect(result.code).toBe(1);
    expect(result.output).toContain("Verbose mode enabled");
    expect(result.output).toContain("at locateModuleDir");
    expect(result.output).not.toContain("Unknown command");
  });

  test("keeps stacks hidden without verbose", async () => {
    const result = await invoke(["module", "dev"]);
    expect(result.code).toBe(1);
    expect(result.output).toContain("Run again with --verbose");
    expect(result.output).not.toContain("at locateModuleDir");
  });
});
