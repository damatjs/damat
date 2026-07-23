import { afterEach, expect, it, mock } from "bun:test";
import { resetMocks, state } from "./setup";
import { createContext, fakeSpawnResult } from "./helpers";
import type { Command } from "@damatjs/cli";

const { buildCommand } = (await import("../commands/build")) as {
  buildCommand: Command;
};
const { buildConfig } = await import("../commands/build/buildConfig");
const { devCommand } = (await import("../commands/dev")) as {
  devCommand: Command;
};
const { startCommand } = (await import("../commands/start")) as {
  startCommand: Command;
};

const runtime = Bun as unknown as { spawn: typeof Bun.spawn };
const originalSpawn = runtime.spawn;

afterEach(() => {
  runtime.spawn = originalSpawn;
  resetMocks();
});

it("resolves every app process launcher when invoked", async () => {
  resetMocks();
  const lateSpawn = mock(() => fakeSpawnResult());
  runtime.spawn = lateSpawn as unknown as typeof Bun.spawn;
  const { ctx, logger } = createContext(
    { output: ".damat/dist", target: "bun", minify: false, port: 3000 },
    { cwd: "/project" },
  );

  await buildCommand.handler(ctx);
  state.existsMap = { "/project/damat.config.ts": true };
  await buildConfig("/project", "/project/.damat/dist", "bun", logger);
  await devCommand.handler(ctx);
  state.existsMap = { "/project/.damat/dist/entry.js": true };
  await startCommand.handler(ctx);

  expect(lateSpawn).toHaveBeenCalledTimes(4);
});
