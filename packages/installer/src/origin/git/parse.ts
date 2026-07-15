import type { OriginRequest } from "../../types/origin";
import { parseOriginRequest } from "../../schema";

export function parseGitRequest(
  input: OriginRequest,
): Extract<OriginRequest, { type: "git" }> {
  const parsed = parseOriginRequest(input);
  if (parsed.type !== "git") throw new TypeError("expected a Git origin");
  return parsed;
}
