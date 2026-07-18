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
    "@damatjs/durability:003",
    "@damatjs/durability:004",
    "@damatjs/jobs:001",
    "@damatjs/jobs:002",
    "@damatjs/jobs:003",
  ]);
});

test("selects shared then events migrations for durable events", async () => {
  expect(
    (await load("events: { durable: {} }")).map(
      ({ owner, id }) => `${owner}:${id}`,
    ),
  ).toEqual([
    "@damatjs/durability:001",
    "@damatjs/durability:002",
    "@damatjs/durability:003",
    "@damatjs/durability:004",
    "@damatjs/events:001",
    "@damatjs/events:002",
    "@damatjs/events:003",
    "@damatjs/events:004",
    "@damatjs/events:005",
  ]);
});

test("orders shared, jobs, then events catalogs", async () => {
  expect(
    (await load("jobs: {}, events: { durable: {} }")).map(({ owner }) => owner),
  ).toEqual([
    "@damatjs/durability",
    "@damatjs/durability",
    "@damatjs/durability",
    "@damatjs/durability",
    "@damatjs/jobs",
    "@damatjs/jobs",
    "@damatjs/jobs",
    "@damatjs/events",
    "@damatjs/events",
    "@damatjs/events",
    "@damatjs/events",
    "@damatjs/events",
  ]);
});

test("does not select shared migrations for ordinary events", async () => {
  expect(await load("events: { broadcast: true }")).toEqual([]);
});

test("wraps system catalog config failures with the config path", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "system-catalog-error-"));
  roots.push(root);
  fs.writeFileSync(
    path.join(root, "damat.config.ts"),
    `export default { get services() { throw new Error("catalog boom") } }`,
  );
  await expect(loadSystemMigrations("damat.config.ts", root)).rejects.toThrow(
    /Failed to load system migrations.*damat\.config\.ts/,
  );
});
