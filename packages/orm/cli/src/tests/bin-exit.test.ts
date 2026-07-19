import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

test("damat-orm propagates a failed command exit code", async () => {
  const cwd = mkdtempSync(resolve(tmpdir(), "damat-orm-bin-"));
  try {
    const child = Bun.spawn(
      [
        process.execPath,
        resolve(import.meta.dir, "../bin.ts"),
        "database:setup",
      ],
      { cwd, stdout: "pipe", stderr: "pipe" },
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect(`${stdout}\n${stderr}`).toContain("Database setup failed");
    expect(exitCode).toBe(1);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
