import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captureInverse,
  createJournal,
  readJournal,
  rollbackJournal,
} from "../../index";

describe("lean transaction journals", () => {
  test("records inverse data before mutation and rolls back in reverse", () => {
    const project = mkdtempSync(join(tmpdir(), "installer-journal-"));
    writeFileSync(join(project, "existing.txt"), "before");
    const journal = createJournal(project, "tx-one");
    journal.append(captureInverse(project, "existing.txt"));
    expect(readJournal(project, "tx-one")).toHaveLength(1);
    writeFileSync(join(project, "existing.txt"), "after");
    journal.append(captureInverse(project, "created.txt"));
    writeFileSync(join(project, "created.txt"), "created");
    rollbackJournal(project, "tx-one");
    expect(readFileSync(join(project, "existing.txt"), "utf8")).toBe("before");
    expect(existsSync(join(project, "created.txt"))).toBeFalse();
  });

  test("cleans a successful journal without copying untouched files", () => {
    const project = mkdtempSync(join(tmpdir(), "installer-journal-done-"));
    writeFileSync(join(project, "untouched.txt"), "user");
    const journal = createJournal(project, "tx-two");
    journal.complete();
    expect(readFileSync(join(project, "untouched.txt"), "utf8")).toBe("user");
    expect(() => readJournal(project, "tx-two")).toThrow("not found");
  });
});
