import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";

describe("generateNewType", () => {
  it("generates correct type name", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "order_item",
      columns: [],
    };

    const lines = generateNewType(table, new Set());
    expect(lines.some((l) => l.includes("export type NewOrderItem"))).toBe(
      true,
    );
  });
});
