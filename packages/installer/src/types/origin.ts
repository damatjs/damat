export type OriginRequest =
  | { type: "local"; path: string }
  | { type: "git"; url: string; ref?: string; subdir?: string }
  | { type: "registry"; ref: string }
  | { type: "npm"; name: string; version?: string; registryUrl?: string }
  | { type: "tarball"; url: string; integrity?: string };
