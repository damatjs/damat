import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { moduleAddCommand } from "../../commands/module";

const source = mkdtempSync(join(tmpdir(), "module-source-"));
const project = mkdtempSync(join(tmpdir(), "module-target-"));
mkdirSync(join(source, "src"));
writeFileSync(join(source, "src/index.ts"), "export default {};");
writeFileSync(join(source, "damat.json"), JSON.stringify({
  schemaVersion: 1, kind: "module", name: "billing",
  install: {
    provides: { module: { from: "src/**", fallbackTo: "src/modules/{id}" } },
    instructions: { add: ["Add billing to damat.config.ts"] },
  },
  module: { entry: "./src/index.ts" },
}));
const shared = [
  "damat.config.ts", "tsconfig.json", ".env", ".env.example",
  "src/api/routes/index.ts", "src/workflows/index.ts",
];
shared.forEach((path) => {
  mkdirSync(join(project, path, ".."), { recursive: true });
  writeFileSync(join(project, path), `user-owned:${path}\n`);
});
const before = Object.fromEntries(
  shared.map((path) => [path, readFileSync(join(project, path), "utf8")]),
);
const messages: string[] = [];
const logger = {
  debug() {}, success() {}, skip() {},
  warn(message: string) { messages.push(message); },
  error(message: string) { messages.push(message); },
  info(message: string) { messages.push(message); },
};
const result = await moduleAddCommand.handler({
  command: "module add", args: [source], options: {}, logger, cwd: project,
});
if (result.exitCode !== 0) throw new Error(messages.join("\n"));
const preserved = shared.every(
  (path) => readFileSync(join(project, path), "utf8") === before[path],
);
const installed = existsSync(join(project, "src/modules/billing/index.ts"));
const notice = messages.join(" ").includes("damat.config.ts");
postMessage({ preserved, installed, notice });
