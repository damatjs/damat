import type { PipelineExpression, PipelineValue } from "./value";

export interface PipelineNodeBase {
  id: string;
  name?: string;
  input?: PipelineValue;
  failure?: "fail" | "continue" | "compensate";
  compensateWith?: PipelineTaskReference;
  retry?: {
    maxAttempts?: number;
    backoffMs?: number;
    backoffMultiplier?: number;
  };
}

export type PipelineTaskReference = {
  kind: "action" | "job" | "workflow";
  name: string;
  input?: PipelineValue;
};

export type PipelineTaskNode = PipelineNodeBase & PipelineTaskReference;
export type PipelineEventNode = PipelineNodeBase & {
  kind: "event.publish" | "event.wait";
  event: string;
  correlation?: PipelineValue;
};
export type PipelineSignalNode = PipelineNodeBase & {
  kind: "signal.wait";
  signal: string;
};
export type PipelineDelayNode = PipelineNodeBase & {
  kind: "delay";
  delayMs: number;
};
export type PipelineControlNode = PipelineNodeBase & {
  kind: "condition" | "fork" | "join";
  expression?: PipelineExpression;
  join?: "all" | "any";
};
export type PipelineChildNode = PipelineNodeBase & {
  kind: "child";
  pipeline: string;
  versionId?: string;
};
