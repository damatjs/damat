import { join } from "node:path";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
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
