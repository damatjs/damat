import { Writable } from "node:stream";
import { createInterface } from "node:readline/promises";
import type { DatabasePrompt, DatabasePromptIo } from "./types";

async function question(
  io: DatabasePromptIo,
  label: string,
  defaultValue: string | undefined,
  hidden: boolean,
): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  if (hidden) io.output.write(`${label}${suffix}: `);
  const muted = new Writable({ write: (_chunk, _encoding, done) => done() });
  const readline = createInterface({
    input: io.input,
    output: hidden ? muted : io.output,
    terminal: Boolean(io.input.isTTY),
  });
  try {
    const answer = await readline.question(hidden ? "" : `${label}${suffix}: `);
    if (hidden) io.output.write("\n");
    return answer.trim() || defaultValue || "";
  } finally {
    readline.close();
  }
}

export function createDatabasePrompt(
  io: DatabasePromptIo = { input: process.stdin, output: process.stdout },
): DatabasePrompt {
  return {
    text: (label, defaultValue) => question(io, label, defaultValue, false),
    secret: (label) => question(io, label, undefined, true),
  };
}
