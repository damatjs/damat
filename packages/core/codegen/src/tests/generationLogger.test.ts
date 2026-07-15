import { expect, it } from "bun:test";
import type { ModuleSchema } from "@damatjs/orm-type";
import { generateFilesMap } from "../index";

it("accepts the neutral logger surface used by CLI commands", () => {
  const messages: string[] = [];
  const logger = {
    debug: (message: string) => messages.push(message),
    info: (message: string) => messages.push(message),
  };
  const schema: ModuleSchema = {
    moduleName: "users",
    tables: [],
    enums: [],
    relationships: [],
  };

  expect(generateFilesMap(schema, {}, logger).has("index.ts")).toBe(true);
  expect(messages).toContain("generateFilesMap started");
  expect(messages).toContain("generateFilesMap completed");
});
