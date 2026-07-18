import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverModels } from "../discovery/models";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "damat-model-discovery-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(relative: string, source: string): string {
  const path = join(root, relative);
  writeFileSync(path, source);
  return path;
}

test("a provider file keeps only model-shaped exports", async () => {
  const provider = write(
    "models.ts",
    [
      'export const User = { _tableName: "users" };',
      "export const empty = null;",
      'export const text = "not-a-model";',
      "export const plain = {};",
      "export const wrongTable = { _tableName: 42 };",
    ].join("\n"),
  );

  expect(await discoverModels(provider)).toEqual([{ _tableName: "users" }]);
});

test("a directory without an index scans source files only", async () => {
  const models = join(root, "models");
  mkdirSync(models);
  writeFileSync(
    join(models, "a.ts"),
    'const User = { _tableName: "users" }; export { User, User as Again };',
  );
  writeFileSync(
    join(models, "b.js"),
    'export const Order = { _tableName: "orders" };',
  );
  writeFileSync(join(models, "ignored.d.ts"), "invalid declaration syntax");
  writeFileSync(join(models, "notes.md"), "not executable");

  expect(await discoverModels(models)).toEqual([
    { _tableName: "users" },
    { _tableName: "orders" },
  ]);
});

test("an index.js aggregate is accepted", async () => {
  const models = join(root, "models");
  mkdirSync(models);
  writeFileSync(
    join(models, "index.js"),
    'export const models = { Audit: { _tableName: "audits" } };',
  );

  expect(await discoverModels(models)).toEqual([{ _tableName: "audits" }]);
});
