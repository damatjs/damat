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
import { loadModuleProfile } from "../profile";

export interface ResolveDependencies {
  resolve: typeof resolveArtifact;
  origin: typeof originFromArgument;
  ports: typeof createInstallerPorts;
  loadProfile: typeof loadModuleProfile;
  exists: typeof existsSync;
  readManifest: typeof readDamatManifest;
  options: typeof installerOptions;
  recipe: typeof createProfileRecipe;
}

const dependencies: ResolveDependencies = {
  resolve: resolveArtifact,
  origin: originFromArgument,
  ports: createInstallerPorts,
  loadProfile: loadModuleProfile,
  exists: existsSync,
  readManifest: readDamatManifest,
  options: installerOptions,
  recipe: createProfileRecipe,
};

export async function resolveModuleInstall(
  ctx: CommandContext,
  source: string | OriginRequest,
  deps: ResolveDependencies = dependencies,
) {
  const artifact = await deps.resolve(
    typeof source === "string" ? deps.origin(source, ctx.cwd) : source,
    deps.ports(ctx),
  );
  try {
    const provider = deps.loadProfile(artifact.rootDir);
    const receiver = deps.exists(join(ctx.cwd, DAMAT_MANIFEST_FILENAME))
      ? deps.readManifest(ctx.cwd)
      : undefined;
    const options = deps.options(ctx);
    const recipe = deps.recipe({
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
