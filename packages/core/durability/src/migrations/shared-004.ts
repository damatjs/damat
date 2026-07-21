import type { SystemMigration } from "./types";

export const shared004: SystemMigration = {
  owner: "@damatjs/durability",
  id: "004",
  order: 275,
  sql: `
ALTER TABLE "_damat_retention_overrides"
  DROP CONSTRAINT "_damat_retention_overrides_kind_check";
ALTER TABLE "_damat_retention_overrides"
  ADD CONSTRAINT "_damat_retention_overrides_kind_check"
  CHECK ("work_kind" IN ('job','event','pipeline'));
`.trim(),
};
