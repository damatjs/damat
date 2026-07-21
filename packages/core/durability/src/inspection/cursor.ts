import {
  signCursorPayload,
  type CursorSigningKey,
  verifyCursorSignature,
} from "./cursorSigning";
import { validateCursorPosition } from "./cursorValidation";
import type { CursorPosition } from "./types";

interface CursorData {
  v: number;
  t: string;
  i: string;
}

function parseCursor(cursor: string, key: CursorSigningKey): CursorData {
  const parts = cursor.split(".");
  if (parts.length !== 2) throw new Error("Invalid cursor");
  const [payload, signature] = parts as [string, string];
  verifyCursorSignature(payload, signature, key);
  try {
    const text = Buffer.from(payload, "base64url").toString();
    const value = JSON.parse(text) as CursorData;
    const canonical = Buffer.from(JSON.stringify(value)).toString("base64url");
    if (canonical !== payload) throw new Error();
    return value;
  } catch {
    throw new Error("Invalid cursor");
  }
}

export function encodeCursor(
  position: CursorPosition,
  key: CursorSigningKey,
): string {
  validateCursorPosition(position);
  const data: CursorData = { v: 1, t: position.sortTimestamp, i: position.id };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${signCursorPayload(payload, key)}`;
}

export function decodeCursor(
  cursor: string,
  key: CursorSigningKey,
): CursorPosition {
  const data = parseCursor(cursor, key);
  if (data.v !== 1) throw new Error("Unsupported cursor version");
  const position = { sortTimestamp: data.t, id: data.i };
  validateCursorPosition(position);
  return position;
}

export function compareCursorPositions(
  left: CursorPosition,
  right: CursorPosition,
): number {
  const time = Date.parse(left.sortTimestamp) - Date.parse(right.sortTimestamp);
  return time || left.id.localeCompare(right.id);
}
