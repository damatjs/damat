import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateFilesMap } from "../index";

describe("generateFilesMap", () => {
  it("does not generate enums.ts when no enums", () => {
    const noEnumSchema: ModuleSchema = {
      moduleName: "test",
      tables: [
        {
          name: "item",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
    };
    const files = generateFilesMap(noEnumSchema);

    expect(files.has("enums.ts")).toBe(false);
    const indexContent = files.get("index.ts")!;
    expect(indexContent).not.toContain('export * from "./enums";');
  });
});
