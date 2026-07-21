import type { PipelineNodeBase } from "./nodes";
import type { PipelineExpression, PipelineValue } from "./value";

export type PipelineForEachNode = PipelineNodeBase & {
  kind: "foreach";
  pipeline: string;
  items: PipelineValue;
  maxItems: number;
  concurrency?: number;
};

export type PipelineLoopNode = PipelineNodeBase & {
  kind: "loop";
  pipeline: string;
  until: PipelineExpression;
  maxIterations: number;
};
