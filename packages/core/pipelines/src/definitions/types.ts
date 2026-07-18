import type { PipelineManifest } from "./manifest";

export interface PipelineMap {}
export type PipelineName = (keyof PipelineMap & string) | (string & {});
export type PipelineInput<K extends string> = K extends keyof PipelineMap
  ? PipelineMap[K] extends { input: infer I }
    ? I
    : unknown
  : unknown;
export type PipelineOutput<K extends string> = K extends keyof PipelineMap
  ? PipelineMap[K] extends { output: infer O }
    ? O
    : unknown
  : unknown;

export interface PipelineDefinition {
  name: string;
  version: string;
  manifest: PipelineManifest;
  checksum: string;
  source: "code" | "web";
}

export interface DefinePipelineOptions extends PipelineManifest {
  version: string | number;
}
