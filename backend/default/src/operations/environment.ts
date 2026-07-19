const bannedUsers = new Set(["postgres", "root", "admin", "administrator"]);
const placeholder = /(change.?me|replace|example|password|secret|localhost)/i;

function privateHost(host: string): boolean {
  return (
    host === "db" ||
    host === "redis" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

function connectionErrors(
  name: string,
  value: string | undefined,
  env: NodeJS.ProcessEnv,
): string[] {
  if (!value) return [`${name} is required`];
  try {
    const url = new URL(value);
    const errors: string[] = [];
    if (bannedUsers.has(url.username.toLowerCase()))
      errors.push(`${name} must not use an administrative account`);
    if (decodeURIComponent(url.password).length < 24)
      errors.push(`${name} must contain a password of at least 24 characters`);
    const secure =
      url.protocol === "rediss:" ||
      ["require", "verify-ca", "verify-full"].includes(
        url.searchParams.get("sslmode") ?? "",
      );
    const internal =
      env.DAMAT_ALLOW_INSECURE_INTERNAL_NETWORK === "true" &&
      privateHost(url.hostname);
    if (!secure && !internal)
      errors.push(
        `${name} must use TLS or an explicitly allowed private network`,
      );
    return errors;
  } catch {
    return [`${name} must be a valid connection URL`];
  }
}

function secretErrors(name: string, value: string | undefined): string[] {
  if (!value || value.length < 32)
    return [`${name} must be at least 32 characters`];
  return placeholder.test(value)
    ? [`${name} contains a placeholder value`]
    : [];
}

export function productionEnvironmentErrors(
  env: NodeJS.ProcessEnv,
  release = false,
): string[] {
  if (env.NODE_ENV !== "production") return ["NODE_ENV must be production"];
  const errors = connectionErrors("DATABASE_URL", env.DATABASE_URL, env);
  if (env.REDIS_URL)
    errors.push(...connectionErrors("REDIS_URL", env.REDIS_URL, env));
  errors.push(...secretErrors("METRICS_TOKEN", env.METRICS_TOKEN));
  if (!env.PUBLIC_BASE_URL?.startsWith("https://"))
    errors.push("PUBLIC_BASE_URL must use https://");
  if (
    !env.RELEASE_VERSION ||
    /^(local|latest|unknown)$/i.test(env.RELEASE_VERSION)
  )
    errors.push("RELEASE_VERSION must identify an immutable release");
  for (const name of env.REQUIRED_SECRET_NAMES?.split(",").filter(Boolean) ??
    [])
    errors.push(...secretErrors(name.trim(), env[name.trim()]));
  if (release) {
    errors.push(
      ...connectionErrors(
        "MIGRATION_DATABASE_URL",
        env.MIGRATION_DATABASE_URL,
        env,
      ),
    );
    if (env.MIGRATION_DATABASE_URL === env.DATABASE_URL)
      errors.push("migration and runtime database accounts must differ");
  }
  return errors;
}

export function assertProductionEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;
  const errors = productionEnvironmentErrors(process.env);
  if (errors.length)
    throw new Error(`Unsafe production environment:\n- ${errors.join("\n- ")}`);
}
