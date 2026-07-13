import { join, basename } from "node:path";
import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { type Command, reportError } from "@damatjs/cli";
import { requireGit } from "../shared/git";
import { parseCloneSource } from './parseCloneSource';
import { repoBasename } from './repoBasename';
import { cloneSubdir } from './cloneSubdir';
import { gitOrThrow } from './gitOrThrow';
import { runGit } from './runGit';
import { renamePackage } from './renamePackage';

/**
 * `damat clone` — git clone with extras:
 * - accepts github shorthand (`user/repo`, `user/repo/sub/dir`) and `#ref`
 *   suffixes, not just full URLs
 * - can extract a SUBDIRECTORY of a repo as the project (git clone can't)
 * - `--fresh` starts a new history: strips `.git`/`.github`, `git init -b main`,
 *   bootstrap commit (what starter templates want)
 * - `--name` rewrites package.json's `name` on the way in
 * - `--install` runs `bun install` afterwards
 * A plain `damat clone <url>` behaves like `git clone` (full history, original
 * `.git` kept).
 */
export const cloneCommand: Command = {
  name: "clone",
  description: "Clone a git repo (URL or github shorthand) with optional fresh history, rename, and install",
  usage: "damat clone <source> [dir] [--branch <ref>] [--depth <n>] [--fresh] [--name <pkg>] [--install]",
  examples: [
    "damat clone https://github.com/acme/service.git",
    "damat clone acme/service my-service --fresh --install",
    "damat clone acme/monorepo/examples/api#v2 my-api --fresh   # subdirectory + ref",
  ],
  options: [
    {
      name: "branch",
      alias: "b",
      type: "string",
      description: "Branch or tag to clone (overrides a #ref suffix on the source)",
    },
    {
      name: "depth",
      type: "number",
      description: "Shallow-clone depth (default: full history, like git clone)",
    },
    {
      name: "fresh",
      alias: "f",
      type: "boolean",
      description: "Start a new git history: strip .git/.github, git init -b main, bootstrap commit",
      default: false,
    },
    {
      name: "name",
      alias: "n",
      type: "string",
      description: "Rewrite package.json's name field after cloning",
    },
    {
      name: "install",
      type: "boolean",
      description: "Run bun install after cloning",
      default: false,
    },
  ],
  handler: async (ctx) => {
    const source = ctx.args[0];
    if (!source) {
      ctx.logger.error("Usage: damat clone <source> [dir]");
      return { exitCode: 1 };
    }

    // Overlay over the system git — no bundled fallback, so fail up front
    // with one clear message instead of a vague spawn error mid-clone.
    const gitError = requireGit("clone repositories");
    if (gitError) {
      ctx.logger.error(gitError);
      return { exitCode: 1 };
    }

    let parsed;
    try {
      parsed = parseCloneSource(source);
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Could not parse clone source" });
      return { exitCode: 1 };
    }
    const ref = (ctx.options.branch as string) || parsed.ref;

    const targetName =
      ctx.args[1] ||
      (parsed.subDir ? basename(parsed.subDir) : repoBasename(parsed.repoUrl));
    const targetDir = join(ctx.cwd, targetName);
    if (existsSync(targetDir)) {
      ctx.logger.error(`${targetDir} already exists`);
      return { exitCode: 1 };
    }

    try {
      if (parsed.subDir) {
        // Extracting a subdirectory can't preserve its git history — the copy
        // arrives without a .git (use --fresh to start one).
        cloneSubdir(parsed.repoUrl, parsed.subDir, targetDir, ref);
        ctx.logger.success(
          `Extracted ${parsed.subDir} from ${parsed.repoUrl} into ${targetName}/`,
        );
        if (!ctx.options.fresh) {
          ctx.logger.info(
            "Subdirectory extraction carries no git history — pass --fresh to start one",
          );
        }
      } else {
        const args = ["clone"];
        const depth = ctx.options.depth as number | undefined;
        if (depth) args.push("--depth", String(depth));
        if (ref) args.push("--branch", ref);
        // `--` stops git option parsing so a hostile URL can never be
        // interpreted as a flag (e.g. --upload-pack).
        args.push("--", parsed.repoUrl, targetDir);
        gitOrThrow(args, ctx.cwd);
        ctx.logger.success(`Cloned ${parsed.repoUrl} into ${targetName}/`);
      }

      if (ctx.options.fresh) {
        rmSync(join(targetDir, ".git"), { recursive: true, force: true });
        rmSync(join(targetDir, ".github"), { recursive: true, force: true });
        const ok =
          runGit(["init", "-b", "main"], targetDir) &&
          runGit(["add", "."], targetDir) &&
          runGit(["commit", "-m", `chore: bootstrap from ${source}`], targetDir);
        if (ok) {
          ctx.logger.success("Started a fresh git history on main");
        } else {
          ctx.logger.warn("Could not initialize the fresh git history — run `git init` yourself");
        }
      }

      if (ctx.options.name) {
        const renamed = renamePackage(targetDir, ctx.options.name as string);
        if (renamed) {
          ctx.logger.success(`Renamed package.json to "${ctx.options.name}"`);
        } else {
          ctx.logger.warn("No readable package.json to rename");
        }
      }

      if (ctx.options.install) {
        ctx.logger.info("Installing dependencies (bun install)...");
        const result = spawnSync("bun", ["install"], {
          cwd: targetDir,
          stdio: "pipe",
          encoding: "utf-8",
        });
        if (result.status === 0) {
          ctx.logger.success("Dependencies installed");
        } else {
          ctx.logger.warn(`bun install failed — run it manually in ${targetName}/`);
        }
      }

      return { exitCode: 0 };
    } catch (e) {
      // A failed clone must not leave a half-written target behind.
      rmSync(targetDir, { recursive: true, force: true });
      reportError(ctx.logger, e, { prefix: "Clone failed" });
      return { exitCode: 1 };
    }
  },
};
