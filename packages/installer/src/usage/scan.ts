import { matchGlob } from "../recipe";
import type { UsageHint } from "../types/recipe";
import { usageFiles } from "./files";
import type { UsageMatch, UsageReport } from "./types";

export function scanUsage(
  projectDir: string,
  hints: UsageHint[],
  ownedFiles: string[],
): UsageReport {
  const owned = new Set(ownedFiles);
  const matches: UsageMatch[] = [];
  for (const hint of hints) {
    if (!hint.token.trim()) throw new Error("usage token must be non-empty");
    for (const file of usageFiles(projectDir)) {
      if (
        owned.has(file.path) ||
        (hint.targets &&
          !hint.targets.some((pattern) => matchGlob(file.path, pattern)))
      )
        continue;
      file.content.split("\n").forEach((line, index) => {
        let column = line.indexOf(hint.token);
        while (column >= 0) {
          matches.push({
            token: hint.token,
            path: file.path,
            line: index + 1,
            column: column + 1,
          });
          column = line.indexOf(hint.token, column + hint.token.length);
        }
      });
    }
  }
  matches.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.line - right.line ||
      left.column - right.column,
  );
  return {
    matches,
    warning: "Usage scanning is advisory and may not find dynamic references.",
  };
}
