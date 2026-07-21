import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

test("ModuleService emits an exported subclass through the framework", async () => {
  const output = await mkdtemp(`${tmpdir()}/damat-service-types-`);
  const packageRoot = fileURLToPath(new URL("../../..", import.meta.url));
  const project = fileURLToPath(
    new URL(
      "../../../test-fixtures/public-consumer/tsconfig.json",
      import.meta.url,
    ),
  );
  const compiler = Bun.resolveSync("typescript/bin/tsc", import.meta.dir);
  const build = Bun.spawnSync([process.execPath, "run", "build"], {
    cwd: packageRoot,
  });
  assertSuccess(build);
  const result = Bun.spawnSync([
    process.execPath,
    compiler,
    "-p",
    project,
    "--outDir",
    output,
  ]);

  try {
    assertSuccess(result);
    expect(result.exitCode).toBe(0);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
}, 60_000);

function assertSuccess(result: Bun.SyncSubprocess): void {
  if (result.exitCode === 0) return;
  throw new Error(result.stdout.toString() + result.stderr.toString());
}
