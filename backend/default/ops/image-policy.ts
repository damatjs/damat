const digest = /(?:@|^)sha256:[a-f0-9]{64}$/;

export function imagePolicyErrors(env: NodeJS.ProcessEnv): string[] {
  if (env.DAMAT_ALLOW_UNPINNED_IMAGES === "true") return [];
  return ["DAMAT_IMAGE", "POSTGRES_IMAGE", "REDIS_IMAGE"].flatMap((name) => {
    const value = env[name];
    return value && digest.test(value)
      ? []
      : [`${name} must be pinned to a sha256 digest`];
  });
}
