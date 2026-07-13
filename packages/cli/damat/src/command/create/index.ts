import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { Command } from "@damatjs/cli";
import { CLI_VERSION } from "../../version.generated";
import { gitAvailable } from "../shared/git";
import {
  packageJsonTemplate,
  damatConfigTemplate,
  tsconfigTemplate,
  envExampleTemplate,
  envTemplate,
  gitignoreTemplate,
  helloRouteTemplate,
  workflowsBarrelTemplate,
  smokeTestTemplate,
  readmeTemplate,
} from "./scaffold/templates";

// Same rule as module ids: the name becomes a directory, a package name, and
// a database name, so it must be a single safe kebab-case segment.
const APP_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export const createCommand: Command = {
  name: "create",
  description:
    "Scaffold a new Damat backend app (offline, from embedded templates)",
  aliases: ["new"],
  usage:
    "damat create <name> [--dir <path>] [--pin <version>] [--no-git] [--no-install]",
  examples: [
    "damat create my-api",
    "damat create my-api --no-install   # scaffold only, install later",
    "damat create my-api --pin 0.6.0    # pin @damatjs/* to a specific version",
  ],
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Directory to create the app in (default: ./<name>)",
    },
    {
      // NOT named "version": cac's global `-v, --version` (the CLI version
      // printer) owns that flag and would swallow the value.
      name: "pin",
      alias: "p",
      type: "string",
      description: `Pin @damatjs/* dependencies to a version (default: the CLI's own version, ${CLI_VERSION})`,
    },
    {
      name: "git",
      type: "boolean",
      description:
        "Initialize a git repository with an initial commit (use --no-git to skip)",
      default: true,
    },
    {
      name: "install",
      type: "boolean",
      description:
        "Run bun install after scaffolding (use --no-install to skip)",
      default: true,
    },
  ],
  handler: async (ctx) => {
    const name = ctx.args[0];
    if (!name || !APP_NAME_PATTERN.test(name)) {
      ctx.logger.error(
        "Usage: damat create <name>   (kebab-case, e.g. my-api)",
      );
      return { exitCode: 1 };
    }

    const targetDir = join(ctx.cwd, (ctx.options.dir as string) || name);
    if (existsSync(targetDir)) {
      ctx.logger.error(`${targetDir} already exists`);
      return { exitCode: 1 };
    }

    const version = (ctx.options.pin as string) || CLI_VERSION;
    const secrets = {
      jwtSecret: randomBytes(32).toString("hex"),
      cookieSecret: randomBytes(32).toString("hex"),
    };

    const files: Record<string, string> = {
      "package.json": packageJsonTemplate(name, version),
      "damat.config.ts": damatConfigTemplate(name),
      "tsconfig.json": tsconfigTemplate(),
      ".env.example": envExampleTemplate(name),
      ".env": envTemplate(name, secrets),
      ".gitignore": gitignoreTemplate(),
      "README.md": readmeTemplate(name),
      "src/api/routes/hello/route.ts": helloRouteTemplate(name),
      "src/workflows/index.ts": workflowsBarrelTemplate(),
      "tests/smoke.test.ts": smokeTestTemplate(),
    };

    // Layers `damat module add` installs into — present from day one.
    for (const dir of [
      "src/modules",
      "src/api/routes",
      "src/workflows",
      "tests",
    ]) {
      mkdirSync(join(targetDir, dir), { recursive: true });
    }
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = join(targetDir, relPath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, content);
    }
    ctx.logger.success(`App created at ${targetDir}`);

    if (ctx.options.git) {
      // git init is a nicety here — the scaffold must succeed without it —
      // but the warning should say exactly which case the user is in.
      if (!gitAvailable()) {
        ctx.logger.warn(
          "git is not installed — skipped repository init (run `git init` after installing git)",
        );
      } else {
        const ok =
          run("git", ["init", "-b", "main"], targetDir) &&
          run("git", ["add", "."], targetDir) &&
          run("git", ["commit", "-m", "chore: scaffold damat app"], targetDir);
        if (ok) {
          ctx.logger.success("Initialized git repository");
        } else {
          // git exists but init/commit failed (e.g. unconfigured identity).
          ctx.logger.warn(
            "Could not initialize git — run `git init` yourself when ready",
          );
        }
      }
    }

    if (ctx.options.install) {
      ctx.logger.info("Installing dependencies (bun install)...");
      if (run("bun", ["install"], targetDir)) {
        ctx.logger.success("Dependencies installed");
      } else {
        ctx.logger.warn(
          `bun install failed — run it manually in ${name}/ (the scaffold itself is complete)`,
        );
      }
    }

    ctx.logger.info(
      [
        "Next steps:",
        `  cd ${name}`,
        ...(ctx.options.install ? [] : ["  bun install"]),
        "  # .env was written with generated secrets — point DATABASE_URL at your postgres",
        "  bun run dev                      # http://localhost:6543/api/hello",
        "  bunx damat module add <source>   # install modules (registry, path, or git)",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};

/** Run a command in the target dir; true on exit 0, false on any failure. */
function run(cmd: string, args: string[], cwd: string): boolean {
  try {
    const result = spawnSync(cmd, args, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
