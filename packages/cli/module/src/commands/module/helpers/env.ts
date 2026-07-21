import { join } from "node:path";
import {
  existsSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import type { ModuleManifest } from "@damatjs/module";
import type { EnvSyncResult } from "./types";

/**
 * Append env vars missing from .env.example (and report which are missing
 * from .env so the user knows what to fill in).
 */
export function syncEnvVars(
  appDir: string,
  manifest: ModuleManifest,
): EnvSyncResult {
  const addedToExample: string[] = [];
  const missingInEnv: string[] = [];
  const envVars = manifest.env ?? [];
  if (envVars.length === 0) return { addedToExample, missingInEnv };

  const examplePath = join(appDir, ".env.example");
  const envPath = join(appDir, ".env");
  const exampleContent = existsSync(examplePath)
    ? readFileSync(examplePath, "utf-8")
    : "";
  const envContent = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";

  const lines: string[] = [];
  for (const envVar of envVars) {
    const definedIn = (content: string) =>
      new RegExp(`^\\s*${envVar.name}\\s*=`, "m").test(content);

    if (!definedIn(exampleContent)) {
      if (envVar.description) lines.push(`# ${envVar.description}`);
      lines.push(`${envVar.name}=${envVar.example ?? ""}`);
      addedToExample.push(envVar.name);
    }
    if ((envVar.required ?? true) && !definedIn(envContent)) {
      missingInEnv.push(envVar.name);
    }
  }

  if (lines.length > 0) {
    const header = `\n# --- module: ${manifest.name} ---\n`;
    appendFileSync(examplePath, header + lines.join("\n") + "\n");
  }

  return { addedToExample, missingInEnv };
}

/**
 * Remove the `# --- module: <name> ---` block syncEnvVars appended to
 * .env.example. Deliberately touches ONLY .env.example — `.env` may hold
 * real secrets and shared values, so it is never edited. Returns the var
 * names that were removed (empty when no block was found).
 */
export function removeModuleEnvVars(
  appDir: string,
  moduleName: string,
): string[] {
  const examplePath = join(appDir, ".env.example");
  if (!existsSync(examplePath)) return [];
  const content = readFileSync(examplePath, "utf-8");

  const header = `# --- module: ${moduleName} ---`;
  const start = content.indexOf(header);
  if (start === -1) return [];

  // The block runs until the next module header or the end of the file.
  const afterHeader = start + header.length;
  const nextHeader = content.indexOf("\n# --- module: ", afterHeader);
  const end = nextHeader === -1 ? content.length : nextHeader;

  const block = content.slice(afterHeader, end);
  const removedVars = [
    ...block.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm),
  ].map((m) => m[1]!);

  // Also drop the blank line the append put before the header.
  const cutStart = content.slice(0, start).endsWith("\n\n") ? start - 1 : start;
  writeFileSync(examplePath, content.slice(0, cutStart) + content.slice(end));
  return removedVars;
}
