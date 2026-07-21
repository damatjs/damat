import type { CliLogger, CliRuntime } from "../types";

export interface RuntimeFixture {
  runtime: CliRuntime;
  messages: string[];
  errors: string[];
  infos: string[];
  debugs: string[];
  successes: string[];
}

export function createRuntimeFixture(args: string[] = []): RuntimeFixture {
  const messages: string[] = [];
  const errors: string[] = [];
  const infos: string[] = [];
  const debugs: string[] = [];
  const successes: string[] = [];
  const logger: CliLogger = {
    debug(message) {
      debugs.push(message);
    },
    info(message) {
      infos.push(message);
    },
    success(message) {
      successes.push(message);
    },
    skip() {},
    warn() {},
    error(message) {
      errors.push(message);
    },
  };

  return {
    runtime: {
      args,
      cwd: "/workspace",
      env: {},
      logger,
      output: { write: (message = "") => messages.push(message) },
    },
    messages,
    errors,
    infos,
    debugs,
    successes,
  };
}
