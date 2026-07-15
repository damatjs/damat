import {
  reportError,
  type CommandContext,
  type CommandResult,
} from "@damatjs/cli";
import { createPublishArchive } from "./archive";
import { gatewayBaseFromRegistryUrl, publishToGateway } from "./gateway";
import { readPackageMetadata, readPublishManifest } from "./metadata";
import { validatePublish } from "./validate";
import { failCommand } from "../fail";

export async function handleModulePublish(
  ctx: CommandContext,
): Promise<CommandResult> {
  const validation = await validatePublish(ctx);
  if (validation) return { exitCode: validation };
  let pkg;
  try {
    pkg = readPackageMetadata(ctx.cwd);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("package.json is missing")
    )
      ctx.logger.error(error.message);
    else
      reportError(ctx.logger, error, { prefix: "Could not read package.json" });
    return { exitCode: 1 };
  }
  let manifest;
  try {
    manifest = readPublishManifest(ctx.cwd);
  } catch (error) {
    reportError(ctx.logger, error, {
      prefix: "Could not read module manifest",
    });
    return { exitCode: 1 };
  }
  const gateway =
    (ctx.options.registry as string | undefined) ??
    process.env.DAMAT_PUBLISH_REGISTRY ??
    gatewayBaseFromRegistryUrl(process.env.DAMAT_MODULE_REGISTRY);
  const token =
    (ctx.options.token as string | undefined) ??
    process.env.DAMAT_PUBLISH_TOKEN;
  if (ctx.options["dry-run"]) {
    ctx.logger.info(
      [
        `Dry run — would publish ${pkg.name}@${pkg.version}`,
        `  gateway: ${gateway ?? "(none — set DAMAT_PUBLISH_REGISTRY or DAMAT_MODULE_REGISTRY)"}`,
        `  token:   ${token ? "(present)" : "(absent — set DAMAT_PUBLISH_TOKEN)"}`,
        `  tar:     pack src/, module.json, package.json → ${pkg.name}-${pkg.version}.tgz`,
        `  PUT ${gateway ?? "<gateway>"}/api/npm/${pkg.name}`,
      ].join("\n"),
    );
    return { exitCode: 0 };
  }
  if (!gateway)
    return failCommand(
      ctx,
      "No registry gateway URL — set DAMAT_PUBLISH_REGISTRY or DAMAT_MODULE_REGISTRY, or pass --registry <url>",
    );
  if (!token)
    return failCommand(
      ctx,
      "No publish token — set DAMAT_PUBLISH_TOKEN or pass --token <token>",
    );
  let archive;
  try {
    archive = createPublishArchive(ctx.cwd, pkg.name, pkg.version);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Failed to create tarball")
    )
      ctx.logger.error(error.message);
    else reportError(ctx.logger, error, { prefix: "Publish failed" });
    return { exitCode: 1 };
  }
  try {
    ctx.logger.info(`Publishing ${pkg.name}@${pkg.version} to ${gateway}...`);
    const result = await publishToGateway({
      gatewayBase: gateway,
      name: pkg.name,
      version: pkg.version,
      tarballBytes: archive.bytes,
      token,
      manifest,
    });
    ctx.logger.success(
      `Published ${result.package?.name ?? pkg.name}@${result.package?.version ?? pkg.version} to the registry`,
    );
    return { exitCode: 0 };
  } catch (error) {
    reportError(ctx.logger, error, { prefix: "Publish failed" });
    return { exitCode: 1 };
  } finally {
    archive.cleanup();
  }
}
