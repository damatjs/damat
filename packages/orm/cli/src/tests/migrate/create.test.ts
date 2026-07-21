import { expect, test } from "bun:test";
import path from "node:path";
import {
  context,
  loadCreate,
  logged,
  POST,
  setupMigrateFixture,
  state,
  USER,
  writeConfig,
} from "./fixture";

setupMigrateFixture();

test.serial("create validates the module selection and config", async () => {
  let view = context();
  expect((await (await loadCreate()).handler(view.ctx)).exitCode).toBe(1);
  expect(logged(view.calls, "error", /Module name is required/)).toBe(true);
  view = context(["user"]);
  expect((await (await loadCreate()).handler(view.ctx)).exitCode).toBe(1);
  writeConfig({ modules: {} });
  expect(
    (await (await loadCreate()).handler(context(["user"]).ctx)).exitCode,
  ).toBe(1);
  writeConfig({ modules: { other: POST } });
  view = context(["user"]);
  expect((await (await loadCreate()).handler(view.ctx)).exitCode).toBe(1);
  expect(logged(view.calls, "error", /user.*not found/)).toBe(true);
});

test.serial(
  "create writes an initial migration without a snapshot",
  async () => {
    writeConfig({ modules: { user: USER } });
    state.initialResult = path.join(USER, "migrations", "initial.sql");
    const { ctx, calls } = context(["user"]);
    expect((await (await loadCreate()).handler(ctx)).exitCode).toBe(0);
    expect(state.snapshotArg).toBe(path.join(USER, "migrations"));
    expect(state.initialArgs).toEqual({ name: "user", resolve: USER });
    expect(state.diffArgs).toBeNull();
    expect(logged(calls, "success", /Migration created/)).toBe(true);
  },
);

test.serial("create writes a diff migration and reports warnings", async () => {
  writeConfig({ modules: { user: USER } });
  state.snapshot = true;
  state.diffResult = {
    hasChanges: true,
    filePath: "/diff.sql",
    warnings: ["risky"],
  };
  const { ctx, calls } = context(["user"]);
  expect((await (await loadCreate()).handler(ctx)).exitCode).toBe(0);
  expect(state.diffArgs).toEqual({ name: "user", resolve: USER });
  expect(logged(calls, "warn", /risky/)).toBe(true);
});

test.serial("create skips an empty diff", async () => {
  writeConfig({ modules: { user: USER } });
  state.snapshot = true;
  state.diffResult = { hasChanges: false, filePath: "", warnings: undefined };
  const { ctx, calls } = context(["user"]);
  expect((await (await loadCreate()).handler(ctx)).exitCode).toBe(0);
  expect(logged(calls, "skip", /No changes detected/)).toBe(true);
});

test.serial("create reports generation failures", async () => {
  writeConfig({ modules: { user: USER } });
  state.initialError = new Error("write denied");
  const { ctx, calls } = context(["user"]);
  expect((await (await loadCreate()).handler(ctx)).exitCode).toBe(1);
  expect(logged(calls, "error", /write denied/)).toBe(true);
});
