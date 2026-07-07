import { describe, it, expect } from "bun:test";
import execute from "../commands/executor";

// The non-verbose path uses `util.promisify(execFile)` captured at module
// load. Bun's mock.module on the `child_process` builtin does NOT intercept
// that already-resolved binding (see the note in executor.test.ts), so we
// cannot mock it cleanly. We therefore exercise the real execFile path with
// tiny, deterministic, side-effect-free commands (bun -e one-liners). This
// does no git, network, or filesystem-scaffolding work, so it is safe and
// stable in CI while covering the executor's non-verbose branch (argv
// spawning without a shell, output capture, env merging).

describe("execute (non-verbose path / promisified execFile)", () => {
  it("should return captured stdout/stderr from a benign command", async () => {
    const result = await execute(
      ["bun", ["-e", "process.stdout.write('hello-stdout')"], {}],
      { verbose: false },
    );
    expect(result.stdout).toBe("hello-stdout");
    expect(result.stderr).toBe("");
  });

  it("should merge process.env with the provided options.env", async () => {
    // Print a custom env var to prove env merging reaches the child process.
    const result = await execute(
      [
        "bun",
        ["-e", "process.stdout.write(process.env.MY_EXEC_TEST_VAR ?? '')"],
        { env: { MY_EXEC_TEST_VAR: "xyz" } },
      ],
      { verbose: false },
    );
    expect(result.stdout).toBe("xyz");
  });

  it("should default needsVerbose to false (no verbose option object key)", async () => {
    const result = await execute(
      ["bun", ["-e", "process.stdout.write('ok')"], {}],
      {},
    );
    expect(result.stdout).toBe("ok");
  });

  it("should capture stderr output from a benign command", async () => {
    const result = await execute(
      ["bun", ["-e", "process.stderr.write('err-out')"], {}],
      { verbose: false },
    );
    expect(result.stderr).toBe("err-out");
  });

  it("should NOT let a shell interpret metacharacters in arguments", async () => {
    // With shell:true, `$(...)` would have been expanded before reaching the
    // child. With argv spawning it arrives verbatim.
    const hostile = "$(printf pwned)";
    const result = await execute(
      ["bun", ["-e", "process.stdout.write(process.argv[1] ?? '')", hostile], {}],
      { verbose: false },
    );
    expect(result.stdout).toBe(hostile);
  });

  it("should treat an argument containing spaces as a single argv entry", async () => {
    const spaced = "my project dir";
    const result = await execute(
      ["bun", ["-e", "process.stdout.write(process.argv[1] ?? '')", spaced], {}],
      { verbose: false },
    );
    expect(result.stdout).toBe(spaced);
  });
});
