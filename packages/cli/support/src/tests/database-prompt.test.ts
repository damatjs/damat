import { describe, expect, test } from "bun:test";
import { Readable, Writable } from "node:stream";
import { createDatabasePrompt } from "../database";

function io(answer: string, tty = false) {
  let output = "";
  const input = Readable.from([`${answer}\n`]) as Readable & {
    isTTY?: boolean;
  };
  input.isTTY = tty;
  const sink = new Writable({
    write(chunk, _encoding, done) {
      output += chunk.toString();
      done();
    },
  });
  return { input, output: sink, read: () => output };
}

describe("terminal database prompt", () => {
  test("reads visible text and applies a default to blank input", async () => {
    const entered = io("db.internal");
    expect(await createDatabasePrompt(entered).text("Host", "localhost")).toBe(
      "db.internal",
    );
    expect(entered.read()).toContain("Host (localhost):");
    const blank = io("");
    expect(await createDatabasePrompt(blank).text("Host", "localhost")).toBe(
      "localhost",
    );
  });

  test("reads secrets without echoing their value", async () => {
    const secret = io("do-not-echo", true);
    expect(await createDatabasePrompt(secret).secret("Password")).toBe(
      "do-not-echo",
    );
    expect(secret.read()).toBe("Password: \n");
    const blank = io("");
    expect(await createDatabasePrompt(blank).secret("Password")).toBe("");
  });
});
