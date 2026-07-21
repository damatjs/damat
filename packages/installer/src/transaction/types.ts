export type JournalEntry =
  | { inverse: "delete-file"; path: string }
  | { inverse: "restore-file"; path: string; content: string };

export interface TransactionMarker {
  id: string;
  startedAt: string;
}

export interface JournalWriter {
  append(entry: JournalEntry): void;
  complete(): void;
}
