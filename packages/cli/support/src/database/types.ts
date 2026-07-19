import type { Readable, Writable } from "node:stream";

export interface DatabasePrompt {
  text(label: string, defaultValue?: string): Promise<string>;
  secret(label: string): Promise<string>;
}

export interface DatabasePromptIo {
  input: Readable & { isTTY?: boolean };
  output: Writable;
}

export interface DatabaseSelection {
  url: string;
  setup: boolean;
}

export interface DatabaseFields {
  host?: string | undefined;
  port?: number | string | undefined;
  user?: string | undefined;
  password?: string | undefined;
  database?: string | undefined;
}
