import { existsSync, readFileSync } from "node:fs";
import type { JournalEntry } from "../types";
import { journalPath } from "../path";

export function readJournal(projectDir: string, id: string): JournalEntry[] {
  const path = journalPath(projectDir, id);
  if (!existsSync(path))
    throw new Error(`transaction journal not found: ${id}`);
  const content = readFileSync(path, "utf8").trim();
  return content
    ? content.split("\n").map((line) => JSON.parse(line) as JournalEntry)
    : [];
}
