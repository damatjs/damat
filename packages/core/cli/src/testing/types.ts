import type { CliRunResult, CliRuntime } from "../types";

export type CapabilityTestLogLevel =
  "debug" | "info" | "success" | "skip" | "warn" | "error";

export interface CapabilityTestLog {
  level: CapabilityTestLogLevel;
  message: string;
}

export interface CapabilityTestRuntime {
  runtime: CliRuntime;
  output: string[];
  logs: CapabilityTestLog[];
}

export interface CapabilityTestRun extends CapabilityTestRuntime {
  result: CliRunResult;
}
