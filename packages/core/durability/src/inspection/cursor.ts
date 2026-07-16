import type { CursorPosition } from "./types";

interface CursorData {
  v: number;
  t: string;
  i: string;
  c: string;
}

function parseCursor(cursor: string): CursorData {
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString());
    if (!value || typeof value !== "object") throw new Error();
    return value as CursorData;
  } catch {
    throw new Error("Invalid cursor");
  }
}

export function encodeCursor(position: CursorPosition): string {
  const data: CursorData = {
    v: 1,
    t: position.sortTimestamp,
    i: position.id,
    c: checksum(position),
  };
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorPosition {
  const data = parseCursor(cursor);
  if (data.v !== 1) throw new Error("Unsupported cursor version");
  if (data.c !== checksum({ sortTimestamp: data.t, id: data.i })) {
    throw new Error("Invalid cursor");
  }
  const canonical = encodeCursor({ sortTimestamp: data.t, id: data.i });
  if (canonical !== cursor) throw new Error("Invalid cursor");
  if (Number.isNaN(Date.parse(data.t)) || !/^[0-9a-f-]{36}$/i.test(data.i)) {
    throw new Error("Invalid cursor");
  }
  return { sortTimestamp: data.t, id: data.i };
}

function checksum(position: CursorPosition): string {
  let hash = 2_166_136_261;
  for (const character of `${position.sortTimestamp}\0${position.id}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function compareCursorPositions(
  left: CursorPosition,
  right: CursorPosition,
): number {
  const time = Date.parse(left.sortTimestamp) - Date.parse(right.sortTimestamp);
  return time || left.id.localeCompare(right.id);
}
