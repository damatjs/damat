import { expect, test } from "bun:test";
import { resolve } from "node:path";

async function readLine(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  let output = "";
  while (!output.includes("\n")) {
    const next = await reader.read();
    if (next.done) break;
    output += new TextDecoder().decode(next.value);
  }
  reader.releaseLock();
  return output.trim();
}

test("damat-mcp executable serves JSON-RPC over stdio", async () => {
  const child = Bun.spawn(
    [process.execPath, resolve(import.meta.dir, "../../bin/damat-mcp.ts")],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", id: 7, method: "initialize" }) + "\n",
  );
  await child.stdin.flush();
  const output = await Promise.race([
    readLine(child.stdout),
    Bun.sleep(2_000).then(() => ""),
  ]);
  child.stdin.end();
  expect(await child.exited).toBe(0);
  const response = JSON.parse(output);
  expect(response.id).toBe(7);
  expect(response.result.serverInfo.name).toBe("damat-mcp");
});
