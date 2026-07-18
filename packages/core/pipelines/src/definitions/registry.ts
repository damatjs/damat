import { pipelineChecksum } from "./stable";
import type {
  DefinePipelineOptions,
  PipelineDefinition,
  PipelineName,
} from "./types";
import { validatePipelineManifest } from "./validate";

const KEY = Symbol.for("damatjs.pipelines.definitions");
type Storage = typeof globalThis & { [KEY]?: Map<string, PipelineDefinition> };
const registry = () => {
  const storage = globalThis as Storage;
  storage[KEY] ??= new Map();
  return storage[KEY];
};

export function definePipeline(
  name: PipelineName,
  options: DefinePipelineOptions,
): PipelineDefinition {
  if (!name.trim()) throw new Error("Pipeline name is required");
  if (registry().has(name))
    throw new Error(`Pipeline "${name}" is already defined`);
  const { version, ...manifest } = options;
  validatePipelineManifest(manifest);
  const definition: PipelineDefinition = {
    name,
    version: String(version),
    manifest,
    checksum: pipelineChecksum(manifest),
    source: "code",
  };
  registry().set(name, definition);
  return definition;
}

export const getPipelineDefinition = (name: string) => registry().get(name);
export const getAllPipelineDefinitions = () => [...registry().values()];
export const clearPipelineDefinitions = () => registry().clear();
