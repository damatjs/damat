import { describe, it, expect } from "bun:test";
import { PRIORITY } from "../../diff/priority";

describe("PRIORITY ordering invariants", () => {
  it("creates enums before tables before columns before indexes before FKs", () => {
    expect(PRIORITY.CREATE_ENUM).toBeLessThan(PRIORITY.CREATE_TABLE);
    expect(PRIORITY.CREATE_TABLE).toBeLessThan(PRIORITY.ADD_COLUMN);
    expect(PRIORITY.ADD_COLUMN).toBeLessThan(PRIORITY.ADD_INDEX);
    expect(PRIORITY.ADD_INDEX).toBeLessThan(PRIORITY.ADD_FOREIGN_KEY);
  });

  it("performs all create/alter operations before any drop operation", () => {
    const createsAndAlters = [
      PRIORITY.CREATE_ENUM,
      PRIORITY.CREATE_TABLE,
      PRIORITY.ADD_COLUMN,
      PRIORITY.ADD_INDEX,
      PRIORITY.ADD_FOREIGN_KEY,
      PRIORITY.ALTER_ENUM,
      PRIORITY.ALTER_COLUMN,
      PRIORITY.RENAME_COLUMN,
      PRIORITY.RENAME_TABLE,
    ];
    const drops = [
      PRIORITY.DROP_FOREIGN_KEY,
      PRIORITY.DROP_INDEX,
      PRIORITY.DROP_COLUMN,
      PRIORITY.DROP_TABLE,
      PRIORITY.DROP_ENUM,
    ];
    expect(Math.max(...createsAndAlters)).toBeLessThan(Math.min(...drops));
  });

  it("drops foreign keys and indexes before the columns/tables they depend on", () => {
    // FK depends on column -> drop FK first
    expect(PRIORITY.DROP_FOREIGN_KEY).toBeLessThan(PRIORITY.DROP_COLUMN);
    // index depends on column -> drop index first
    expect(PRIORITY.DROP_INDEX).toBeLessThan(PRIORITY.DROP_COLUMN);
    // column belongs to table -> drop column before table
    expect(PRIORITY.DROP_COLUMN).toBeLessThan(PRIORITY.DROP_TABLE);
    // enum may be used by a table -> drop table before enum
    expect(PRIORITY.DROP_TABLE).toBeLessThan(PRIORITY.DROP_ENUM);
  });

  it("assigns a unique priority to every operation", () => {
    const values = Object.values(PRIORITY);
    expect(new Set(values).size).toBe(values.length);
  });
});
