import type { AcquisitionPorts, AcquiredArtifact } from "../types";

export async function finalizeGit(
  artifact: AcquiredArtifact,
  ports: AcquisitionPorts,
): Promise<{
  identity: string;
  packageReference: string;
  metadata: Record<string, string>;
}> {
  if (artifact.request.type !== "git")
    throw new TypeError("expected Git artifact");
  const checkout = artifact.metadata.checkout ?? artifact.rootDir;
  const result = await ports.run({
    command: "git",
    args: ["-C", checkout, "rev-parse", "HEAD"],
    cwd: checkout,
  });
  if (result.exitCode !== 0)
    throw new Error(result.stderr.trim() || "unable to resolve Git commit");
  const commit = result.stdout.trim();
  if (!/^[a-f0-9]{40}$/i.test(commit))
    throw new Error("Git returned an invalid commit identity");
  return {
    identity: `git:${commit}`,
    packageReference: `git+${artifact.request.url}#${commit}`,
    metadata: { ...artifact.metadata, commit },
  };
}
