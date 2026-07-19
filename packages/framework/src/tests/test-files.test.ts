import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { findFrameworkTests } from "./test-files";

test("framework tests run in a stable cross-platform order", () => {
  const root = resolve(import.meta.dir, "../..");
  const files = findFrameworkTests(root);
  expect(files).toEqual([...files].sort());
  expect(files).toContain("src/tests/services/auth.test.ts");
  expect(files).toContain("src/tests/services/wakeup-transport.test.ts");
});
