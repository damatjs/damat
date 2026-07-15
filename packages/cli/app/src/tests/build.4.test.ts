// IMPORTANT: import the shared setup FIRST. Its module body installs the stable
// Bun.spawn dispatcher + the node:fs / load-env mocks BEFORE any command source
// is evaluated, so `../build` snapshots the dispatcher/mock (not the real ones).
// See setup.ts for the full rationale.
import { state, copyCalls, mockReaddirSync, mockStatSync, resetMocks } from "./setup";
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
  it("recurses into subdirectories when copying src", async () => {
    state.spawnExitCode = 0;
    state.existsMap = { "/project/src": true }; // config absent
    // src/ holds one subdir ("sub") and one file ("app.ts"); sub/ holds one file.
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === "/project/src") return ["sub", "app.ts"] as never;
      if (p === "/project/.damat/dist/src/sub" || p === "/project/src/sub")
        return ["nested.ts"] as never;
      return [] as never;
    });
    // Only the "sub" entry is a directory; everything else is a file.
    mockStatSync.mockImplementation((p: string) => ({
      isDirectory: () => String(p).endsWith("/sub"),
    }));
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    // The nested file was copied through the recursive branch.
    expect(copyCalls.some((c) => c.src === "/project/src/sub/nested.ts")).toBe(
      true,
    );
    expect(copyCalls.some((c) => c.src === "/project/src/app.ts")).toBe(true);
  });

});
