import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../index";

describe("generateTypes › New and Update types", () => {
  it("falls back to Partial<T> when there is no primary key", () => {
    const noPk: ModuleSchema = {
      moduleName: "x",
      tables: [
        {
          name: "log",
          columns: [
            { name: "message", type: "text", nullable: false },
            { name: "level", type: "text", nullable: false },
          ],
        },
      ],
    };
    const out = generateTypes(noPk, { banner: false });
    expect(out).toContain("export type UpdateLog = Partial<Log>;");
  });
});
