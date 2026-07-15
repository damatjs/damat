import type { ConfigLoader } from "../types";
import { loadConfig } from "./load";

export function withConfig<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  configLoader: ConfigLoader | undefined,
  cwd: string,
): {
  get: () => Promise<T | null>;
  clear: () => void;
} {
  let loaded = false;
  let cached: T | null = null;

  return {
    get: async () => {
      if (!loaded) {
        cached = await loadConfig<T>(configLoader, cwd);
        loaded = true;
      }
      return cached;
    },
    clear: () => {
      loaded = false;
      cached = null;
    },
  };
}
