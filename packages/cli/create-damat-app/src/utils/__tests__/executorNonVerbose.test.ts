import { describe, it, expect } from "bun:test";
import execute from "../commands/executor";

// The non-verbose path uses `util.promisify(exec)` captured at module load.
// Bun's mock.module on the `child_process` builtin does NOT intercept that
// already-resolved binding (see the note in executor.test.ts), so we cannot
// mock it cleanly. We therefore exercise the real promisified-exec path with a
// tiny, deterministic, side-effect-free shell command. This does no git,
// network, or filesystem-scaffolding work — it just echoes a constant — so it
// is safe and stable in CI while covering the executor's non-verbose branch
// (output capture + env merging).

describe("execute (non-verbose path / promisified exec)", () => {
  it("should return captured stdout/stderr from a benign command", async () => {
    const result = await execute(["printf hello-stdout", {}] as any, {
      verbose: false,
    });
    expect(result.stdout).toBe("hello-stdout");
    expect(result.stderr).toBe("");
  });

  it("should merge process.env with the provided options.env", async () => {
    // Echo a custom env var to prove env merging reaches the child process.
    const result = await execute(
      ["printf %s \"$MY_EXEC_TEST_VAR\"", { env: { MY_EXEC_TEST_VAR: "xyz" } }] as any,
      { verbose: false },
    );
    expect(result.stdout).toBe("xyz");
  });

  it("should default needsVerbose to false (no verbose option object key)", async () => {
    const result = await execute(["printf ok", {}] as any, {});
    expect(result.stdout).toBe("ok");
  });

  it("should capture stderr output from a benign command", async () => {
    const result = await execute(
      ["printf err-out 1>&2", {}] as any,
      { verbose: false },
    );
    expect(result.stderr).toBe("err-out");
  });
});
