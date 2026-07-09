/** Content shapes for the marketing pages. All copy lives in data files. */

export interface TerminalLine {
  kind: "cmd" | "ok" | "danger" | "muted";
  text: string;
}

export interface PipelineStage {
  label: string;
  caption: string;
  /** The verdict stage renders with the accent treatment. */
  accent?: boolean;
}

export interface VerdictExample {
  pkg: string;
  version: string;
  score: number;
  status: "pass" | "warn" | "blocked";
  headline: string;
  chips: string[];
}
