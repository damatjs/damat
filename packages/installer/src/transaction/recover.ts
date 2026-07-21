import type { InstallerRuntime } from "../types/runtime";
import { rollbackJournal } from "./journal";
import { readTransactionMarker } from "./marker";

export interface RecoveryResult {
  recovered: boolean;
  transactionId?: string;
  nodeModules: "unchanged" | "best-effort";
}

export async function recoverTransaction(
  projectDir: string,
  runtime: InstallerRuntime,
): Promise<RecoveryResult> {
  const marker = readTransactionMarker(projectDir);
  if (!marker) return { recovered: false, nodeModules: "unchanged" };
  rollbackJournal(projectDir, marker.id);
  runtime.logger.warn(
    `Recovered transaction ${marker.id}; node_modules reconciliation is best-effort.`,
  );
  return {
    recovered: true,
    transactionId: marker.id,
    nodeModules: "best-effort",
  };
}
