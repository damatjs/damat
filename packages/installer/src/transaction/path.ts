import { join } from "node:path";

export function transactionsPath(projectDir: string): string {
  return join(projectDir, ".damat", "transactions");
}

export function transactionPath(projectDir: string, id: string): string {
  return join(transactionsPath(projectDir), id);
}

export function journalPath(projectDir: string, id: string): string {
  return join(transactionPath(projectDir, id), "journal.jsonl");
}

export function markerPath(projectDir: string): string {
  return join(transactionsPath(projectDir), "active.json");
}
