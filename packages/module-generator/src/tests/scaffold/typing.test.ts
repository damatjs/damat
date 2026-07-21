import { expect, test } from "bun:test";
import { deriveNames } from "../../scaffold/naming";
import {
  stepCreate,
  stepDelete,
  stepFind,
  stepFindMany,
  stepUpdate,
} from "../../scaffold/templates/step";

const names = deriveNames("inventory", {
  name: "items",
  columns: [
    { name: "id", type: "text", nullable: false, primaryKey: true },
    { name: "name", type: "text", nullable: false },
  ],
});

test("CRUD steps bind generic service rows to generated row types", () => {
  expect(stepCreate(names, "@inventory/types")).toContain("as Items;");
  expect(stepDelete(names, "@inventory/types")).toContain("as Items | null;");
  expect(stepFind(names, "@inventory/types")).toContain("as Items | null;");
  expect(stepFindMany(names, "@inventory/types")).toContain("as Items[];");
  const update = stepUpdate(names, "@inventory/types");
  expect(update).toContain("as Items | null;");
  expect(update).toContain("as Items[];");
  expect(update).not.toContain("as any");
});
