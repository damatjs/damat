import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { type Command, reportError } from "@damatjs/cli";
import {
  locateModuleDir,
  readModuleManifest,
  validateModuleDir,
} from "@damatjs/module";
import { runTypeCheck } from "../shared/typecheck";

// ---------------------------------------------------------------------------
// Gateway URL helper — mirrors the MCP's registry/load.ts logic.
// ---------------------------------------------------------------------------
function gatewayBaseFromRegistryUrl(
  location: string | undefined,
): string | null {
  if (!location || !/^https?:\/\//.test(location)) return null;
  const u = new URL(location);
  let base = location
    .replace(/\/api\/damat\/modules\/?.*$/, "")
    .replace(/\/registry\.json\/?$/, "")
    .replace(/\/api\/registry\/modules\/?.*$/, "");
  if (base === location) base = `${u.protocol}//${u.host}`;
  return base.replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Publish PUT helper — no @damatjs/registry-client dependency.
// ---------------------------------------------------------------------------
async function publishToGateway(opts: {
  gatewayBase: string;
  name: string;
  version: string;
  tarballBytes: Uint8Array;
  token: string;
  manifest: Record<string, unknown>;
}): Promise<{ success: boolean; package?: { name: string; version: string } }> {
  const { gatewayBase, name, version, tarballBytes, token, manifest } = opts;
  const tarballKey = `${name}-${version}.tgz`;
  const body = {
    versions: { [version]: manifest },
    _attachments: {
      [tarballKey]: { data: Buffer.from(tarballBytes).toString("base64") },
    },
  };

  const url = `${gatewayBase}/api/npm/${encodeURIComponent(name)}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const status = response.status;
  if (status === 201) {
    return (await response.json()) as {
      success: boolean;
      package?: { name: string; version: string };
    };
  }

  const bodyText = await response.text().catch(() => "(no body)");
  if (status === 401 || status === 403) {
    throw new Error(
      `Publish rejected (${status}): invalid or expired publish token — check DAMAT_PUBLISH_TOKEN`,
    );
  }
  if (status === 400) {
    throw new Error(
      `Publish rejected (400): ${bodyText} — check the module manifest and package.json`,
    );
  }
  throw new Error(`Publish failed (${status}): ${bodyText}`);
}

// ---------------------------------------------------------------------------
// Command definition.
// ---------------------------------------------------------------------------
export const modulePublishCommand: Command = {
  name: "publish",
  description:
    "Validate, build, pack, and publish this module to the registry gateway",
  aliases: ["pub"],
  usage:
    "damat module publish [--no-typecheck] [--no-validate] [--dry-run] [--registry <url>] [--token <token>]",
  options: [
    {
      name: "typecheck",
      type: "boolean",
      description: "Type-check before building (use --no-typecheck to skip)",
      default: true,
    },
    {
      name: "validate",
      type: "boolean",
      description:
        "Contract-validate before building (use --no-validate to skip)",
      default: true,
    },
    {
      name: "dry-run",
      type: "boolean",
      description:
        "Validate + build + pack but do NOT publish — print what would be sent",
      default: false,
    },
    {
      name: "registry",
      type: "string",
      description:
        "Gateway base URL (overrides DAMAT_PUBLISH_REGISTRY / derived from DAMAT_MODULE_REGISTRY)",
    },
    {
      name: "token",
      type: "string",
      description: "Publish token (overrides DAMAT_PUBLISH_TOKEN)",
    },
  ],
  handler: async (ctx) => {
    // 1. Type-check.
    const typecheckExit = await runTypeCheck({
      cwd: ctx.cwd,
      logger: ctx.logger,
      skip: ctx.options.typecheck === false,
      label: "module",
    });
    if (typecheckExit !== 0) {
      return { exitCode: typecheckExit };
    }

    // 2. Contract validate.
    if (ctx.options.validate !== false) {
      let moduleDir: string;
      try {
        moduleDir = locateModuleDir(ctx.cwd);
      } catch (e) {
        reportError(ctx.logger, e, { prefix: "Could not locate module" });
        return { exitCode: 1 };
      }

      const report = validateModuleDir(moduleDir);
      for (const error of report.errors) {
        ctx.logger.error(error);
      }
      for (const warning of report.warnings) {
        ctx.logger.warn(warning);
      }
      if (!report.valid) {
        return { exitCode: 1 };
      }
    }

    // 3. Read package.json.
    const packageJsonPath = join(ctx.cwd, "package.json");
    let pkgName: string;
    let pkgVersion: string;
    try {
      const raw = readFileSync(packageJsonPath, "utf-8");
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      if (typeof pkg.name !== "string" || !pkg.name) {
        ctx.logger.error("package.json is missing a valid `name` field");
        return { exitCode: 1 };
      }
      if (typeof pkg.version !== "string" || !pkg.version) {
        ctx.logger.error("package.json is missing a valid `version` field");
        return { exitCode: 1 };
      }
      pkgName = pkg.name;
      pkgVersion = pkg.version;
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Could not read package.json" });
      return { exitCode: 1 };
    }

    // 4. Read module.json manifest.
    let manifest: Record<string, unknown>;
    try {
      const moduleDir = locateModuleDir(ctx.cwd);
      manifest = readModuleManifest(moduleDir) as unknown as Record<
        string,
        unknown
      >;
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Could not read module manifest" });
      return { exitCode: 1 };
    }

    // 5. Determine gateway URL and token.
    const gatewayBase =
      (ctx.options.registry as string | undefined) ??
      process.env.DAMAT_PUBLISH_REGISTRY ??
      gatewayBaseFromRegistryUrl(process.env.DAMAT_MODULE_REGISTRY);

    const publishToken =
      (ctx.options.token as string | undefined) ??
      process.env.DAMAT_PUBLISH_TOKEN;

    // 6. --dry-run: print plan and exit.
    if (ctx.options["dry-run"]) {
      ctx.logger.info(
        [
          `Dry run — would publish ${pkgName}@${pkgVersion}`,
          `  gateway: ${gatewayBase ?? "(none — set DAMAT_PUBLISH_REGISTRY or DAMAT_MODULE_REGISTRY)"}`,
          `  token:   ${publishToken ? "(present)" : "(absent — set DAMAT_PUBLISH_TOKEN)"}`,
          `  tar:     pack src/, module.json, package.json → ${pkgName}-${pkgVersion}.tgz`,
          `  PUT ${gatewayBase ?? "<gateway>"}/api/npm/${pkgName}`,
        ].join("\n"),
      );
      return { exitCode: 0 };
    }

    // 7. Guard: require gateway URL and token before touching the filesystem.
    if (!gatewayBase) {
      ctx.logger.error(
        "No registry gateway URL — set DAMAT_PUBLISH_REGISTRY or DAMAT_MODULE_REGISTRY, or pass --registry <url>",
      );
      return { exitCode: 1 };
    }
    if (!publishToken) {
      ctx.logger.error(
        "No publish token — set DAMAT_PUBLISH_TOKEN or pass --token <token>",
      );
      return { exitCode: 1 };
    }

    // 8. Pack into a temp tarball.
    const tempDir = mkdtempSync(join(tmpdir(), "damat-publish-"));
    const tarballPath = join(tempDir, `${pkgName}-${pkgVersion}.tgz`);

    try {
      // Collect paths to include (only those that exist).
      const pathsToInclude: string[] = [];
      for (const p of ["src", "module.json", "package.json"]) {
        if (existsSync(join(ctx.cwd, p))) {
          pathsToInclude.push(p);
        }
      }

      const tarResult = spawnSync(
        "tar",
        ["-czf", tarballPath, "-C", ctx.cwd, ...pathsToInclude],
        { encoding: "buffer" },
      );
      if (tarResult.status !== 0) {
        const stderr = tarResult.stderr?.toString() ?? "";
        ctx.logger.error(`Failed to create tarball: ${stderr}`);
        return { exitCode: 1 };
      }

      const tarballBytes = readFileSync(tarballPath);

      // 9. Publish to gateway.
      ctx.logger.info(
        `Publishing ${pkgName}@${pkgVersion} to ${gatewayBase}...`,
      );
      const result = await publishToGateway({
        gatewayBase,
        name: pkgName,
        version: pkgVersion,
        tarballBytes,
        token: publishToken,
        manifest,
      });

      ctx.logger.success(
        `Published ${result.package?.name ?? pkgName}@${result.package?.version ?? pkgVersion} to the registry`,
      );
      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Publish failed" });
      return { exitCode: 1 };
    } finally {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  },
};
