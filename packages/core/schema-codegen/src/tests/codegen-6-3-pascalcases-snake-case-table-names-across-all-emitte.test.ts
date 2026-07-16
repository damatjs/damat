import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../index";

describe("generateTypes › relations and edge cases", () => {
  it("PascalCases snake_case table names across all emitted artifacts", () => {
    const schema: ModuleSchema = {
      moduleName: "x",
      tables: [
        {
          name: "order_item",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
    };
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain("export interface OrderItem {");
    expect(out).toContain("export type NewOrderItem = {");
    expect(out).toContain(
      "export type UpdateOrderItem = Partial<Omit<OrderItem, 'id'>>;",
    );
  });
});
