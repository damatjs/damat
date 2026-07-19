import { readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

let importCounter = 0;
const temporaryDirectory = realpathSync(tmpdir());
const loadedConfigs = new Map<
  string,
  { source: string; module: Promise<any> }
>();

async function bundleConfig(filePath: string): Promise<string> {
  const result = await Bun.build({
    entrypoints: [filePath],
    target: "bun",
    format: "esm",
  });
  const output = result.outputs[0];
  if (!output) throw new Error(`Config bundle produced no output: ${filePath}`);
  return await output.text();
}

async function importBundledConfig(filePath: string): Promise<any> {
  const sidecar = join(
    temporaryDirectory,
    `.damat-config-${process.pid}-${importCounter++}.mjs`,
  );
  try {
    writeFileSync(sidecar, await bundleConfig(filePath));
    return await import(pathToFileURL(sidecar).href);
  } finally {
    rmSync(sidecar, { force: true });
  }
}

export async function loadConfigModule(filePath: string): Promise<any> {
  const source = readFileSync(filePath, "utf8");
  const cached = loadedConfigs.get(filePath);
  if (cached?.source === source) return cached.module;
  const module = importBundledConfig(filePath);
  loadedConfigs.set(filePath, { source, module });
  try {
    return await module;
  } catch (error) {
    if (loadedConfigs.get(filePath)?.module === module)
      loadedConfigs.delete(filePath);
    throw error;
  }
}
