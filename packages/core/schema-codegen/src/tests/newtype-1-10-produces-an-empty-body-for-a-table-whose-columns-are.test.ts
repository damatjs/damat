import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";

describe("generateNewType", () => {
  it("produces an empty body for a table whose columns are all auto/skipped", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "stamp",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "created_at", type: "date", nullable: false },
      ],
    };
    const lines = generateNewType(table, new Set(["id"]));
    expect(lines).toEqual(["export type NewStamp = {", "};"]);
  });
});
