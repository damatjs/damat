import { join } from "node:path";

export function installerLockPath(projectDir: string): string {
  return join(projectDir, "damat.lock.json");
}
