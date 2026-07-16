export interface GenerationLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
}

const noop = (): void => {};

export const NOOP_GENERATION_LOGGER: GenerationLogger = {
  debug: noop,
  info: noop,
};

export function generationLogger(logger?: GenerationLogger): GenerationLogger {
  return logger ?? NOOP_GENERATION_LOGGER;
}
