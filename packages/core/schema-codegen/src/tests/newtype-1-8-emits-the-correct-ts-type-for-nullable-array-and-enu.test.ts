import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";

describe("generateNewType", () => {
  it("emits the correct TS type for nullable, array and enum columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "widget",
      columns: [
        { name: "name", type: "text", nullable: false },
        { name: "labels", type: "text", nullable: false, array: true },
        { name: "note", type: "text", nullable: true },
        { name: "kind", type: "enum", enum: "widget_kind", nullable: false },
      ],
    };
    const lines = generateNewType(table, new Set());
    expect(lines).toContain("  name: string;");
    expect(lines).toContain("  labels: Array<string>;");
    expect(lines).toContain("  note?: string | null;");
    expect(lines).toContain("  kind: WidgetKindEnum;");
  });
});
