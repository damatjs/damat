import { expect, test } from "bun:test";
import type { ModuleSchema } from "@damatjs/orm-type";
import { generateFilesMap } from "../../index";

test("forwards top-level and nested generation messages to an injected logger", () => {
  const messages: string[] = [];
  const logger = {
    debug: (message: string) => messages.push(message),
    info: (message: string) => messages.push(message),
  };
  const schema: ModuleSchema = {
    moduleName: "users",
    tables: [
      {
        name: "users",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
        ],
      },
    ],
    enums: [],
    relationships: [],
  };

  expect(generateFilesMap(schema, {}, logger).has("index.ts")).toBe(true);
  expect(messages).toContain("generateFilesMap started");
  expect(messages).toContain("generateTableFile started");
  expect(messages).toContain("generateTableFile completed");
  expect(messages).toContain("generateZodFile started");
  expect(messages).toContain("generateZodFile completed");
  expect(messages).toContain("generateFilesMap completed");
});
