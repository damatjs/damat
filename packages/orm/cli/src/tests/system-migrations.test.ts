import { afterEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadSystemMigrations } from "../cli/utils/load";

const roots: string[] = [];

afterEach(() => {
  roots
    .splice(0)
    .forEach((root) => fs.rmSync(root, { recursive: true, force: true }));
});

async function load(services: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "system-catalog-"));
  roots.push(root);
  fs.writeFileSync(
    path.join(root, "damat.config.ts"),
    `export default { services: { ${services} } }`,
  );
  return loadSystemMigrations("damat.config.ts", root);
}

test("selects shared then jobs migrations when jobs are enabled", async () => {
  expect(
    (await load("jobs: {}")).map(({ owner, id }) => `${owner}:${id}`),
  ).toEqual([
    "@damatjs/durability:001",
    "@damatjs/durability:002",
    "@damatjs/jobs:001",
    "@damatjs/jobs:002",
  ]);
});

test("selects shared migrations when durable events are enabled", async () => {
  expect(await load("events: { durable: {} }")).toHaveLength(2);
});

test("does not select shared migrations for ordinary events", async () => {
  expect(await load("events: { broadcast: true }")).toEqual([]);
});
