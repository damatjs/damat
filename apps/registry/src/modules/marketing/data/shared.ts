import type { PipelineStage } from "./types";

/** The six-stage trust pipeline — used on the homepage and /security. */
export const PIPELINE: PipelineStage[] = [
  {
    label: "Publish / proxy",
    caption:
      "A version arrives — published to us, or pulled from npm through the proxy.",
  },
  {
    label: "Owner verify",
    caption:
      "Publisher identity, provenance signatures, repo linkage, ownership changes.",
  },
  {
    label: "Static scan",
    caption:
      "Install scripts, obfuscation, typosquats, suspicious APIs, binary blobs.",
  },
  {
    label: "AI scan",
    caption:
      "An LLM reads the suspicious surface and the diff against the last version.",
  },
  {
    label: "Verdict 0–100",
    caption: "One score, one status: pass, warn, flagged, or malicious.",
    accent: true,
  },
  {
    label: "Your tree",
    caption:
      "Your workspace policy decides — allow, warn, or block — before install.",
  },
];

export const NPMRC_SNIPPET = "registry=https://registry.damatjs.com/api/";
