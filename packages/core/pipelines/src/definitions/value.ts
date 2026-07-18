export type PipelineScalar = string | number | boolean | null;

export interface PipelineReference {
  $ref: string;
}

export type PipelineValue =
  | PipelineScalar
  | PipelineReference
  | PipelineValue[]
  | { [key: string]: PipelineValue };

export type PipelineExpression =
  | { op: "exists"; value: PipelineValue }
  | { op: "not"; value: PipelineExpression }
  | { op: "and" | "or"; values: PipelineExpression[] }
  | {
      op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
      left: PipelineValue;
      right: PipelineValue;
    };
