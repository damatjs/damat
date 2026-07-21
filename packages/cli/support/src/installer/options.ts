import type { CommandContext } from "@damatjs/cli";
import type { InstallMode, PackageBackend } from "@damatjs/installer";

function optionalChoice<T extends string>(
  value: unknown,
  name: string,
  choices: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !choices.includes(value as T))
    throw new Error(`${name} must be ${choices.join(" or ")}`);
  return value as T;
}

function targets(value: unknown): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  const entries = (Array.isArray(value) ? value : [value]).map((item) => {
    if (typeof item !== "string" || !item.includes("="))
      throw new Error("target must use capability=path");
    const [capability, ...rest] = item.split("=");
    const path = rest.join("=");
    if (!capability || !path)
      throw new Error("target must use capability=path");
    return [capability, path] as const;
  });
  return Object.fromEntries(entries);
}

export function installerOptions(ctx: CommandContext): {
  mode?: InstallMode;
  packageBackend?: PackageBackend;
  targets?: Record<string, string>;
} {
  const mode = optionalChoice(ctx.options.mode, "mode", ["source", "package"]);
  const packageBackend = optionalChoice(
    ctx.options["package-backend"],
    "package backend",
    ["node", "damat"],
  );
  const parsedTargets = targets(ctx.options.target);
  return {
    ...(mode && { mode }),
    ...(packageBackend && { packageBackend }),
    ...(parsedTargets && { targets: parsedTargets }),
  };
}
