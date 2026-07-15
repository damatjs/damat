import type { CommandContext } from "@damatjs/cli";
import { evaluateVerification, validateModuleDir } from "@damatjs/module";
import type { ResolvedModuleSource } from "../helpers";
import { unverifiedSourceError } from "../helpers";

export function verifyAddSource(
  ctx: CommandContext,
  resolved: ResolvedModuleSource,
  moduleDir: string,
  moduleId: string,
): boolean {
  if (resolved.registry) {
    const decision = evaluateVerification(resolved.registry.verification);
    ctx.logger.info("Source", {
      from: "registry",
      ref: resolved.origin.ref,
      owner: resolved.registry.owner?.namespace ?? "(unknown)",
      verification: decision.status,
    });
    if (!decision.allowed) {
      ctx.logger.error(
        `Refusing to install "${moduleId}": ${decision.message}`,
      );
      return false;
    }
    if (decision.message) ctx.logger.warn(decision.message);
    return true;
  }
  ctx.logger.info("Source", {
    from: resolved.origin.type,
    ref: resolved.origin.ref,
  });
  const error = unverifiedSourceError(
    resolved.origin.type,
    Boolean(ctx.options["allow-unverified"]),
  );
  if (error) {
    ctx.logger.error(`Refusing to install "${moduleId}": ${error}`);
    return false;
  }
  const report = validateModuleDir(moduleDir);
  if (report.valid) return true;
  for (const issue of report.errors) ctx.logger.error(issue);
  ctx.logger.error(
    `Refusing to install "${moduleId}": module failed validation`,
  );
  return false;
}
