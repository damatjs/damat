import { expect, test } from "bun:test";
import {
  context,
  loadList,
  logged,
  POST,
  setupMigrateFixture,
  state,
  USER,
  writeConfig,
} from "./fixture";

setupMigrateFixture();

test.serial("list reports missing config and empty modules", async () => {
  let view = context();
  expect((await (await loadList()).handler(view.ctx)).exitCode).toBe(1);
  expect(logged(view.calls, "error", /Failed to load config/)).toBe(true);
  writeConfig({ modules: {} });
  view = context();
  expect((await (await loadList()).handler(view.ctx)).exitCode).toBe(1);
  expect(logged(view.calls, "error", /No modules found/)).toBe(true);
});

test.serial("list reports when no module migrations exist", async () => {
  writeConfig({ modules: { user: USER } });
  const { ctx, calls } = context();
  expect((await (await loadList()).handler(ctx)).exitCode).toBe(0);
  expect(state.discoverArgs).toEqual([USER]);
  expect(logged(calls, "skip", /No modules with migrations/)).toBe(true);
});

test.serial("list sorts module migration counts and pluralizes", async () => {
  writeConfig({ modules: { user: USER, post: POST } });
  state.migrations = [{ name: "user" }, { name: "user" }, { name: "post" }];
  const { ctx, calls } = context();
  expect((await (await loadList()).handler(ctx)).exitCode).toBe(0);
  const messages = calls
    .filter((call) => call.level === "info")
    .map((call) => call.msg);
  expect(messages.indexOf("post (1 migration)")).toBeLessThan(
    messages.indexOf("user (2 migrations)"),
  );
});
