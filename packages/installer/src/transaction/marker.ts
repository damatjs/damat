import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import type { TransactionMarker } from "./types";
import { markerPath, transactionsPath } from "./path";

export function readTransactionMarker(
  projectDir: string,
): TransactionMarker | undefined {
  const path = markerPath(projectDir);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as TransactionMarker;
}

export function createTransactionMarker(
  projectDir: string,
  id: string,
): TransactionMarker {
  mkdirSync(transactionsPath(projectDir), { recursive: true });
  const marker = { id, startedAt: new Date().toISOString() };
  try {
    writeFileSync(markerPath(projectDir), `${JSON.stringify(marker)}\n`, {
      flag: "wx",
    });
  } catch (error) {
    if (existsSync(markerPath(projectDir)))
      throw new Error(
        `active transaction requires recovery: ${readTransactionMarker(projectDir)?.id}`,
      );
    throw error;
  }
  return marker;
}

export function clearTransactionMarker(projectDir: string, id: string): void {
  const marker = readTransactionMarker(projectDir);
  if (marker && marker.id !== id)
    throw new Error(`cannot clear active transaction ${marker.id}`);
  rmSync(markerPath(projectDir), { force: true });
}
