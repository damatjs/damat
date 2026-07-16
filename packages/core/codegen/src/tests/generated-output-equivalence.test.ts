import { expect, test } from "bun:test";
import * as schema from "@damatjs/schema-codegen";
import * as legacy from "../index";
import { expectedFiles } from "./support/expectedFiles";
import { fixtureSchema } from "./support/fixtureSchema";

test("legacy and owner packages produce byte-identical schema files", () => {
  const owner = schema.generateFilesMap(fixtureSchema, { banner: false });
  const compatible = legacy.generateFilesMap(fixtureSchema, { banner: false });

  expect([...owner]).toEqual([...expectedFiles]);
  expect([...compatible]).toEqual([...owner]);
});
