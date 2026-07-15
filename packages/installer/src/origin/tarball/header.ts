export interface TarHeader {
  name: string;
  size: number;
  type: string;
}

function field(block: Uint8Array, start: number, length: number): string {
  const value = Buffer.from(block.subarray(start, start + length)).toString(
    "utf8",
  );
  const end = value.indexOf("\0");
  return value.slice(0, end < 0 ? undefined : end).trim();
}

export function isZeroHeader(block: Uint8Array): boolean {
  return block.every((byte) => byte === 0);
}

export function parseTarHeader(block: Uint8Array): TarHeader {
  if (block.length !== 512) throw new Error("truncated tar header");
  const name = field(block, 0, 100);
  const prefix = field(block, 345, 155);
  const sizeText = field(block, 124, 12);
  const size = sizeText === "" ? 0 : Number.parseInt(sizeText, 8);
  if (!Number.isSafeInteger(size) || size < 0)
    throw new Error(`invalid tar size for ${name}`);
  const type = String.fromCharCode(block[156] ?? 0);
  return { name: prefix ? `${prefix}/${name}` : name, size, type };
}
