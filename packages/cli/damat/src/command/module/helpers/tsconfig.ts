import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Add an installed module's portable aliases to the host backend's
 * `tsconfig.json` so the module's `@<id>/...` (types/service/lib/config/models,
 * now under `src/modules/<id>/`) and the shared `@workflows/...` imports resolve.
 *
 * Idempotent. Returns `"updated"` if entries were written, `"present"` if they
 * already existed, or `"skipped"` if the file is missing or not plain JSON (a
 * tsconfig with comments is left for the user to edit by hand).
 */
export function registerModuleTsconfigPaths(
  cwd: string,
  moduleId: string,
): "updated" | "present" | "skipped" {
  const tsconfigPath = join(cwd, "tsconfig.json");
  if (!existsSync(tsconfigPath)) return "skipped";

  let json: {
    compilerOptions?: {
      baseUrl?: string;
      paths?: Record<string, string[]>;
    };
  };
  try {
    json = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
  } catch {
    return "skipped"; // jsonc / comments — don't risk mangling it
  }

  const compilerOptions = (json.compilerOptions ??= {});
  if (compilerOptions.baseUrl == null) compilerOptions.baseUrl = ".";
  const paths = (compilerOptions.paths ??= {});

  const entries: Array<[string, string[]]> = [
    [`@${moduleId}/*`, [`./src/modules/${moduleId}/*`]],
    ["@workflows/*", ["./src/workflows/*"]],
  ];

  let changed = false;
  for (const [key, target] of entries) {
    if (!paths[key]) {
      paths[key] = target;
      changed = true;
    }
  }
  if (!changed) return "present";

  writeFileSync(tsconfigPath, `${JSON.stringify(json, null, 2)}\n`, "utf-8");
  return "updated";
}
