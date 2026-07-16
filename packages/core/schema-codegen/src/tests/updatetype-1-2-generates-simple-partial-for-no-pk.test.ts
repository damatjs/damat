import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateUpdateType } from "../render/updateType";

describe("generateUpdateType", () => {
  it("generates simple partial for no PK", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "mapping",
      columns: [
        { name: "key", type: "text", nullable: false },
        { name: "value", type: "text", nullable: false },
      ],
    };

    const lines = generateUpdateType(table);
    expect(lines).toContain("export type UpdateMapping = Partial<Mapping>;");
  });
});
