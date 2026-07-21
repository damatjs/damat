import type { DamatManifest } from "../types";

export interface ProfileOverrides {
  targets?: Record<string, string>;
}

export interface CapabilityMatch {
  capability: string;
  from: string;
  to: string;
  source: "override" | "receiver" | "fallback";
}

export interface MatchProfilesInput {
  provider: DamatManifest;
  receiver?: DamatManifest;
  overrides?: ProfileOverrides;
}
