import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OriginRequest } from "../../types/origin";
import type { AcquisitionPorts, AcquiredArtifact } from "../types";
import { parseGitRequest } from "./parse";

function assertCommand(
  result: { exitCode: number; stderr: string },
  action: string,
): void {
  if (result.exitCode !== 0)
    throw new Error(
      result.stderr.trim() ||
        `${action} failed with exit code ${result.exitCode}`,
    );
}

export async function acquireGit(
  request: OriginRequest,
  ports: AcquisitionPorts,
): Promise<AcquiredArtifact> {
  const parsed = parseGitRequest(request);
  const parent = ports.tempRoot ?? tmpdir();
  mkdirSync(parent, { recursive: true });
  const checkout = mkdtempSync(join(parent, "damat-installer-git-"));
  try {
    const clone = await ports.run({
      command: "git",
      args: ["clone", "--quiet", "--no-checkout", parsed.url, checkout],
      cwd: parent,
    });
    assertCommand(clone, "Git clone");
    const ref = parsed.ref ?? "HEAD";
    const checkedOut = await ports.run({
      command: "git",
      args: ["-C", checkout, "checkout", "--quiet", "--detach", ref],
      cwd: parent,
    });
    assertCommand(checkedOut, "Git checkout");
    const rootDir = parsed.subdir ? join(checkout, parsed.subdir) : checkout;
    let cleaned = false;
    return {
      request: parsed,
      rootDir,
      metadata: { requestedRef: ref, checkout },
      cleanup() {
        if (!cleaned) rmSync(checkout, { recursive: true, force: true });
        cleaned = true;
      },
    };
  } catch (error) {
    rmSync(checkout, { recursive: true, force: true });
    throw error;
  }
}
