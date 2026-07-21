export type WorkflowExecutionEvent =
  | { type: "workflow.started"; workflow: string; executionId: string }
  | {
      type: "workflow.succeeded" | "workflow.failed";
      workflow: string;
      executionId: string;
      durationMs: number;
    }
  | {
      type: "step.started";
      workflow: string;
      executionId: string;
      step: string;
      attempt: number;
    }
  | {
      type: "step.succeeded" | "step.failed";
      workflow: string;
      executionId: string;
      step: string;
      attempt: number;
      durationMs: number;
    }
  | {
      type:
        | "compensation.started"
        | "compensation.succeeded"
        | "compensation.failed";
      workflow: string;
      executionId: string;
      step: string;
    };

export interface WorkflowExecutionObserver {
  onEvent(event: WorkflowExecutionEvent): void | Promise<void>;
}

export interface WorkflowExecutionOptions {
  executionId?: string;
  signal?: AbortSignal;
  observer?: WorkflowExecutionObserver;
}
