// IMPORTANT: import the shared setup FIRST. Its module body installs the stable
// Bun.spawn dispatcher + the node:fs / load-env mocks BEFORE any command source
// is evaluated, so `../build` snapshots the dispatcher/mock (not the real ones).
// See setup.ts for the full rationale.
import { state, spawnCalls, writeCalls, resetMocks } from "./setup";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createContext } from "./helpers";
import type { Command } from "@damatjs/cli";

/**
 * build.handler spawns `bun build` subprocesses and touches the filesystem.
 * The global fakes (recording Bun.spawn dispatcher + node:fs mock) live in
 * ./setup; per-test behaviour is driven by mutating the shared `state` and
 * reading the shared recording arrays. `node:path`'s join is left real (pure)
 * — assertions depend on real joining.
 *
 * copyDir: setup's mocked readdirSync returns ["app.ts"] and statSync reports a
 * non-directory by default, so the source performs exactly one copy.
 */

// Import the source AFTER setup installed the fakes (setup is imported first
// above). This binds `buildCommand` for the assertions below.
const { buildCommand } = (await import("../commands/build")) as {
  buildCommand: Command;
};

beforeEach(resetMocks);
afterEach(resetMocks);

const CWD = "/project";

describe("buildCommand.handler", () => {
  it("writes the temp entry file with the framework runEntry content", async () => {
    state.existsDefault = false; // src absent -> skip copy/config phase
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    const entryWrite = writeCalls.find((w) =>
      w.path.endsWith("/.damat/build-entry.ts"),
    );
    expect(entryWrite).toBeDefined();
    expect(entryWrite!.content).toBe(
      `import { runEntry } from "@damatjs/framework/entry";\nrunEntry();\n`,
    );
  });

  it("spawns `bun build` with the resolved entry/outfile/target args", async () => {
    state.existsDefault = false;
    const { ctx } = createContext(
      { output: ".damat/dist", target: "node", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(spawnCalls).toHaveLength(1);
    const call = spawnCalls[0]!;
    expect(call.cwd).toBe(CWD);
    expect(call.cmd).toEqual([
      "bun",
      "build",
      "/project/.damat/build-entry.ts",
      "--outfile",
      "/project/.damat/dist/entry.js",
      "--target",
      "node",
      "--packages",
      "external",
    ]);
    expect(call.cmd).not.toContain("--minify"); // minify=false
  });
});
