import { join } from "node:path";

export const backupsPath = (projectDir: string) =>
  join(projectDir, ".damat", "backups");
export const backupPath = (projectDir: string, id: string) =>
  join(backupsPath(projectDir), id);
