import { readFileSync } from "node:fs";
import { hashBytes } from "./bytes";

export function hashFile(path: string): string {
  return hashBytes(readFileSync(path));
}
