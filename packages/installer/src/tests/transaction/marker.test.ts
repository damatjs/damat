import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clearTransactionMarker,
  createTransactionMarker,
  readTransactionMarker,
} from "../../index";

describe("transaction marker", () => {
  test("is exclusive and makes stale recovery explicit", () => {
    const project = mkdtempSync(join(tmpdir(), "installer-marker-"));
    createTransactionMarker(project, "first");
    expect(readTransactionMarker(project)?.id).toBe("first");
    expect(() => createTransactionMarker(project, "second")).toThrow(
      "active transaction",
    );
    clearTransactionMarker(project, "first");
    expect(readTransactionMarker(project)).toBeUndefined();
  });
});
