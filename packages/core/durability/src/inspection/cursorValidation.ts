import type { CursorPosition } from "./types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function validateCursorPosition(position: CursorPosition): void {
  const date = new Date(position.sortTimestamp);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString() !== position.sortTimestamp
  ) {
    throw new Error("Cursor requires a canonical ISO timestamp");
  }
  if (!UUID.test(position.id)) {
    throw new Error("Cursor requires a canonical UUID");
  }
}
