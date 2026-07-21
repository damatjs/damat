import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import {
  createProfileRecipe,
  DAMAT_MANIFEST_FILENAME,
  readDamatManifest,
  resolveArtifact,
  type OriginRequest,
} from "@damatjs/installer";
import {
  createInstallerPorts,
  installerOptions,
  originFromArgument,
} from "@damatjs/cli-support";
import { loadKitProfile } from "../profile";

export async function resolveKitInstall(
  ctx: CommandContext,
  source: string | OriginRequest,
) {
  const artifact = await resolveArtifact(
    typeof source === "string" ? originFromArgument(source, ctx.cwd) : source,
    createInstallerPorts(ctx),
  );
  try {
    const provider = loadKitProfile(artifact.rootDir);
    const receiver = existsSync(join(ctx.cwd, DAMAT_MANIFEST_FILENAME))
      ? readDamatManifest(ctx.cwd)
      : undefined;
    const options = installerOptions(ctx);
    const recipe = createProfileRecipe({
      provider,
      ...(receiver && { receiver }),
      ...(options.targets && { overrides: { targets: options.targets } }),
    });
    return { artifact, provider, recipe, options };
  } catch (error) {
    artifact.cleanup();
    throw error;
  }
}
