import type {
  PipelineChildNode,
  PipelineControlNode,
  PipelineDelayNode,
  PipelineEventNode,
  PipelineSignalNode,
  PipelineTaskNode,
} from "./nodes";
import type { PipelineForEachNode, PipelineLoopNode } from "./compound";
import type { PipelineExpression, PipelineValue } from "./value";

export type PipelineNode =
  | PipelineTaskNode
  | PipelineEventNode
  | PipelineSignalNode
  | PipelineDelayNode
  | PipelineControlNode
  | PipelineChildNode
  | PipelineForEachNode
  | PipelineLoopNode;

export interface PipelineEdge {
  from: string;
  to: string;
  on?: "success" | "failure" | "always";
  when?: PipelineExpression;
  input?: PipelineValue;
  label?: string;
}

export type PipelineTrigger =
  | {
      id: string;
      kind: "interval";
      everyMs: number;
      enabled?: boolean;
      input?: PipelineValue;
    }
  | {
      id: string;
      kind: "cron";
      expression: string;
      enabled?: boolean;
      input?: PipelineValue;
    }
  | {
      id: string;
      kind: "event";
      event: string;
      enabled?: boolean;
      input?: PipelineValue;
    };

export interface PipelineManifest {
  start: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  triggers?: PipelineTrigger[];
  inputSchema?: Record<string, unknown>;
  output?: PipelineValue;
  outputSchema?: Record<string, unknown>;
  inspection?: { visibility: "metadata" | "full" | "hidden" };
  retentionMs?: number | "forever";
}
