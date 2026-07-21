export interface UsageMatch {
  token: string;
  path: string;
  line: number;
  column: number;
}

export interface UsageReport {
  matches: UsageMatch[];
  warning: string;
}
