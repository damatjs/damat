import { globSource } from "./parse";

export function matchGlob(path: string, pattern: string): boolean {
  return new RegExp(`^${globSource(pattern)}$`).test(path);
}
