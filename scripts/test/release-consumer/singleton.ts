import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runProcess } from "./process";

const source = `
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const root = createRequire(import.meta.url);
const cli = createRequire(root.resolve("@damatjs/cli-module"));
const first = realpathSync(root.resolve("@damatjs/framework"));
const second = realpathSync(cli.resolve("@damatjs/framework"));
if (first !== second) throw new Error(\`duplicate framework: \${first} != \${second}\`);
const rootFramework = await import(pathToFileURL(first).href);
const cliFramework = await import(pathToFileURL(second).href);
const service = { source: "packed-consumer" };
rootFramework.registerModule("audit", { service, init() { return service; } });
if (cliFramework.getModule("audit") !== service)
  throw new Error("module registry singleton is not shared");
rootFramework.clearModules();
`;

export async function verifyPackedSingleton(root: string): Promise<void> {
  const script = join(root, "singleton-check.ts");
  writeFileSync(script, source);
  const result = await runProcess([process.execPath, script], root);
  if (result.code !== 0) throw new Error(result.output);
}
