import { gzipSync } from "node:zlib";

export interface TarEntry {
  name: string;
  body?: string;
  type?: "0" | "5" | "2" | "3";
  link?: string;
}

function octal(value: number, width: number): string {
  return value.toString(8).padStart(width - 1, "0") + "\0";
}

function header(entry: TarEntry, size: number): Buffer {
  const value = Buffer.alloc(512);
  value.write(entry.name, 0, 100, "utf8");
  value.write(octal(entry.type === "5" ? 0o755 : 0o644, 8), 100, 8, "ascii");
  value.write(octal(0, 8), 108, 8, "ascii");
  value.write(octal(0, 8), 116, 8, "ascii");
  value.write(octal(size, 12), 124, 12, "ascii");
  value.write(octal(0, 12), 136, 12, "ascii");
  value.fill(32, 148, 156);
  value.write(entry.type ?? "0", 156, 1, "ascii");
  if (entry.link) value.write(entry.link, 157, 100, "utf8");
  value.write("ustar\0", 257, 6, "ascii");
  const sum = value.reduce((total, byte) => total + byte, 0);
  value.write(octal(sum, 8), 148, 8, "ascii");
  return value;
}

export function tar(entries: TarEntry[]): Buffer {
  const parts: Buffer[] = [];
  for (const entry of entries) {
    const body = Buffer.from(entry.body ?? "");
    parts.push(header(entry, body.length), body);
    const padding = (512 - (body.length % 512)) % 512;
    if (padding) parts.push(Buffer.alloc(padding));
  }
  return Buffer.concat([...parts, Buffer.alloc(1024)]);
}

export function tgz(entries: TarEntry[]): Buffer {
  return gzipSync(tar(entries));
}
