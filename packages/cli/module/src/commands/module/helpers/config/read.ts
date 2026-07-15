import { existsSync, readFileSync } from "node:fs";
import type { ModuleSource } from "@damatjs/framework";
import { findModuleEntrySpan } from "./span";

export interface ModuleConfigEntry {
  resolve?: string;
  source?: Partial<ModuleSource>;
}

export function readModuleConfigEntry(
  path: string,
  name: string,
): ModuleConfigEntry | null {
  if (!existsSync(path)) return null;
  const content = readFileSync(path, "utf-8");
  const span = findModuleEntrySpan(content, name);
  if (!span) return null;
  const body = content.slice(span.bodyStart, span.bodyEnd);
  const entry: ModuleConfigEntry = {};
  const resolve = /resolve\s*:\s*["']([^"']*)["']/.exec(body)?.[1];
  if (resolve) entry.resolve = resolve;
  const sourceBody = /source\s*:\s*\{([\s\S]*?)\}/.exec(body)?.[1];
  if (!sourceBody) return entry;
  const source: Record<string, string> = {};
  for (const field of [
    "type",
    "ref",
    "url",
    "version",
    "owner",
    "verification",
    "integrity",
    "installedAt",
  ]) {
    const value = new RegExp(`${field}\\s*:\\s*["']([^"']*)["']`).exec(
      sourceBody,
    )?.[1];
    if (value !== undefined) source[field] = value;
  }
  if (Object.keys(source).length)
    entry.source = source as Partial<ModuleSource>;
  return entry;
}
