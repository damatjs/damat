import { isAbsolute, join } from "node:path";
import { existsSync } from "node:fs";

export function configFile(configPath: string, cwd: string): string {
  const filePath = isAbsolute(configPath) ? configPath : join(cwd, configPath);
  if (!existsSync(filePath))
    throw new Error(`Config file not found: ${filePath}`);
  return filePath;
}

export function wrapLoadError(error: unknown, message: string): never {
  if (
    error instanceof Error &&
    error.message.startsWith("Config file not found")
  )
    throw error;
  const wrapped = new Error(message);
  (wrapped as Error & { cause?: unknown }).cause = error;
  throw wrapped;
}
