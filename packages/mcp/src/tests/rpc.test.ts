import { afterEach, describe, expect, test } from "bun:test";

import { reply, replyError, send } from "../server/rpc";

const realWrite = process.stdout.write.bind(process.stdout);

/** Capture everything written to stdout while `fn` runs, restoring after. */
function captureStdout(fn: () => void): string[] {
  const lines: string[] = [];
  (process.stdout as any).write = (chunk: string) => {
    lines.push(String(chunk));
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = realWrite;
  }
  return lines;
}

afterEach(() => {
  process.stdout.write = realWrite;
});

describe("send", () => {
  test("writes a single newline-terminated JSON object", () => {
    const out = captureStdout(() => send({ jsonrpc: "2.0", id: 1 }));
    expect(out).toHaveLength(1);
    expect(out[0]).toBe('{"jsonrpc":"2.0","id":1}\n');
  });
});

describe("reply", () => {
  test("frames a JSON-RPC 2.0 success response", () => {
    const out = captureStdout(() => reply(7, { hello: "world" }));
    expect(JSON.parse(out[0])).toEqual({
      jsonrpc: "2.0",
      id: 7,
      result: { hello: "world" },
    });
  });

  test("preserves a string id", () => {
    const out = captureStdout(() => reply("abc", {}));
    expect(JSON.parse(out[0]).id).toBe("abc");
  });

  test("preserves a null id", () => {
    const out = captureStdout(() => reply(null, { ok: true }));
    expect(JSON.parse(out[0]).id).toBeNull();
  });
});

describe("replyError", () => {
  test("frames a JSON-RPC 2.0 error response", () => {
    const out = captureStdout(() => replyError(3, -32601, "Method not found"));
    expect(JSON.parse(out[0])).toEqual({
      jsonrpc: "2.0",
      id: 3,
      error: { code: -32601, message: "Method not found" },
    });
  });
});
