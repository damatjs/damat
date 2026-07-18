import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadSystemMigrations } from "../cli/utils/load";

test("pipelines select durability and jobs before pipeline storage", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-catalog-"));
  try {
    fs.writeFileSync(
      path.join(root, "damat.config.ts"),
      "export default { services: { pipelines: {} } }",
    );
    const migrations = await loadSystemMigrations("damat.config.ts", root);
    expect(migrations.map(({ owner, id }) => `${owner}:${id}`)).toEqual([
      "@damatjs/durability:001",
      "@damatjs/durability:002",
      "@damatjs/durability:003",
      "@damatjs/durability:004",
      "@damatjs/jobs:001",
      "@damatjs/jobs:002",
      "@damatjs/jobs:003",
      "@damatjs/pipelines:001",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
