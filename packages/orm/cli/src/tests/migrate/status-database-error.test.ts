import { expect, test } from "bun:test";
import {
  context,
  loadStatus,
  logged,
  setupMigrateFixture,
  writeThrowingConfig,
} from "./fixture";

setupMigrateFixture();

test.serial("status reports database configuration load failures", async () => {
  writeThrowingConfig();
  const { ctx, calls } = context();

  expect((await (await loadStatus()).handler(ctx)).exitCode).toBe(1);
  expect(logged(calls, "error", /Failed to load database config/)).toBe(true);
  expect(logged(calls, "error", /db getter boom/)).toBe(true);
});
