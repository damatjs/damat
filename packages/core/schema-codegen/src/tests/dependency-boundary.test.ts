import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("schema codegen has only pure runtime dependencies", () => {
  const pkg = JSON.parse(
    readFileSync(join(import.meta.dir, "../../package.json"), "utf8"),
  );
  expect(pkg.dependencies).toEqual({
    "@damatjs/orm-type": "workspace:*",
  });
  const source = readFileSync(join(import.meta.dir, "../index.ts"), "utf8");
  expect(source).not.toContain("@damatjs/framework");
  expect(source).not.toContain("node:fs");
});
