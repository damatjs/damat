import type { CliLogger } from "@damatjs/cli";
import { cloneSubdir } from "./cloneSubdir";
import { gitOrThrow } from "./gitOrThrow";
import type { ParsedCloneSource } from "./parseCloneSource";

export function cloneTarget(
  parsed: ParsedCloneSource,
  targetDir: string,
  targetName: string,
  ref: string,
  depth: number | undefined,
  fresh: boolean,
  cwd: string,
  logger: CliLogger,
): void {
  if (parsed.subDir) {
    cloneSubdir(parsed.repoUrl, parsed.subDir, targetDir, ref);
    logger.success(
      `Extracted ${parsed.subDir} from ${parsed.repoUrl} into ${targetName}/`,
    );
    if (!fresh) {
      logger.info(
        "Subdirectory extraction carries no git history — pass --fresh to start one",
      );
    }
    return;
  }
  const args = ["clone"];
  if (depth) args.push("--depth", String(depth));
  if (ref) args.push("--branch", ref);
  args.push("--", parsed.repoUrl, targetDir);
  gitOrThrow(args, cwd);
  logger.success(`Cloned ${parsed.repoUrl} into ${targetName}/`);
}
