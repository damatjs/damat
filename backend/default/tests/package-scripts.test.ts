import { expect, test } from "bun:test";

const packageJson = await Bun.file(
  new URL("../package.json", import.meta.url),
).json();
const scripts = packageJson.scripts as Record<string, string>;
const damat = "bun ./node_modules/@damatjs/damat-cli/dist/cli.js";
const orm = "bun ./node_modules/@damatjs/orm-cli/dist/bin.js";

test("backend scripts do not depend on install-time workspace bin links", () => {
  expect(scripts.dev).toBe(`${damat} dev`);
  expect(scripts.build).toBe(`${damat} build`);
  expect(scripts.start).toBe(`${damat} start`);
  expect(scripts.codegen).toBe(`${damat} codegen`);
  expect(scripts["db:setup"]).toBe(`${orm} database:setup`);
  expect(scripts["db:migrate"]).toBe(`${orm} migrate:up`);
  expect(scripts["db:status"]).toBe(`${orm} migrate:status`);
  expect(scripts["db:create"]).toBe(`${orm} migrate:create`);
});

test("backend unit tests isolate process-global mocks and registries", () => {
  expect(scripts["test:unit"]).toBe(
    "bun test --isolate --path-ignore-patterns=tests/recovery.test.ts",
  );
});
