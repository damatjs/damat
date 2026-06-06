import path from "node:path";
// import type { PathOptions } from "./base";

export function resolveModelsPath(
  // options: PathOptions & { cliModelsDir?: string | undefined },
  moduleResolver: string,
  cwd: string = process.cwd()
): string {
  // if (options.cliModelsDir) {
  //   return path.isAbsolute(options.cliModelsDir)
  //     ? options.cliModelsDir
  //     : path.join(cwd, options.cliModelsDir);
  // }
  return path.join(moduleResolver, "models");
}
