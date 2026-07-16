import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateUpdateType } from "../render/updateType";

describe("generateUpdateType", () => {
  it("generates correct type name for snake_case tables", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "order_item",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
      ],
    };

    const lines = generateUpdateType(table);
    expect(lines.some((l) => l.includes("UpdateOrderItem"))).toBe(true);
  });
});
