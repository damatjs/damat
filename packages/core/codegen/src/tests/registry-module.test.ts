import { expect, test } from "bun:test";
import { registryModuleAugmentation } from "../scaffold";

test("package registries derive the service from the resolved entry", () => {
  const output = registryModuleAugmentation(
    "blog",
    "BlogModule",
    "../../node_modules/blog/src/index",
  );
  expect(output).toContain(
    'type BlogModule = typeof import("../../node_modules/blog/src/index").default;',
  );
  expect(output).toContain('"blog": BlogModule["service"];');
});
