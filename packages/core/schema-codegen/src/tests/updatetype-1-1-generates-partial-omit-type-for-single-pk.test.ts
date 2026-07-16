import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateUpdateType } from "../render/updateType";

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
});
