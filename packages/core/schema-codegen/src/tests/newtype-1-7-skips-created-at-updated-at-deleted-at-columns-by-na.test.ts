import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";

describe("generateNewType", () => {
  it("skips created_at / updated_at / deleted_at columns by name", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "record",
      columns: [
        { name: "value", type: "text", nullable: false },
        { name: "created_at", type: "date", nullable: false },
        { name: "updated_at", type: "date", nullable: true },
        { name: "deleted_at", type: "date", nullable: true },
      ],
    };
    const body = generateNewType(table, new Set()).join("\n");
    expect(body).toContain("value: string;");
    expect(body).not.toContain("created_at");
    expect(body).not.toContain("updated_at");
    expect(body).not.toContain("deleted_at");
  });
});
