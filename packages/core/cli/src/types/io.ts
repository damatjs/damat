export type CliLogContext = Record<string, unknown>;

export interface CliLogger {
  debug(message: string, context?: CliLogContext): void;
  info(message: string, context?: CliLogContext): void;
  success(message: string, context?: CliLogContext): void;
  skip(message: string, context?: CliLogContext): void;
  warn(message: string, context?: CliLogContext): void;
  error(message: string, error?: unknown, context?: CliLogContext): void;
}

export interface CliOutput {
  write(message?: string): void;
}
