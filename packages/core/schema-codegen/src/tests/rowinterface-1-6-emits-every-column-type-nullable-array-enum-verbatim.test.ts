import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateRowInterface } from "../render/rowInterface";

describe("generateRowInterface", () => {
  it("emits every column type (nullable, array, enum) verbatim", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "widget",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "title", type: "text", nullable: true },
        { name: "labels", type: "text", nullable: false, array: true },
        { name: "scores", type: "integer", nullable: true, array: true },
        { name: "kind", type: "enum", enum: "widget_kind", nullable: false },
        {
          name: "created_at",
          type: "timestamp with time zone",
          nullable: false,
        },
      ],
    };
    const lines = generateRowInterface(table, []);
    expect(lines).toContain("  id: string;");
    expect(lines).toContain("  title: string | null;");
    expect(lines).toContain("  labels: Array<string>;");
    expect(lines).toContain("  scores: Array<number> | null;");
    expect(lines).toContain("  kind: WidgetKindEnum;");
    // row interface keeps timestamp columns (unlike New*)
    expect(lines).toContain("  created_at: Date;");
  });
});
