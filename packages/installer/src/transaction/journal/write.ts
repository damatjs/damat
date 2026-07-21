import { appendFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { clearTransactionMarker, createTransactionMarker } from "../marker";
import { journalPath, transactionPath } from "../path";
import type { JournalEntry, JournalWriter } from "../types";

export function createJournal(projectDir: string, id: string): JournalWriter {
  createTransactionMarker(projectDir, id);
  const directory = transactionPath(projectDir, id);
  mkdirSync(directory, { recursive: false });
  const path = journalPath(projectDir, id);
  writeFileSync(path, "", { flag: "wx" });
  return {
    append(entry: JournalEntry) {
      appendFileSync(path, `${JSON.stringify(entry)}\n`, { flush: true });
    },
    complete() {
      rmSync(directory, { recursive: true, force: true });
      clearTransactionMarker(projectDir, id);
    },
  };
}
