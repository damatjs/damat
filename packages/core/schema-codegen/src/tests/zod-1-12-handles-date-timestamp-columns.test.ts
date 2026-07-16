import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateZodFile } from "../generator/generateZodFile";

describe("generateZodFile", () => {
  it("handles date/timestamp columns", () => {
    const dateSchema: ModuleSchema = {
      moduleName: "test",
      tables: [
        {
          name: "event",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "event_date", type: "date", nullable: false },
          ],
        },
      ],
      enums: [],
    };
    const content = generateZodFile(dateSchema.tables[0]!, dateSchema, null);
    expect(content).toContain("event_date: z.coerce.date()");
  });
});
