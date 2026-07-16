import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateUpdateType } from "../render/updateType";

describe("generateUpdateType", () => {
  it("handles composite PK with multiple columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "junction",
      columns: [
        { name: "left_id", type: "uuid", nullable: false, primaryKey: true },
        { name: "right_id", type: "uuid", nullable: false, primaryKey: true },
        { name: "data", type: "text", nullable: true },
      ],
    };

    const lines = generateUpdateType(table);
    expect(lines).toContain(
      "export type UpdateJunction = Partial<Omit<Junction, 'left_id' | 'right_id'>>;",
    );
  });
});
