import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assertSafeRelativePath } from "../../schema/path";
import type { JournalEntry } from "../types";

export function captureInverse(projectDir: string, path: string): JournalEntry {
  assertSafeRelativePath(path, "journal path");
  const absolute = join(projectDir, path);
  if (!existsSync(absolute)) return { inverse: "delete-file", path };
  return {
    inverse: "restore-file",
    path,
    content: readFileSync(absolute).toString("base64"),
  };
}
