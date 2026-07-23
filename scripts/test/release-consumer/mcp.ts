import { writeFileSync } from "node:fs";
import { join } from "node:path";
export async function verifyPackedMcp(root: string): Promise<void> {
  const registry = join(root, "registry.json");
  writeFileSync(
    registry,
    JSON.stringify({
      modules: {
        "damatjs/invoice": {
          name: "invoice",
          source: "npm:@damatjs/invoice",
        },
      },
    }),
  );
  const entry = join(root, "node_modules/@damatjs/mcp/bin/damat-mcp.ts");
  const request = JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "module_info", arguments: { ref: "invoice" } },
  });
  const child = Bun.spawn([process.execPath, entry], {
    cwd: root,
    env: {
      ...process.env,
      DAMAT_MODULE_REGISTRY: registry,
    },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  child.stdin.write(`${request}\n`);
  await child.stdin.flush();
  child.stdin.end();
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  const output = `${stdout}${stderr}`;
  if (code !== 0) throw new Error(output);
  if (!output.includes("damatjs/invoice"))
    throw new Error(`packed MCP did not resolve bare ref:\n${output}`);
}
