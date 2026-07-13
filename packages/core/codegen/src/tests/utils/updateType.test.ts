import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateUpdateType } from "../../utils/updateType";

describe("generateUpdateType", () => {
  it("generates partial omit type for single PK", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
      ],
    };

    const lines = generateUpdateType(table);
    expect(lines).toContain(
      "export type UpdateProduct = Partial<Omit<Product, 'id'>>;",
    );
  });

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
