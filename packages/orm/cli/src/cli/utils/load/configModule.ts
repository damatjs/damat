import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";

let sidecarCounter = 0;

export async function loadConfigModule(filePath: string): Promise<any> {
  const contents = readFileSync(filePath);
  const sidecar = join(
    dirname(filePath),
    `.damat-config-${process.pid}-${sidecarCounter++}${extname(filePath)}`,
  );
  try {
    writeFileSync(sidecar, contents);
    return await import(`file://${sidecar}`);
  } finally {
    try {
      rmSync(sidecar, { force: true });
    } catch {
      // best-effort cleanup
    }
  }
}
