import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { gunzipSync } from "node:zlib";
import { isZeroHeader, parseTarHeader } from "./header";
import { safeArchivePath } from "./safety";

function uncompressed(bytes: Uint8Array): Uint8Array {
  return bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes;
}

export function extractTar(bytes: Uint8Array, rootDir: string): void {
  const archive = uncompressed(bytes);
  let offset = 0;
  let ended = false;
  while (offset < archive.length) {
    if (offset + 512 > archive.length) throw new Error("truncated tar header");
    const block = archive.subarray(offset, offset + 512);
    offset += 512;
    if (isZeroHeader(block)) {
      ended = true;
      break;
    }
    const header = parseTarHeader(block);
    const target = safeArchivePath(rootDir, header.name);
    if (header.type === "5") mkdirSync(target, { recursive: true });
    else if (header.type === "0" || header.type === "\0") {
      if (offset + header.size > archive.length)
        throw new Error(`truncated tar entry: ${header.name}`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, archive.subarray(offset, offset + header.size), {
        flag: "wx",
      });
    } else
      throw new Error(
        `unsupported tar entry type ${header.type} for ${header.name}`,
      );
    offset += Math.ceil(header.size / 512) * 512;
  }
  if (!ended) throw new Error("truncated tar archive");
}
