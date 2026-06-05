import path from "node:path";
import fs from "node:fs";

/**
 * Load module configs from a damat.config.ts file.
 *
 * Reads the `modules` array from the config and converts it to a
 * `Record<id, { resolve: string }>` map where `resolve` is always an
 * absolute path resolved relative to the config file's directory.
 *
 * @param configPath - Absolute path to the config file, OR a filename/relative
 *                     path that will be joined with `cwd`.
 * @param cwd        - Working directory used when `configPath` is relative.
 *                     Defaults to `process.cwd()`.
 */
export async function loadModules<T = Record<string, { resolve: string }>>(
  configPath: string,
  cwd: string = process.cwd(),
): Promise<T> {
  const filePath = path.isAbsolute(configPath)
    ? configPath
    : path.join(cwd, configPath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }

  // The directory that contains damat.config.ts — used to resolve relative
  // module paths like "./src/modules/user".
  const configDir = path.dirname(filePath);

  try {
    // Bust the module cache on every load so the CLI always reads the latest
    // version of the config file.
    const fileUrl = `file://${filePath}?t=${Date.now()}`;
    const mod = await import(fileUrl);
    const config = mod.default ?? mod;

    const modules: Record<string, { resolve: string }> = {};

    for (const module of config.modules ?? []) {
      const id: string = module.id ?? path.basename(module.resolve);
      const resolvedPath = path.isAbsolute(module.resolve)
        ? module.resolve
        : path.resolve(configDir, module.resolve);

      modules[id] = { resolve: resolvedPath };
    }

    return modules as T;
  } catch (error) {
    // Re-throw our own "not found" errors untouched.
    if (
      error instanceof Error &&
      error.message.startsWith("Config file not found")
    ) {
      throw error;
    }
    throw new Error(
      `Failed to load config from '${filePath}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
