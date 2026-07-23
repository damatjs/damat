import { afterEach, beforeEach } from "bun:test";
import { Colorizer } from "../colorizer";

const ENV_KEYS = ["NO_COLOR", "FORCE_COLOR", "TERM"] as const;

export function useColorizerEnvironment(): void {
  let savedEnv: Record<string, string | undefined>;
  beforeEach(() => {
    savedEnv = {};
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
    for (const key of ENV_KEYS) delete process.env[key];
  });
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });
}

export function colorOn(): Colorizer {
  process.env.FORCE_COLOR = "1";
  return new Colorizer(true);
}

export function colorOff(): Colorizer {
  process.env.FORCE_COLOR = "1";
  return new Colorizer(false);
}
