export interface PlannedFile {
  source: string;
  target: string;
  via: "mapping" | "fallback";
}

export interface KitPlan {
  files: PlannedFile[];
  unmatched: string[];
}
