import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { clearTransactionMarker } from "../marker";
import { transactionPath } from "../path";
import { readJournal } from "./read";

export function rollbackJournal(projectDir: string, id: string): void {
  for (const entry of readJournal(projectDir, id).reverse()) {
    const target = join(projectDir, entry.path);
    if (entry.inverse === "delete-file") rmSync(target, { force: true });
    else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(entry.content, "base64"));
    }
  }
  rmSync(transactionPath(projectDir, id), { recursive: true, force: true });
  clearTransactionMarker(projectDir, id);
}
