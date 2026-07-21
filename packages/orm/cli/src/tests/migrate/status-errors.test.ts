import { expect, test } from "bun:test";
import {
  context,
  loadStatus,
  logged,
  setupMigrateFixture,
  state,
  USER,
  writeConfig,
} from "./fixture";

setupMigrateFixture();

test.serial(
  "status rejects an unknown module and closes the pool",
  async () => {
    writeConfig({ modules: { user: USER } });
    const { ctx, calls } = context([], { module: "ghost" });
    expect((await (await loadStatus()).handler(ctx)).exitCode).toBe(1);
    expect(logged(calls, "error", /ghost.*not found/)).toBe(true);
    expect(state.ends).toBe(1);
  },
);
